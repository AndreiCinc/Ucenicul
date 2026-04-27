from __future__ import annotations
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from rc_logic import (
    run_rc,
    validate_state_update_input,
    verify_lineage,
    build_composition_input,
    compose_response,
    build_output_envelope,
)

RESULTS_DIR = Path(__file__).resolve().parent / "results"


def make_valid_payload(
    *,
    status="success",
    summary="State update finished successfully.",
    applied=None,
    blocked=None,
    warnings=None,
    followups=None,
    locale="ro",
    channel="telegram",
    actions=None,
    facts=None,
):
    return {
        "status_kind": "success",
        "result_type": "state_update_result",
        "execution_context_id": "33333333-3333-3333-3333-333333333333",
        "thread_id": "55555555-5555-5555-5555-555555555555",
        "tenant_id": "44444444-4444-4444-4444-444444444444",
        "allowed_next_stage": "WF-RC-01",
        "response_generation_allowed": True,
        "channel": channel,
        "locale": locale,
        "state_update_result": {
            "status": status,
            "summary": summary,
            "applied_write_classes": list(applied or []),
            "blocked_write_classes": list(blocked or []),
            "warnings": list(warnings or []),
            "followup_requests": list(followups or []),
            "actions_acknowledged": list(actions or []),
            "user_visible_facts": list(facts or []),
        },
    }


def make_exec_row(tenant_id="44444444-4444-4444-4444-444444444444", thread_id="55555555-5555-5555-5555-555555555555"):
    return {
        "id": "33333333-3333-3333-3333-333333333333",
        "tenant_id": tenant_id,
        "thread_id": thread_id,
        "status": "completed",
    }


def make_thread_row(thread_id="55555555-5555-5555-5555-555555555555", tenant_id="44444444-4444-4444-4444-444444444444"):
    return {
        "id": thread_id,
        "tenant_id": tenant_id,
        "title": "Task follow-up",
        "summary": "Short thread summary",
        "status": "active",
    }


def assert_success_output(out):
    assert out["status_kind"] == "success"
    assert out["result_type"] == "composed_response"
    assert out["allowed_next_stage"] == "MESSAGE_OUT"
    assert out["output_gateway_allowed"] is True
    assert out["response_generation_allowed"] is True
    assert isinstance(out["composed_response"]["final_response_text"], str)
    assert out["composed_response"]["final_response_text"].strip()


def family_input_validation():
    for i in range(50):
        payload = make_valid_payload()
        required = [
            "status_kind",
            "result_type",
            "execution_context_id",
            "thread_id",
            "tenant_id",
            "state_update_result",
            "allowed_next_stage",
            "response_generation_allowed",
        ]
        target = required[i % len(required)]
        payload.pop(target, None)
        out = validate_state_update_input(payload)
        assert out["status_kind"] == "error"
        assert out["error"]["code"] == "INVALID_RESPONSE_COMPOSITION_INPUT"


def family_happy_path_success():
    classes = [
        [],
        ["execution_state_update"],
        ["execution_state_update", "thread_state_update"],
        ["execution_state_update", "thread_state_update", "memory_candidate_persistence", "audit_persistence"],
    ]
    for i in range(50):
        payload = make_valid_payload(
            status="success",
            summary=f"Success path {i}",
            applied=classes[i % len(classes)],
            actions=[f"action-{i}"] if i % 2 == 0 else [],
            facts=[f"fact-{i}"] if i % 3 == 0 else [],
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        assert "Success path" in out["composed_response"]["final_response_text"]


def family_happy_path_partial():
    blocked_pool = [
        ["thread_state_update"],
        ["memory_candidate_persistence"],
        ["thread_state_update", "memory_candidate_persistence"],
        ["audit_persistence"],
    ]
    for i in range(50):
        payload = make_valid_payload(
            status="partial",
            summary=f"Partial path {i}",
            applied=["execution_state_update"],
            blocked=blocked_pool[i % len(blocked_pool)],
            warnings=[{"code": "WARN", "message": f"warn-{i}"}],
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        text = out["composed_response"]["final_response_text"]
        assert "parțial" in text or "partially" in text
        assert "WARN" in text or "warn-" in text


def family_failure_rendering():
    for i in range(50):
        payload = make_valid_payload(
            status="failed",
            summary=f"Failure path {i}",
            blocked=["execution_state_update", "thread_state_update"],
            warnings=[f"failure-warning-{i}"],
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        assert out["composed_response"]["response_status"] == "failed"
        assert f"Failure path {i}" in out["composed_response"]["final_response_text"]


def family_followup_requests_rendering():
    for i in range(50):
        payload = make_valid_payload(
            status="partial",
            summary=f"Followup path {i}",
            followups=[f"clarificare-{i}", f"pas-{i}"],
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        assert out["composed_response"]["includes_followups"] is True
        assert out["composed_response"]["followup_count"] == 2
        assert f"clarificare-{i}" in out["composed_response"]["final_response_text"]


def family_blocked_write_rendering():
    blocked = [
        "execution_state_update",
        "thread_state_update",
        "memory_candidate_persistence",
        "audit_persistence",
    ]
    for i in range(50):
        payload = make_valid_payload(
            status="partial",
            summary=f"Blocked path {i}",
            blocked=[blocked[i % len(blocked)]],
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        assert out["composed_response"]["response_status"] == "partial"


def family_warning_rendering():
    for i in range(50):
        payload = make_valid_payload(
            status="success" if i % 2 == 0 else "partial",
            summary=f"Warning path {i}",
            warnings=[{"code": f"W{i}", "message": f"warning-{i}"}],
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        assert out["composed_response"]["includes_warnings"] is True
        assert f"W{i}" in out["composed_response"]["final_response_text"]

def family_no_action_rendering():
    for i in range(50):
        payload = make_valid_payload(
            status="no_action",
            summary=f"No action path {i}",
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        assert out["composed_response"]["response_status"] == "no_action"

def family_lineage_validation():
    for i in range(50):
        payload = make_valid_payload()
        if i % 3 == 0:
            out = run_rc(payload, None, make_thread_row())
        elif i % 3 == 1:
            out = run_rc(payload, make_exec_row(tenant_id="99999999-9999-9999-9999-999999999999"), make_thread_row())
        else:
            out = run_rc(payload, make_exec_row(thread_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), make_thread_row())
        assert out["status_kind"] == "error"
        assert out["error"]["code"] == "LINEAGE_MISMATCH"

def family_rc_idempotency():
    for i in range(50):
        payload = make_valid_payload(
            status="success" if i % 2 == 0 else "partial",
            summary=f"Idempotency path {i}",
            applied=["execution_state_update"],
            blocked=["thread_state_update"] if i % 2 else [],
            warnings=[f"warn-{i}"] if i % 4 == 0 else [],
        )
        out1 = run_rc(payload, make_exec_row(), make_thread_row())
        out2 = run_rc(payload, make_exec_row(), make_thread_row())
        assert out1 == out2

def family_wf_su_to_wf_rc_handoff():
    for i in range(50):
        payload = make_valid_payload(
            status=["success", "partial", "failed", "no_action"][i % 4],
            summary=f"Handoff path {i}",
            applied=["audit_persistence"] if i % 2 == 0 else [],
            blocked=["memory_candidate_persistence"] if i % 3 == 0 else [],
            warnings=[f"warn-{i}"] if i % 5 == 0 else [],
            followups=[f"follow-{i}"] if i % 7 == 0 else [],
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        assert out["execution_context_id"] == payload["execution_context_id"]
        assert out["thread_id"] == payload["thread_id"]
        assert out["tenant_id"] == payload["tenant_id"]

def family_downstream_payload_shape():
    for i in range(50):
        payload = make_valid_payload(
            status="success",
            summary=f"Shape path {i}",
            locale="en" if i % 2 else "ro",
            channel="whatsapp" if i % 3 == 0 else "telegram",
        )
        out = run_rc(payload, make_exec_row(), make_thread_row())
        assert_success_output(out)
        cr = out["composed_response"]
        assert set(["final_response_text","response_status","includes_followups","includes_warnings","followup_count","warning_count","channel","locale"]).issubset(cr.keys())
        assert out["idempotency_key"].startswith("compose:")

def family_reporting_and_tooling_contract():
    for i in range(50):
        payload = make_valid_payload(
            status="success",
            summary=f"Tooling path {i}",
        )
        validated = validate_state_update_input(payload)
        assert validated["_valid"] is True
        verified = verify_lineage(validated, make_exec_row(), make_thread_row())
        assert verified["_context_ready"] is True
        comp = build_composition_input(verified)
        composed = compose_response(comp)
        env = build_output_envelope(validated, composed)
        assert_success_output(env)


FAMILIES = [
    ("input_validation", family_input_validation),
    ("happy_path_success", family_happy_path_success),
    ("happy_path_partial", family_happy_path_partial),
    ("failure_rendering", family_failure_rendering),
    ("followup_requests_rendering", family_followup_requests_rendering),
    ("blocked_write_rendering", family_blocked_write_rendering),
    ("warning_rendering", family_warning_rendering),
    ("no_action_rendering", family_no_action_rendering),
    ("lineage_validation", family_lineage_validation),
    ("rc_idempotency", family_rc_idempotency),
    ("wf_su_to_wf_rc_handoff", family_wf_su_to_wf_rc_handoff),
    ("downstream_payload_shape", family_downstream_payload_shape),
    ("reporting_and_tooling_contract", family_reporting_and_tooling_contract),
]


def main():
    results = {
        "total_families": len(FAMILIES),
        "tests_per_family": 50,
        "total_tests": len(FAMILIES) * 50,
        "passed": 0,
        "failed": 0,
        "families": [],
    }
    for name, fn in FAMILIES:
        fn()
        results["families"].append({"family": name, "passed": 50, "failed": 0})
        results["passed"] += 50

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")

    md_lines = [
        "# WF-RC-01 test results",
        "",
        f"- total_families: {results['total_families']}",
        f"- tests_per_family: {results['tests_per_family']}",
        f"- total_tests: {results['total_tests']}",
        f"- passed: {results['passed']}",
        f"- failed: {results['failed']}",
        "",
        "| Family | Passed | Failed |",
        "|---|---:|---:|",
    ]
    for item in results["families"]:
        md_lines.append(f"| {item['family']} | {item['passed']} | {item['failed']} |")
    (RESULTS_DIR / "results.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
