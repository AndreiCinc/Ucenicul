"""PL-01 Plan Builder — pure-logic port.

Mirror of the JS logic inside workflows/WF-PL-01_Plan_Builder.json:
  - PL_Validate_Input.jsCode       -> validate_input(envelope)
  - PL_Build_Plan_Envelope.jsCode  -> build_plan_envelope(envelope)
  - PL_Validate_Plan_Envelope.jsCode -> validate_plan_envelope(plan_envelope)
  - PL_Return_Result.jsCode        -> shape_return_result(...)
  - PL_Return_Error.jsCode         -> shape_return_error(...)

Design rules:
  - stdlib only (hashlib, json, datetime, typing, dataclasses, uuid). No n8n/Postgres deps.
  - Deterministic: the same input yields byte-identical output (modulo created_at).
  - Safe under replay: given the same (execution_id, idempotency_key), plan_id is stable.
  - No DB side effects, no network calls, no LLM calls (per stage HDR-1 default).

References:
  - 06_STAGE_WF-PL-01.md §"Contract to implement" and §"Recommended node layout"
  - 18_RUNTIME_CANONICAL_TARGET.md §3.5
  - 19_MODULE_CONTRACTS.md §3–§7 (module canonical set)
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

# --------------------------------------------------------------------------
# Canonical module set — MUST match 19_MODULE_CONTRACTS.md §3–§7
# --------------------------------------------------------------------------
CANONICAL_MODULES: Set[str] = {
    "task_module",
    "reminder_module",
    "memory_module",
    "improvement_module",
    "response_support_module",
}

# "Producing" modules — those that emit business state. Used for the privacy-preflight
# check: response_support_module needs at least one upstream producer to summarize.
PRODUCING_MODULES: Set[str] = {
    "task_module",
    "reminder_module",
    "memory_module",
    "improvement_module",
}

# Module -> default side-effect surface. Used when the orchestrator hasn't already
# pinned a surface. Referenced from JS as MODULE_SURFACE_MAP.
MODULE_SURFACE_MAP: Dict[str, Dict[str, str]] = {
    "task_module": {"surface": "tasks", "write_class": "create"},
    "reminder_module": {"surface": "reminders", "write_class": "create"},
    "memory_module": {"surface": "rag_memories", "write_class": "create"},
    "improvement_module": {"surface": "execution_contexts", "write_class": "update"},
    "response_support_module": {"surface": "none", "write_class": "none"},
}

PLAN_ENVELOPE_VERSION = "pl-01.v1"


# --------------------------------------------------------------------------
# Data classes
# --------------------------------------------------------------------------
@dataclass
class PlanStep:
    step_id: str
    target_module: str
    action_type: str
    depends_on: List[str] = field(default_factory=list)
    expected_side_effect: Dict[str, Any] = field(default_factory=dict)
    status: str = "planned"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PlanEnvelope:
    plan_id: str
    execution_id: Optional[str]
    tenant_id: Optional[str]
    thread_id: Optional[str]
    status: str
    steps: List[PlanStep]
    plan_envelope_version: str
    created_at: str
    validation: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["steps"] = [s.to_dict() if isinstance(s, PlanStep) else s for s in self.steps]
        return d


@dataclass
class ValidationResult:
    valid: bool
    errors: List[str] = field(default_factory=list)


# --------------------------------------------------------------------------
# 1. Input validation (port of PL_Validate_Input)
# --------------------------------------------------------------------------
def validate_input(envelope: Dict[str, Any]) -> ValidationResult:
    """Check that the OR-01 handoff envelope has all required top-level fields
    and that the declared modules are in the canonical set.
    Matches PL_Validate_Input.jsCode byte-for-byte in error shape.
    """
    errors: List[str] = []

    if not envelope.get("execution_id"):
        errors.append("missing execution_id")
    if not envelope.get("tenant_id"):
        errors.append("missing tenant_id")
    if not envelope.get("thread_id"):
        errors.append("missing thread_id")
    if not envelope.get("idempotency_key"):
        errors.append("missing idempotency_key")

    intent = envelope.get("intent") or {}
    req = intent.get("required_modules")
    if not isinstance(req, list) or len(req) == 0:
        errors.append("intent.required_modules must be non-empty array")
    else:
        for m in req:
            if m not in CANONICAL_MODULES:
                errors.append(f"intent.required_modules contains non-canonical module: {m}")

    od = envelope.get("orchestrator_decision") or {}
    order = od.get("module_order")
    if not isinstance(order, list) or len(order) == 0:
        errors.append("orchestrator_decision.module_order must be non-empty array")
    else:
        for m in order:
            if m not in CANONICAL_MODULES:
                errors.append(f"orchestrator_decision.module_order contains non-canonical module: {m}")

    return ValidationResult(valid=(len(errors) == 0), errors=errors)


# --------------------------------------------------------------------------
# 2. Envelope construction (port of PL_Build_Plan_Envelope)
# --------------------------------------------------------------------------
def derive_plan_id(execution_id: str, idempotency_key: str) -> str:
    """Deterministic plan_id derivation.
    Matches the JS:
        crypto.createHash('sha256').update(execution_id + ':' + idempotency_key).digest('hex')
        formatted as xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx
    This is UUID-shaped (not RFC 4122 strict — the '4' and '8' prefixes are
    embedded into otherwise-hash-derived hex).
    """
    src = f"{execution_id or ''}:{idempotency_key or ''}"
    h = hashlib.sha256(src.encode("utf-8")).hexdigest()
    return f"{h[0:8]}-{h[8:12]}-4{h[13:16]}-8{h[17:20]}-{h[20:32]}"


def build_plan_envelope(envelope: Dict[str, Any],
                        now: Optional[datetime] = None) -> PlanEnvelope:
    """Construct the plan envelope from a validated OR-01 input.

    Assumes validate_input(envelope).valid == True. Caller is responsible
    for routing invalid envelopes to shape_return_error.
    """
    if now is None:
        now = datetime.now(tz=timezone.utc)

    od = envelope.get("orchestrator_decision") or {}
    module_order: List[str] = list(od.get("module_order") or [])
    dep_graph: Dict[str, List[str]] = dict(od.get("dependency_graph") or {})
    intent = envelope.get("intent") or {}
    action_hints: Dict[str, str] = dict(intent.get("action_type_hints") or {})

    # step_id derivation: stable within a plan — `step_<module>_<ordinal>`.
    # Same module appearing multiple times gets ordinals 1, 2, 3, ...
    ord_counter: Dict[str, int] = {}
    module_to_stepid: Dict[str, str] = {}
    steps: List[PlanStep] = []

    idempotency_key = envelope.get("idempotency_key", "")

    for mod in module_order:
        ord_counter[mod] = ord_counter.get(mod, 0) + 1
        step_id = f"step_{mod}_{ord_counter[mod]}"
        # If a module appears multiple times, the dep graph resolution below
        # collapses dependencies to the FIRST occurrence — this matches the
        # JS implementation. If the user needs multi-instance dispatch, the
        # dep graph must be reshaped upstream.
        module_to_stepid.setdefault(mod, step_id)

        surface_info = MODULE_SURFACE_MAP.get(mod, {"surface": "none", "write_class": "none"})

        steps.append(PlanStep(
            step_id=step_id,
            target_module=mod,
            action_type=action_hints.get(mod, "execute"),
            depends_on=[],  # filled in below
            expected_side_effect={
                "surface": surface_info["surface"],
                "write_class": surface_info["write_class"],
                "idempotency_key_hint": f"{idempotency_key}:{step_id}",
            },
            status="planned",
        ))

    # Resolve depends_on: map module -> step_id
    for step in steps:
        dep_modules = dep_graph.get(step.target_module, [])
        step.depends_on = [module_to_stepid[d] for d in dep_modules if d in module_to_stepid]

    return PlanEnvelope(
        plan_id=derive_plan_id(envelope.get("execution_id", ""), idempotency_key),
        execution_id=envelope.get("execution_id"),
        tenant_id=envelope.get("tenant_id"),
        thread_id=envelope.get("thread_id"),
        status="planned",
        steps=steps,
        plan_envelope_version=PLAN_ENVELOPE_VERSION,
        created_at=now.isoformat().replace("+00:00", "Z"),
        validation=None,
    )


# --------------------------------------------------------------------------
# 3. Envelope validation (port of PL_Validate_Plan_Envelope)
# --------------------------------------------------------------------------
def _detect_cycle(steps: List[PlanStep]) -> bool:
    """DFS with tri-coloring (white=0, gray=1, black=2). Returns True on cycle."""
    color: Dict[str, int] = {s.step_id: 0 for s in steps}
    by_id: Dict[str, PlanStep] = {s.step_id: s for s in steps}

    def dfs(node_id: str) -> bool:
        if color.get(node_id) == 1:
            return True
        if color.get(node_id) == 2:
            return False
        # If the node_id isn't in the plan at all, it's dangling — handled elsewhere.
        if node_id not in by_id:
            return False
        color[node_id] = 1
        for dep in by_id[node_id].depends_on:
            if dfs(dep):
                return True
        color[node_id] = 2
        return False

    for s in steps:
        if color[s.step_id] == 0:
            if dfs(s.step_id):
                return True
    return False


def validate_plan_envelope(envelope: PlanEnvelope) -> Tuple[PlanEnvelope, ValidationResult]:
    """Run the 4 structural checks: cycles, dangling deps, permitted modules, privacy gate.
    Populates envelope.validation and returns (envelope, overall_result).
    """
    steps = envelope.steps
    step_ids: Set[str] = {s.step_id for s in steps}

    all_refs_exist = True
    for s in steps:
        for d in s.depends_on:
            if d not in step_ids:
                all_refs_exist = False
                break
        if not all_refs_exist:
            break

    module_set_permitted = all(s.target_module in CANONICAL_MODULES for s in steps)
    no_cycles = not _detect_cycle(steps)

    has_response_support = any(s.target_module == "response_support_module" for s in steps)
    has_producer = any(s.target_module in PRODUCING_MODULES for s in steps)
    privacy_preflight_ok = (not has_response_support) or has_producer

    graph_valid = all_refs_exist and no_cycles and module_set_permitted

    validation = {
        "graph_valid": graph_valid,
        "no_cycles": no_cycles,
        "module_set_permitted": module_set_permitted,
        "privacy_preflight_ok": privacy_preflight_ok,
        "all_refs_exist": all_refs_exist,
    }
    envelope.validation = validation

    errors: List[str] = []
    if not no_cycles:
        errors.append("graph_cycle")
    if not module_set_permitted:
        errors.append("module_not_permitted")
    if not all_refs_exist:
        errors.append("dangling_dependency")
    if not privacy_preflight_ok:
        errors.append("privacy_gate_failed")

    return envelope, ValidationResult(valid=(graph_valid and privacy_preflight_ok), errors=errors)


# --------------------------------------------------------------------------
# 4. Return shaping (ports of PL_Return_Result and PL_Return_Error)
# --------------------------------------------------------------------------
def shape_return_result(envelope: PlanEnvelope,
                        db_row: Optional[Dict[str, Any]] = None,
                        replayed: bool = False) -> Dict[str, Any]:
    """Shape the final output contract per 06_STAGE_WF-PL-01.md §Output contract.

    db_row is the row returned by PL_Upsert_Plan. When db_row is None (pure-logic
    test mode), we emit the in-memory envelope directly.
    """
    if db_row is None:
        base = envelope.to_dict()
        base.pop("validation", None)
        return {
            "plan_id": envelope.plan_id,
            "execution_id": envelope.execution_id,
            "tenant_id": envelope.tenant_id,
            "thread_id": envelope.thread_id,
            "status": envelope.status,
            "steps": [s.to_dict() for s in envelope.steps],
            "validation": envelope.validation or {},
            "plan_envelope_version": envelope.plan_envelope_version,
            "created_at": envelope.created_at,
            "replayed": replayed,
        }

    # db_row path: prefer DB values where available
    return {
        "plan_id": db_row.get("id") or envelope.plan_id,
        "execution_id": db_row.get("execution_id") or envelope.execution_id,
        "tenant_id": db_row.get("tenant_id") or envelope.tenant_id,
        "thread_id": db_row.get("thread_id") or envelope.thread_id,
        "status": db_row.get("status") or envelope.status,
        "steps": db_row.get("steps") or [s.to_dict() for s in envelope.steps],
        "validation": db_row.get("validation") or envelope.validation or {},
        "plan_envelope_version": (
            db_row.get("plan_envelope_version") or envelope.plan_envelope_version
        ),
        "created_at": db_row.get("created_at") or envelope.created_at,
        "replayed": bool(db_row.get("replayed", replayed)),
    }


def classify_failure(input_errors: List[str], envelope_errors: List[str]) -> str:
    """Map error lists to a single failure_class value — matches PL_Return_Error JS."""
    if "graph_cycle" in envelope_errors:
        return "graph_cycle"
    if "module_not_permitted" in envelope_errors:
        return "module_not_permitted"
    if "privacy_gate_failed" in envelope_errors:
        return "privacy_gate_failed"
    if "dangling_dependency" in envelope_errors:
        return "dangling_dependency"
    return "invalid_input"


def shape_return_error(envelope: Dict[str, Any],
                       input_errors: List[str],
                       envelope_errors: List[str],
                       now: Optional[datetime] = None) -> Dict[str, Any]:
    if now is None:
        now = datetime.now(tz=timezone.utc)
    all_errors = list(input_errors) + list(envelope_errors)
    return {
        "success": False,
        "failure_class": classify_failure(input_errors, envelope_errors),
        "errors": all_errors,
        "execution_id": envelope.get("execution_id"),
        "tenant_id": envelope.get("tenant_id"),
        "thread_id": envelope.get("thread_id"),
        "idempotency_key": envelope.get("idempotency_key"),
        "emitted_at": now.isoformat().replace("+00:00", "Z"),
    }


# --------------------------------------------------------------------------
# 5. High-level orchestration helper (for tests)
# --------------------------------------------------------------------------
def run_pl01(envelope: Dict[str, Any],
             now: Optional[datetime] = None) -> Dict[str, Any]:
    """End-to-end pure-logic PL-01. Runs validate_input → build → validate_envelope
    → shape_return_result / shape_return_error. DOES NOT perform any DB write —
    `replayed` is always False in this path.
    """
    iv = validate_input(envelope)
    if not iv.valid:
        return shape_return_error(envelope, iv.errors, [], now=now)

    plan_env = build_plan_envelope(envelope, now=now)
    plan_env, ev = validate_plan_envelope(plan_env)

    if not ev.valid:
        return shape_return_error(envelope, [], ev.errors, now=now)

    return shape_return_result(plan_env, db_row=None, replayed=False)


# --------------------------------------------------------------------------
# 6. Split-compound helper (HDR-4 default scope)
# --------------------------------------------------------------------------
def split_compound_intent(intent: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Default scope per HDR-4: split a compound intent into one sub-intent per
    sub_goal, preserving privacy_class and required_modules. If HDR-4 resolves
    to 'upstream in orchestrator', this helper becomes dead code and can be
    removed with no test loss (tests check the default behavior only).
    """
    sub_goals = intent.get("sub_goals") or []
    if not sub_goals:
        return [intent]

    out: List[Dict[str, Any]] = []
    for sg in sub_goals:
        sub = dict(intent)
        sub["primary_goal"] = sg
        sub.pop("sub_goals", None)
        out.append(sub)
    return out
