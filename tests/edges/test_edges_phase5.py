"""Phase 5 — Edge-by-edge synthetic contract tests.

For each of the four Phase-4-activated edges, compose source WF output → target WF
input and assert the envelope validates. 50 cases per edge × 4 edges = 200 synthetic.

Edges covered this cycle (per CONNECTOR_ACTIVATION_PLAN.md §2):
  5: DI→ME   via DI_Dispatch_To_ME_01_SUBCALL
  6: ME→RA   via ME_Dispatch_To_RA_01_SUBCALL
  7: RA→SU   via RA_Dispatch_To_SU_01_SUBCALL
  9: RC→MO   via RC_Dispatch_To_MO_01_SUBCALL (re-enabled)

Deferred edges (1:TR→EC, 2:EC→OR, 3:OR→PL, 4:PL→DI, 8:SU→RC) are not tested here —
they require target-workflow refactor to add executeWorkflowTrigger and are out
of Phase-4 scope.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[2]  # Ucenicul/

# Register every per-WF scripts dir on sys.path (same pattern as per-WF harnesses).
for wf_scripts in [
    ROOT / "workflows" / "WF-DI-01_Dispatcher" / "scripts",
    ROOT / "workflows" / "WF-ME-01_Module_Execution" / "scripts",
    ROOT / "workflows" / "WF-RA-01_Result_Aggregator" / "scripts",
    ROOT / "workflows" / "WF-SU-01_State_Persistence_Updater" / "scripts" / "su",
    ROOT / "workflows" / "WF-RC-01_Response_Composer" / "scripts",
    ROOT / "workflows" / "WF-MO-01_Message_Out_Output_Gateway" / "scripts",
]:
    sys.path.insert(0, str(wf_scripts))

import di_logic  # noqa: E402
import me_logic  # noqa: E402
import ra_logic  # noqa: E402
import su_logic  # noqa: E402
import rc_logic  # noqa: E402
import mo_logic  # noqa: E402


GOOD_ROW = {
    "execution_id": "0000ec01-0000-0000-0000-000000000001",
    "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
    "thread_id": "11111111-0000-0000-0000-000000000001",
    "trigger_message_id": "aaaabbbb-0000-0000-0000-000000000010",
    "idempotency_key": "aaaaaaaa-0000-0000-0000-000000000001:aaaabbbb-0000-0000-0000-000000000010:exec_ctx:v1",
    "status": "initialized",
}


def ensure(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


# ────────────────────────── Fixture builders ──────────────────────────

def good_plan(i: int, step_count: int = 2) -> Dict[str, Any]:
    steps = [
        {
            "step_id": f"step_task_create_{i}",
            "module_name": "task_module",
            "purpose": "Create a task.",
            "inputs": {"action": "create_task", "description": f"Task {i}", "due_date": "2026-04-20"},
            "depends_on": [],
            "execution_mode": "parallel" if i % 2 == 0 else "sequential",
            "expected_outputs": ["task_id"],
            "replan_if": ["failed"],
            "failure_policy": "block_if_main_goal",
            "status": "pending",
        },
        {
            "step_id": f"step_reminder_create_{i}",
            "module_name": "reminder_module",
            "purpose": "Create a reminder.",
            "inputs": {"action": "create_reminder", "description": f"Reminder {i}", "due_date": "2026-04-21", "time": "09:00"},
            "depends_on": [],
            "execution_mode": "sequential",
            "expected_outputs": ["reminder_id"],
            "replan_if": ["failed"],
            "failure_policy": "continue_with_notice",
            "status": "pending",
        },
    ]
    return {
        "status_kind": "success",
        "result_type": "plan",
        "module_name": "plan_generation",
        "payload": {
            "tenant_id": GOOD_ROW["tenant_id"],
            "thread_id": GOOD_ROW["thread_id"],
            "execution_id": GOOD_ROW["execution_id"],
            "trigger_message_id": GOOD_ROW["trigger_message_id"],
            "idempotency_key": GOOD_ROW["idempotency_key"],
            "plan_id": f"plan:{GOOD_ROW['execution_id']}:v{i}",
            "goal": f"Handle message {i}.",
            "primary_intent": "multi_action_request",
            "steps": steps[:step_count],
            "dispatcher_input": {
                "dispatch_allowed": True,
                "module_execution_started": False,
                "response_generation_allowed": False,
                "domain_writes_performed": False,
            },
            "warnings": [],
        },
    }


def make_module_result(i: int, kind: str = "task_module", status: str = "success") -> Dict[str, Any]:
    return {
        "module_name": kind,
        "step_id": f"step_{kind}_{i}",
        "result_type": "execution",
        "status": status,
        "summary": f"{kind} executed for case {i}",
        "actions_executed": [{"action": status, "details": {"step_id": f"step_{kind}_{i}"}}],
        "artifacts": [{"type": "artifact", "value": f"art_{i}"}],
        "observations": [],
        "proposals": [],
        "confidence": 0.9,
        "needs_followup": False,
        "followup_requests": [],
    }


def make_aggregation_envelope(i: int) -> Dict[str, Any]:
    results = [make_module_result(i, kind="task_module"), make_module_result(i, kind="reminder_module")]
    return {
        "status_kind": "success",
        "result_type": "module_batch",
        "execution_context_id": GOOD_ROW["execution_id"],
        "thread_id": GOOD_ROW["thread_id"],
        "tenant_id": GOOD_ROW["tenant_id"],
        "aggregation_input": {
            "aggregation_allowed": True,
            "response_generation_allowed": False,
            "module_execution_completed": True,
            "domain_writes_performed": False,
            "module_results": results,
            "expected_step_ids": [r["step_id"] for r in results],
        },
    }


def make_state_update_result(i: int) -> Dict[str, Any]:
    """SU-01 emits this after processing an aggregation envelope."""
    return {
        "status_kind": "success",
        "result_type": "state_update_result",
        "execution_context_id": GOOD_ROW["execution_id"],
        "thread_id": GOOD_ROW["thread_id"],
        "tenant_id": GOOD_ROW["tenant_id"],
        "allowed_next_stage": "WF-RC-01",
        "response_generation_allowed": True,
        "state_update_result": {
            "status": "success",
            "summary": f"All writes applied for case {i}.",
            "applied_write_classes": ["execution_state_update", "thread_state_update"],
            "blocked_write_classes": [],
            "warnings": [],
            "followup_requests": [],
            "user_visible_facts": [f"Fact {i}"],
            "actions_acknowledged": [f"Ack {i}"],
        },
        "idempotency_key": f"su:{GOOD_ROW['execution_id']}:v{i}",
    }


# ────────────────────────── Edge 5: DI → ME ──────────────────────────
# DI emits a single envelope with ready_groups = [[module_requests...]]. ME
# expects a per-step dispatch envelope (dispatcher_input.step, one at a time).
# The connector layer must SPLIT ready_groups → N per-step envelopes — that is
# the connector contract per n8n_Workflow_Mapping / Module_Registry.
# Phase-5 synthetic test composes the per-step envelope the connector would emit.

def _split_dispatch_to_per_step(dispatch_envelope: Dict[str, Any]) -> List[Dict[str, Any]]:
    p = dispatch_envelope["payload"]
    guard = p["dispatch_guard"]
    out: List[Dict[str, Any]] = []
    for group in p["ready_groups"]:
        for req in group.get("module_requests", []):
            step = {
                "step_id": req["step_id"],
                "module_name": req["module_name"],
                "purpose": req.get("purpose", ""),
                "inputs": req.get("inputs", {}),
                "execution_mode": req.get("execution_mode", "sequential"),
                "depends_on": req.get("depends_on", []),
                "expected_outputs": req.get("expected_outputs", []),
                "replan_if": req.get("replan_if", []),
                "failure_policy": req.get("failure_policy", "continue_with_notice"),
                "status": "pending",
            }
            out.append({
                "status_kind": "success",
                "result_type": "dispatch",
                "execution_context_id": p["execution_id"],
                "thread_id": p["thread_id"],
                "tenant_id": p["tenant_id"],
                "dispatcher_input": {
                    "dispatch_allowed": True,
                    "module_execution_started": False,
                    "response_generation_allowed": False,
                    "domain_writes_performed": False,
                    "step": step,
                },
                "idempotency_key": f"dispatch:{p['dispatch_id']}:{step['step_id']}",
            })
    return out


def edge_5_di_to_me(i: int) -> None:
    plan = good_plan(i, step_count=2)
    out = di_logic.run_full_pipeline(plan, GOOD_ROW)
    ensure(out["status_kind"] == "success", f"DI pipeline failed: {out}")
    ensure(out["result_type"] == "dispatch", "DI must emit dispatch")
    per_step = _split_dispatch_to_per_step(out)
    ensure(len(per_step) >= 1, f"DI emitted zero steps for case {i}")
    for env in per_step:
        ok, norm_or_err = me_logic.validate_dispatch_envelope(env)
        ensure(ok, f"ME rejected split DI envelope for case {i}: {norm_or_err}")


# ────────────────────────── Edge 6: ME → RA ──────────────────────────

def edge_6_me_to_ra(i: int) -> None:
    # ME emits a module_batch aggregation envelope (per n8n_Workflow_Mapping)
    env = make_aggregation_envelope(i)
    ok, norm = ra_logic.validate_aggregation_envelope(env)
    ensure(ok, f"RA rejected ME envelope for case {i}: {norm}")
    # Bonus: full aggregation must succeed
    agg = ra_logic.aggregate_module_results(norm)
    ensure(agg["result_type"] == "aggregated_result", f"RA aggregation wrong for case {i}")
    ensure(agg["allowed_next_stage"] == "WF-SU-01", f"RA must route to SU")


# ────────────────────────── Edge 7: RA → SU ──────────────────────────

def edge_7_ra_to_su(i: int) -> None:
    env = make_aggregation_envelope(i)
    ok, norm = ra_logic.validate_aggregation_envelope(env)
    ensure(ok, "RA validate failed")
    agg = ra_logic.aggregate_module_results(norm)
    # RA output is already in SU-compatible shape (status_kind/result_type/aggregated_result/
    # allowed_next_stage/state_update_allowed/response_generation_allowed/domain_writes_performed +
    # IDs). Connector layer only adds idempotency_key (required by SU, not emitted by RA).
    su_envelope = {
        **agg,
        "idempotency_key": f"ra-to-su:{GOOD_ROW['execution_id']}:v{i}",
    }
    result = su_logic.validate_input(su_envelope)
    ensure(result.ok, f"SU rejected RA envelope for case {i}: {result.payload}")


# ────────────────────────── Edge 9: RC → MO ──────────────────────────

def edge_9_rc_to_mo(i: int) -> None:
    su_out = make_state_update_result(i)
    # RC consumes SU's state_update_result and produces composed_response
    ec_row = {"id": GOOD_ROW["execution_id"], "tenant_id": GOOD_ROW["tenant_id"], "thread_id": GOOD_ROW["thread_id"]}
    th_row = {"id": GOOD_ROW["thread_id"], "tenant_id": GOOD_ROW["tenant_id"], "title": "Test thread", "summary": None}
    out = rc_logic.run_rc(su_out, execution_context_row=ec_row, thread_row=th_row)
    ensure(out["status_kind"] == "success", f"RC failed for case {i}: {out}")
    ensure(out["result_type"] == "composed_response", f"RC wrong result_type for case {i}")
    # ────── Edge-layer contract normalization (CONTRACT-DRIFT fix) ──────
    # rc_logic emits composed_response.final_response_text, whereas mo_logic
    # requires composed_response.response_text. This is a Python-mirror drift
    # between the two WFs' logic modules; the live n8n RC_Build_Output_Envelope
    # also emits final_response_text (see WF-RC-01.json). The connector layer /
    # MO input adapter must alias final_response_text → response_text.
    # Recorded in: tests/generated/edges/PHASE_5_EDGE_RUN_RECORD.md §Findings.
    out_for_mo = {**out, "composed_response": {**out["composed_response"]}}
    cr = out_for_mo["composed_response"]
    if "response_text" not in cr and "final_response_text" in cr:
        cr["response_text"] = cr["final_response_text"]
    # MO validates the envelope shape
    mo_res = mo_logic.validate_input(out_for_mo)
    ensure(mo_res.get("_valid") is True, f"MO rejected RC envelope for case {i}: {mo_res}")


EDGES = [
    ("edge_5_DI_to_ME", edge_5_di_to_me),
    ("edge_6_ME_to_RA", edge_6_me_to_ra),
    ("edge_7_RA_to_SU", edge_7_ra_to_su),
    ("edge_9_RC_to_MO", edge_9_rc_to_mo),
]


def run_suite(per_edge: int = 50) -> Dict[str, Any]:
    summary: List[Dict[str, Any]] = []
    total = passed = failed = 0
    first_failure: Tuple[str, int, str] | None = None
    for name, fn in EDGES:
        e_total = e_pass = e_fail = 0
        for i in range(per_edge):
            total += 1
            e_total += 1
            try:
                fn(i)
                passed += 1
                e_pass += 1
            except Exception as ex:
                failed += 1
                e_fail += 1
                if first_failure is None:
                    first_failure = (name, i, f"{type(ex).__name__}: {ex}")
        summary.append({"edge": name, "total": e_total, "passed": e_pass, "failed": e_fail})
    return {
        "per_edge_cases": per_edge,
        "total_tests": total,
        "passed": passed,
        "failed": failed,
        "edges": summary,
        "first_failure": first_failure,
    }


if __name__ == "__main__":
    res = run_suite(50)
    out_dir = ROOT / "tests" / "generated" / "edges"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "phase5_results.json").write_text(json.dumps(res, indent=2, default=str), encoding="utf-8")
    print(json.dumps(res, indent=2, default=str))
    if res["failed"]:
        sys.exit(1)
