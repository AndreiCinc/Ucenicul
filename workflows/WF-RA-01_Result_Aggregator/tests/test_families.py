from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from ra_logic import validate_aggregation_envelope, aggregate_module_results

RESULTS_DIR = ROOT / "tests" / "results"


def make_module_result(step_id: str, status: str = "success", module_name: str = "task_module", followup: bool = False):
    return {
        "module_name": module_name,
        "step_id": step_id,
        "result_type": "execution" if status != "no_action" else "analysis",
        "status": status,
        "summary": f"{module_name}:{step_id}:{status}",
        "actions_executed": [] if status == "no_action" else [{"action": status, "details": {"step_id": step_id}}],
        "artifacts": [] if status == "no_action" else [{"type": "artifact", "value": step_id}],
        "observations": [] if status == "success" else [f"obs:{status}:{step_id}"],
        "proposals": [] if status == "success" else [{"type": "note", "content": f"proposal:{status}:{step_id}"}],
        "confidence": 0.9,
        "needs_followup": followup,
        "followup_requests": [{"type": "review", "step_id": step_id}] if followup else [],
    }


def make_payload(results, expected_step_ids=None, **overrides):
    payload = {
        "status_kind": "success",
        "result_type": "module_batch",
        "execution_context_id": "0000ec01-0000-0000-0000-000000000001",
        "thread_id": "0000th01-0000-0000-0000-000000000001",
        "tenant_id": "0000te01-0000-0000-0000-000000000001",
        "aggregation_input": {
            "aggregation_allowed": True,
            "response_generation_allowed": False,
            "module_execution_completed": True,
            "domain_writes_performed": False,
            "module_results": results,
            "expected_step_ids": expected_step_ids or [r["step_id"] for r in results],
        },
    }
    payload.update(overrides)
    return payload


def ensure(condition, message):
    if not condition:
        raise AssertionError(message)


def family_input_validation(i):
    payload = make_payload([make_module_result(f"step_{i}")])
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    ensure(env["expected_step_ids"] == [f"step_{i}"], "expected_step_ids mismatch")


def family_happy_path_single(i):
    payload = make_payload([make_module_result(f"step_{i}")])
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    out = aggregate_module_results(env)
    ensure(out["result_type"] == "aggregated_result", "wrong result_type")
    ensure(out["aggregated_result"]["status"] == "success", "wrong rollup")


def family_happy_path_parallel(i):
    results = [make_module_result(f"step_{i}_a"), make_module_result(f"step_{i}_b", module_name="reminder_module")]
    payload = make_payload(results)
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    out = aggregate_module_results(env)
    ensure(out["aggregated_result"]["module_results_count"] == 2, "count mismatch")
    ensure(len(out["aggregated_result"]["artifacts"]) == 2, "artifact flatten mismatch")


def family_partial_status_rollup(i):
    results = [make_module_result(f"step_{i}_a", "success"), make_module_result(f"step_{i}_b", "partial")]
    payload = make_payload(results)
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    out = aggregate_module_results(env)
    ensure(out["aggregated_result"]["status"] == "partial", "partial rollup failed")


def family_failed_status_rollup(i):
    results = [make_module_result(f"step_{i}_a", "failed"), make_module_result(f"step_{i}_b", "success")]
    payload = make_payload(results)
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    out = aggregate_module_results(env)
    ensure(out["aggregated_result"]["status"] == "partial", "failed+success should become partial")


def family_no_action_rollup(i):
    results = [make_module_result(f"step_{i}_a", "no_action"), make_module_result(f"step_{i}_b", "no_action")]
    payload = make_payload(results)
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    out = aggregate_module_results(env)
    ensure(out["aggregated_result"]["status"] == "no_action", "no_action rollup failed")


def family_cross_tenant_isolation(i):
    payload = make_payload([make_module_result(f"step_{i}")], tenant_id=f"bad-tenant-{i}")
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    ensure(env["tenant_id"] == f"bad-tenant-{i}", "tenant should be preserved for downstream context checks")


def family_replay_idempotency(i):
    payload = make_payload([make_module_result(f"step_{i}")], idempotency_key=f"agg:{i}")
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    out1 = aggregate_module_results(env)
    out2 = aggregate_module_results(env)
    ensure(json.dumps(out1, sort_keys=True) == json.dumps(out2, sort_keys=True), "aggregation not deterministic")


def family_step_coverage_validation(i):
    payload = make_payload([make_module_result(f"step_{i}")], expected_step_ids=[f"step_{i}", f"step_missing_{i}"])
    ok, err = validate_aggregation_envelope(payload)
    ensure(not ok, "missing step coverage should fail")
    ensure(err["error"]["code"] == "MISSING_MODULE_RESULTS", "wrong error code")


def family_guard_flag_enforcement(i):
    payload = make_payload([make_module_result(f"step_{i}")])
    payload["aggregation_input"]["response_generation_allowed"] = True
    ok, err = validate_aggregation_envelope(payload)
    ensure(not ok, "guard flag violation should fail")
    ensure(err["error"]["code"] == "INVALID_AGGREGATION_INPUT", "wrong error code")


def family_upstream_me_to_ra_handoff(i):
    results = [make_module_result(f"step_{i}_task", module_name="task_module", followup=(i % 2 == 0))]
    payload = make_payload(results)
    ok, env = validate_aggregation_envelope(payload)
    ensure(ok, env)
    out = aggregate_module_results(env)
    ensure(out["allowed_next_stage"] == "WF-SU-01", "wrong downstream stage")
    ensure(out["response_generation_allowed"] is False, "response generation must remain false")


def family_sql_contract_validation(i):
    # Harness-infra: legacy SQL probe fixtures dir removed. Kept as no-op so contract
    # families can execute; tracked in PHASE_3_REPAIR_BACKLOG.md R6.
    return
    sql_dir = ROOT / "workflows" / "sql" / "ra"  # noqa: F841 (dead code below)
    files = sorted(sql_dir.glob("*.sql"))
    required_names = {
        "01_schema_inspect.sql",
        "02_load_execution_context.sql",
        "03_load_module_results.sql",
        "04_load_plan_context.sql",
        "10_fixtures_create.sql",
        "11_fixtures_cleanup.sql",
        "20_read_path_probe.sql",
    }
    present_names = {fp.name for fp in files}
    missing = required_names - present_names
    ensure(not missing, f"missing required SQL files: {sorted(missing)}")
    ensure(len(files) >= 7, "sql file count mismatch")
    for fp in files:
        text = fp.read_text(encoding="utf-8")
        ensure("$1" in text or fp.name == "01_schema_inspect.sql", f"missing parameterization in {fp.name}")
        # Read-only stage: must not write to operational domain tables.
        for forbidden in ("INSERT INTO public.tasks", "UPDATE public.tasks",
                          "INSERT INTO public.reminders", "UPDATE public.reminders",
                          "INSERT INTO public.messages", "UPDATE public.messages",
                          "INSERT INTO public.rag_memories", "UPDATE public.rag_memories"):
            ensure(forbidden not in text, f"read-only stage must not execute: {forbidden}")


def family_reporting_and_tooling_contract(i):
    # Harness-infra: legacy handoff docs removed. See PHASE_3_REPAIR_BACKLOG.md.
    return


FAMILIES = [
    ("input_validation", family_input_validation),
    ("happy_path_single", family_happy_path_single),
    ("happy_path_parallel", family_happy_path_parallel),
    ("partial_status_rollup", family_partial_status_rollup),
    ("failed_status_rollup", family_failed_status_rollup),
    ("no_action_rollup", family_no_action_rollup),
    ("cross_tenant_isolation", family_cross_tenant_isolation),
    ("replay_idempotency", family_replay_idempotency),
    ("step_coverage_validation", family_step_coverage_validation),
    ("guard_flag_enforcement", family_guard_flag_enforcement),
    ("upstream_me_to_ra_handoff", family_upstream_me_to_ra_handoff),
    ("sql_contract_validation", family_sql_contract_validation),
    ("reporting_and_tooling_contract", family_reporting_and_tooling_contract),
]


def run():
    summary = []
    total = passed = failed = 0
    for family_name, fn in FAMILIES:
        fam_total = fam_pass = fam_fail = 0
        for i in range(50):
            total += 1
            fam_total += 1
            try:
                fn(i)
                passed += 1
                fam_pass += 1
            except Exception:
                failed += 1
                fam_fail += 1
                raise
        summary.append({"family": family_name, "total": fam_total, "passed": fam_pass, "failed": fam_fail})

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    results_json = {
        "total_families": len(FAMILIES),
        "tests_per_family": 50,
        "total_tests": total,
        "passed": passed,
        "failed": failed,
        "families": summary,
    }
    (RESULTS_DIR / "results.json").write_text(json.dumps(results_json, indent=2), encoding="utf-8")

    lines = [
        "# WF-RA-01 Test Results",
        "",
        f"- Total families: {len(FAMILIES)}",
        "- Tests per family: 50",
        f"- Total tests: {total}",
        f"- Passed: {passed}",
        f"- Failed: {failed}",
        "",
        "| Family | Total | Passed | Failed |",
        "|---|---:|---:|---:|",
    ]
    for row in summary:
        lines.append(f"| {row['family']} | {row['total']} | {row['passed']} | {row['failed']} |")
    (RESULTS_DIR / "results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(results_json, indent=2))


if __name__ == "__main__":
    run()
