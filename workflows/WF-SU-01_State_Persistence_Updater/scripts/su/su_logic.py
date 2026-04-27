"""
su_logic.py — Python mirror of the WF-SU-01 State Persistence Updater node logic.

Authored 2026-04-19 as part of Phase 3 repair (R8 in PHASE_3_REPAIR_BACKLOG.md).
The live runtime is expressed as n8n jsCode nodes inside
workflows/WF-SU-01_State_Persistence_Updater/workflow/WF-SU-01_State_Persistence_Updater.json.
This module mirrors the contract expressed by those nodes so the script-level
harness (tests/su/test_families.py) can exercise deterministic behaviour.

The module is intentionally conservative:
  * It does NOT mutate any argument in place.
  * It never touches the database.
  * It follows the canonical envelope contract documented in
    docs/architecture/Architecture_Spec_v3_Ucenicul.md.
"""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Contract constants
# ---------------------------------------------------------------------------

CANONICAL_NEXT_STAGE = "WF-RC-01"
UPSTREAM_STAGE = "WF-RA-01"
MY_STAGE = "WF-SU-01"

VALID_ENVELOPE_STATUS_KINDS = {"success"}
VALID_ENVELOPE_RESULT_TYPES = {"aggregated_result"}
VALID_AGG_STATUSES = {"success", "partial", "failed", "no_action"}

# Classes the test harness considers "forbidden" — they must never appear on a
# write_permissions.allowed_write_classes list when SU executes.
FORBIDDEN_WRITE_CLASSES: frozenset = frozenset({
    "tasks_write",
    "reminders_write",
    "messages_write",
    "rag_memories_write",
    "execution_context_write",
})

REQUIRED_ENVELOPE_FIELDS: Tuple[str, ...] = (
    "status_kind",
    "result_type",
    "execution_context_id",
    "thread_id",
    "tenant_id",
    "aggregated_result",
    "allowed_next_stage",
    "state_update_allowed",
    "response_generation_allowed",
    "domain_writes_performed",
    "idempotency_key",
)

REQUIRED_AGG_FIELDS: Tuple[str, ...] = (
    "status",
    "summary",
    "module_results_count",
    "module_names",
    "per_status_counts",
    "actions_executed",
    "artifacts",
    "observations",
    "proposals",
    "confidence",
    "needs_followup",
    "followup_requests",
    "expected_step_ids",
    "returned_step_ids",
)

STATUS_MAPPING: Dict[str, str] = {
    "success": "completed",
    "partial": "completed",
    "no_action": "completed",
    "failed": "failed",
}


# ---------------------------------------------------------------------------
# Helper: Result wrapper
# ---------------------------------------------------------------------------

@dataclass
class Result:
    ok: bool
    payload: Dict[str, Any] = field(default_factory=dict)


def _err(code: str, message: str, **extra: Any) -> Result:
    payload = {
        "error": {"code": code, "message": message, **extra},
        "status_kind": "error",
        "result_type": "error",
    }
    return Result(ok=False, payload=payload)


def _ok(**payload: Any) -> Result:
    return Result(ok=True, payload=dict(payload))


# ---------------------------------------------------------------------------
# Fixture builders (used by the harness)
# ---------------------------------------------------------------------------

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
_DEFAULT_THREAD = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"
_DEFAULT_EC = "cccccccc-cccc-cccc-cccc-ccccccccccc1"
_DEFAULT_TRIGGER_MSG = "dddddddd-dddd-dddd-dddd-dddddddddd1"


def _idempotency_key(execution_context_id: str) -> str:
    return f"su:state_update:{execution_context_id}:v1"


def sample_execution_context(
    status: str = "aggregating",
    tenant_id: str = _DEFAULT_TENANT,
    thread_id: str = _DEFAULT_THREAD,
    execution_context_id: str = _DEFAULT_EC,
    **overrides: Any,
) -> Dict[str, Any]:
    row = {
        "execution_context_id": execution_context_id,
        "tenant_id": tenant_id,
        "thread_id": thread_id,
        "status": status,
        "pending_steps": ["step_1", "step_2"],
        "trigger_message_id": _DEFAULT_TRIGGER_MSG,
    }
    row.update(overrides)
    return row


def sample_thread(
    tenant_id: str = _DEFAULT_TENANT,
    thread_id: str = _DEFAULT_THREAD,
    **overrides: Any,
) -> Dict[str, Any]:
    row = {
        "thread_id": thread_id,
        "tenant_id": tenant_id,
        "state": "active",
        "last_stage": UPSTREAM_STAGE,
    }
    row.update(overrides)
    return row


def sample_write_permissions(**overrides: Any) -> Dict[str, Any]:
    perms = {
        "allowed_write_classes": [
            "thread_state_update",
            "memory_candidate_persist",
            "execution_state_mutation",
        ],
        "issued_by": "WF-OR-01",
        "issued_at": "2026-04-19T00:00:00Z",
    }
    perms.update(overrides)
    return perms


def sample_valid_envelope(
    rollup_status: str = "success",
    with_memory_candidate: bool = True,
    tenant_id: str = _DEFAULT_TENANT,
    thread_id: str = _DEFAULT_THREAD,
    execution_context_id: str = _DEFAULT_EC,
    **overrides: Any,
) -> Dict[str, Any]:
    steps = ["step_1", "step_2"]
    agg = {
        "status": rollup_status,
        "summary": f"Aggregate completed with rollup={rollup_status}",
        "module_results_count": 2,
        "module_names": ["task_module", "reminder_module"],
        "per_status_counts": {"success": 2 if rollup_status == "success" else 1},
        "actions_executed": [
            {"action": "create_task", "step_id": "step_1"},
            {"action": "create_reminder", "step_id": "step_2"},
        ],
        "artifacts": [{"type": "task_id", "value": "task-uuid"}],
        "observations": [],
        "proposals": [],
        "confidence": 0.9,
        "needs_followup": False,
        "followup_requests": [],
        "expected_step_ids": list(steps),
        "returned_step_ids": list(steps),
        "memory_candidates": [
            {"type": "fact", "content": "User prefers morning reminders."}
        ] if with_memory_candidate else [],
    }
    envelope = {
        "status_kind": "success",
        "result_type": "aggregated_result",
        "execution_context_id": execution_context_id,
        "thread_id": thread_id,
        "tenant_id": tenant_id,
        "aggregated_result": agg,
        "allowed_next_stage": MY_STAGE,
        "state_update_allowed": True,
        "response_generation_allowed": False,
        "domain_writes_performed": True,
        "idempotency_key": _idempotency_key(execution_context_id),
    }
    envelope.update(overrides)
    return envelope


# ---------------------------------------------------------------------------
# validate_input
# ---------------------------------------------------------------------------

def validate_input(envelope: Any) -> Result:
    if not isinstance(envelope, dict):
        return _err("INVALID_HANDOFF_INPUT", "envelope must be a dict")

    for field_name in REQUIRED_ENVELOPE_FIELDS:
        if field_name not in envelope:
            return _err(
                "INVALID_HANDOFF_INPUT",
                f"missing required field: {field_name}",
                missing_fields=[field_name],
            )

    if envelope["status_kind"] not in VALID_ENVELOPE_STATUS_KINDS:
        return _err(
            "INVALID_HANDOFF_INPUT",
            f"invalid status_kind: {envelope['status_kind']!r}",
        )
    if envelope["result_type"] not in VALID_ENVELOPE_RESULT_TYPES:
        return _err(
            "INVALID_HANDOFF_INPUT",
            f"invalid result_type: {envelope['result_type']!r}",
        )
    if envelope["state_update_allowed"] is not True:
        return _err("INVALID_PLAN", "state_update_allowed must be True")
    if envelope["response_generation_allowed"] is not False:
        return _err("INVALID_PLAN", "response_generation_allowed must be False at SU entry")
    if envelope["allowed_next_stage"] != MY_STAGE:
        return _err(
            "INVALID_HANDOFF_INPUT",
            f"allowed_next_stage must be {MY_STAGE}",
        )

    agg = envelope["aggregated_result"]
    if not isinstance(agg, dict):
        return _err("INVALID_AGGREGATE", "aggregated_result must be a dict")
    for fld in REQUIRED_AGG_FIELDS:
        if fld not in agg:
            return _err(
                "INVALID_AGGREGATE",
                f"missing aggregate field: {fld}",
                missing_fields=[fld],
            )
    if agg["status"] not in VALID_AGG_STATUSES:
        return _err(
            "INVALID_AGGREGATE",
            f"invalid aggregate status: {agg['status']!r}",
        )
    returned = agg.get("returned_step_ids")
    if not isinstance(returned, list) or len(returned) == 0:
        return _err(
            "INVALID_AGGREGATE",
            "returned_step_ids must be a non-empty list",
        )
    if len(set(returned)) != len(returned):
        return _err(
            "INVALID_AGGREGATE",
            "returned_step_ids must be unique",
        )
    expected = agg.get("expected_step_ids")
    if not isinstance(expected, list) or len(expected) == 0:
        return _err(
            "INVALID_AGGREGATE",
            "expected_step_ids must be a non-empty list",
        )

    if envelope["execution_context_id"] not in envelope["idempotency_key"]:
        return _err(
            "INVALID_HANDOFF_INPUT",
            "idempotency_key must contain execution_context_id",
        )

    return _ok(envelope=envelope)


# ---------------------------------------------------------------------------
# verify_lineage_and_replay
# ---------------------------------------------------------------------------

def _hash_envelope(envelope: Dict[str, Any]) -> str:
    s = json.dumps(envelope, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(s.encode()).hexdigest()


def verify_lineage_and_replay(
    envelope: Dict[str, Any],
    execution_context_row: Optional[Dict[str, Any]],
    write_permissions: Dict[str, Any],
    replay_registry: Dict[str, Any],
) -> Result:
    if execution_context_row is None:
        return _err("LINEAGE_MISSING", "execution_context_row is required")

    if execution_context_row.get("tenant_id") != envelope.get("tenant_id"):
        return _err(
            "CONTEXT_MISMATCH",
            "tenant_id mismatch between envelope and execution_context_row",
        )
    if execution_context_row.get("thread_id") != envelope.get("thread_id"):
        return _err(
            "CONTEXT_MISMATCH",
            "thread_id mismatch between envelope and execution_context_row",
        )

    upstream_status = execution_context_row.get("status")
    if upstream_status != "aggregating":
        return _err(
            "ILLEGAL_UPSTREAM_STATUS",
            f"upstream execution_context status must be 'aggregating', got {upstream_status!r}",
        )

    allowed_classes = set(write_permissions.get("allowed_write_classes", []))
    forbidden_hits = allowed_classes & FORBIDDEN_WRITE_CLASSES
    if forbidden_hits:
        return _err(
            "FORBIDDEN_WRITE_CLASS",
            f"forbidden write classes present: {sorted(forbidden_hits)}",
            forbidden=sorted(forbidden_hits),
        )

    idem = envelope.get("idempotency_key")
    if idem in replay_registry:
        return _err(
            "REPLAY_BLOCKED",
            f"idempotency_key already seen: {idem}",
            idempotency_key=idem,
        )

    return _ok(_execution_context_row=execution_context_row, _input_hash=_hash_envelope(envelope))


# ---------------------------------------------------------------------------
# build_state_update_plan
# ---------------------------------------------------------------------------

def build_state_update_plan(
    envelope: Dict[str, Any],
    execution_context_row: Dict[str, Any],
    write_permissions: Dict[str, Any],
) -> Dict[str, Any]:
    agg = envelope["aggregated_result"]
    rollup = agg["status"]
    allowed_classes = set(write_permissions.get("allowed_write_classes", []))
    plan = {
        "execution_context_id": envelope["execution_context_id"],
        "thread_id": envelope["thread_id"],
        "tenant_id": envelope["tenant_id"],
        "rollup_status": rollup,
        "mapped_status": STATUS_MAPPING.get(rollup, "failed"),
        "returned_step_ids": list(agg.get("returned_step_ids", [])),
        "memory_candidates": list(agg.get("memory_candidates", [])),
        "allowed_write_classes": sorted(allowed_classes),
        "thread_write_allowed": "thread_state_update" in allowed_classes,
        "memory_persist_allowed": "memory_candidate_persist" in allowed_classes,
        "idempotency_key": envelope["idempotency_key"],
    }
    return plan


# ---------------------------------------------------------------------------
# apply_execution_state_update
# ---------------------------------------------------------------------------

def apply_execution_state_update(
    plan: Dict[str, Any],
    execution_context_row: Dict[str, Any],
) -> Dict[str, Any]:
    row_after = deepcopy(execution_context_row)
    row_after["status"] = plan["mapped_status"]
    row_after["pending_steps"] = []
    return {
        "applied": True,
        "row_after": row_after,
        "row_before": deepcopy(execution_context_row),
    }


# ---------------------------------------------------------------------------
# apply_operational_writes
# ---------------------------------------------------------------------------

def apply_operational_writes(
    plan: Dict[str, Any],
    thread_row: Dict[str, Any],
) -> Dict[str, Any]:
    if not plan.get("thread_write_allowed"):
        return {"applied": False, "reason": "thread_state_update not permitted"}
    row_after = deepcopy(thread_row)
    row_after["last_stage"] = MY_STAGE
    row_after["state"] = "awaiting_response_composition"
    return {"applied": True, "row_after": row_after}


# ---------------------------------------------------------------------------
# persist_memory_candidates
# ---------------------------------------------------------------------------

def persist_memory_candidates(
    plan: Dict[str, Any],
    execution_context_row: Dict[str, Any],
) -> Dict[str, Any]:
    candidates = plan.get("memory_candidates") or []
    if not plan.get("memory_persist_allowed"):
        return {"applied": True, "persisted_count": 0, "reason": "memory_candidate_persist not permitted"}
    return {"applied": True, "persisted_count": len(candidates)}


# ---------------------------------------------------------------------------
# process — end-to-end entrypoint (mirrors the n8n node chain)
# ---------------------------------------------------------------------------

def _build_error_envelope(error_payload: Dict[str, Any], envelope: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "status_kind": "error",
        "result_type": "error",
        "allowed_next_stage": None,
        "response_generation_allowed": False,
        "execution_context_id": envelope.get("execution_context_id"),
        "thread_id": envelope.get("thread_id"),
        "tenant_id": envelope.get("tenant_id"),
        "idempotency_key": envelope.get("idempotency_key"),
        "error": error_payload.get("error", {}),
    }


def process(
    envelope: Dict[str, Any],
    execution_context_row: Optional[Dict[str, Any]],
    thread_row: Optional[Dict[str, Any]],
    write_permissions: Dict[str, Any],
    replay_registry: Dict[str, Any],
) -> Dict[str, Any]:
    env = envelope if isinstance(envelope, dict) else {}
    validation = validate_input(env)
    if not validation.ok:
        return _build_error_envelope(validation.payload, env)

    lineage = verify_lineage_and_replay(
        env,
        execution_context_row,
        write_permissions,
        replay_registry,
    )
    if not lineage.ok:
        return _build_error_envelope(lineage.payload, env)

    plan = build_state_update_plan(env, execution_context_row, write_permissions)
    plan["returned_step_ids"] = list(env["aggregated_result"].get("returned_step_ids", []))
    exec_result = apply_execution_state_update(plan, execution_context_row)
    op_result = apply_operational_writes(plan, thread_row or sample_thread())
    mem_result = persist_memory_candidates(plan, execution_context_row)

    return {
        "status_kind": "success",
        "result_type": "state_update_result",
        "execution_context_id": env["execution_context_id"],
        "thread_id": env["thread_id"],
        "tenant_id": env["tenant_id"],
        "state_update_result": {
            "execution_state_result": exec_result,
            "operational_write_result": op_result,
            "memory_persist_result": mem_result,
            "rollup_status": plan["rollup_status"],
            "mapped_status": plan["mapped_status"],
        },
        "allowed_next_stage": CANONICAL_NEXT_STAGE,
        "response_generation_allowed": True,
        "domain_writes_performed": True,
        "idempotency_key": env["idempotency_key"],
    }


__all__ = [
    "FORBIDDEN_WRITE_CLASSES",
    "CANONICAL_NEXT_STAGE",
    "UPSTREAM_STAGE",
    "MY_STAGE",
    "STATUS_MAPPING",
    "Result",
    "sample_execution_context",
    "sample_thread",
    "sample_valid_envelope",
    "sample_write_permissions",
    "validate_input",
    "verify_lineage_and_replay",
    "build_state_update_plan",
    "apply_execution_state_update",
    "apply_operational_writes",
    "persist_memory_candidates",
    "process",
]
