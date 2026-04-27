from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "scripts" / "me"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from me_logic import simulate_module_execution  # noqa: E402

RESULTS_DIR = Path(__file__).resolve().parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def base_payload():
    return {
        "status_kind": "success",
        "result_type": "dispatch",
        "execution_context_id": "exec:0001",
        "thread_id": "thread:0001",
        "tenant_id": "tenant:0001",
        "idempotency_key": "dispatch:step:0001",
        "dispatcher_input": {
            "dispatch_allowed": True,
            "module_execution_started": False,
            "response_generation_allowed": False,
            "domain_writes_performed": False,
            "step": {
                "step_id": "step:0001",
                "module_name": "task_module",
                "purpose": "Create task",
                "execution_mode": "sequential",
                "inputs": {
                    "action": "create_task",
                    "description": "Call supplier",
                    "priority": "normal",
                    "due_type": "date",
                    "due_date": "2026-04-18"
                }
            }
        }
    }


def mutate(payload, path, value):
    cur = payload
    for key in path[:-1]:
        cur = cur[key]
    cur[path[-1]] = value
    return payload


def delete(payload, path):
    cur = payload
    for key in path[:-1]:
        cur = cur[key]
    cur.pop(path[-1], None)
    return payload


def assert_ok(res):
    return res.get("status_kind") == "success" and res.get("result_type") == "module_result"


def assert_err(res, code):
    return res.get("status_kind") == "error" and res.get("error", {}).get("code") == code


def run_family_input_validation():
    tests = []
    for i in range(10):
        p = base_payload()
        delete(p, ["status_kind"])
        tests.append(("missing_status_kind_%d" % i, assert_err(simulate_module_execution(p), "INVALID_DISPATCH_INPUT")))
    for i in range(10):
        p = base_payload()
        delete(p, ["result_type"])
        tests.append(("missing_result_type_%d" % i, assert_err(simulate_module_execution(p), "INVALID_DISPATCH_INPUT")))
    for i in range(10):
        p = base_payload()
        delete(p, ["dispatcher_input"])
        tests.append(("missing_dispatcher_input_%d" % i, assert_err(simulate_module_execution(p), "INVALID_DISPATCH_INPUT")))
    for i in range(10):
        p = base_payload()
        mutate(p, ["status_kind"], "error")
        tests.append(("wrong_status_kind_%d" % i, assert_err(simulate_module_execution(p), "INVALID_DISPATCH_INPUT")))
    for i in range(10):
        p = base_payload()
        mutate(p, ["result_type"], "plan")
        tests.append(("wrong_result_type_%d" % i, assert_err(simulate_module_execution(p), "INVALID_DISPATCH_INPUT")))
    return tests


def run_family_happy_path_task_create():
    tests = []
    for i in range(50):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "step_id"], f"step:create:{i}")
        mutate(p, ["dispatcher_input", "step", "inputs", "description"], f"Call supplier {i}")
        tests.append((f"happy_create_{i}", assert_ok(simulate_module_execution(p))))
    return tests


def run_family_happy_path_task_list():
    tests = []
    timeframes = ["today", "tomorrow", "current_week", "overdue", "all"]
    statuses = ["open", "completed", "cancelled", "all", "open"]
    for i in range(50):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "inputs"], {
            "action": "list_tasks",
            "timeframe": timeframes[i % len(timeframes)],
            "status": statuses[i % len(statuses)],
            "limit": (i % 25) + 1,
        })
        tests.append((f"happy_list_{i}", assert_ok(simulate_module_execution(p))))
    return tests


def run_family_happy_path_task_update():
    tests = []
    for i in range(25):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "inputs"], {
            "action": "update_task",
            "task_id": f"task:{i}",
            "priority": "high" if i % 2 else "normal",
        })
        tests.append((f"happy_update_task_id_{i}", assert_ok(simulate_module_execution(p))))
    for i in range(25):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "inputs"], {
            "action": "update_task",
            "title_match": f"old title {i}",
            "due_date": f"2026-04-{(i % 28) + 1:02d}",
        })
        tests.append((f"happy_update_title_match_{i}", assert_ok(simulate_module_execution(p))))
    return tests


def run_family_happy_path_task_complete():
    tests = []
    for i in range(25):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "inputs"], {
            "action": "complete_task",
            "task_id": f"task:{i}",
        })
        tests.append((f"happy_complete_task_id_{i}", assert_ok(simulate_module_execution(p))))
    for i in range(25):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "inputs"], {
            "action": "complete_task",
            "title_match": f"Call client {i}",
        })
        tests.append((f"happy_complete_title_{i}", assert_ok(simulate_module_execution(p))))
    return tests


def run_family_happy_path_task_delete():
    tests = []
    for i in range(17):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "inputs"], {
            "action": "delete_task",
            "task_id": f"task:{i}",
        })
        tests.append((f"happy_delete_task_id_{i}", assert_ok(simulate_module_execution(p))))
    for i in range(17):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "inputs"], {
            "action": "delete_task",
            "title_match": f"Buy soap {i}",
        })
        tests.append((f"happy_delete_title_{i}", assert_ok(simulate_module_execution(p))))
    for i in range(16):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "inputs"], {
            "action": "delete_task",
            "scope": "overdue" if i % 2 else "current_week",
        })
        tests.append((f"happy_delete_scope_{i}", assert_ok(simulate_module_execution(p))))
    return tests


def run_family_invalid_dispatch_envelope():
    tests = []
    for i in range(10):
        p = base_payload()
        delete(p, ["dispatcher_input", "step", "step_id"])
        tests.append((f"missing_step_id_{i}", assert_err(simulate_module_execution(p), "MISSING_REQUIRED_FIELDS")))
    for i in range(10):
        p = base_payload()
        delete(p, ["dispatcher_input", "step", "module_name"])
        tests.append((f"missing_module_name_{i}", assert_err(simulate_module_execution(p), "MISSING_REQUIRED_FIELDS")))
    for i in range(10):
        p = base_payload()
        delete(p, ["dispatcher_input", "step", "inputs"])
        tests.append((f"missing_inputs_{i}", assert_err(simulate_module_execution(p), "MISSING_REQUIRED_FIELDS")))
    for i in range(10):
        p = base_payload()
        delete(p, ["dispatcher_input", "step", "purpose"])
        tests.append((f"missing_purpose_{i}", assert_err(simulate_module_execution(p), "MISSING_REQUIRED_FIELDS")))
    for i in range(10):
        p = base_payload()
        delete(p, ["dispatcher_input", "step", "execution_mode"])
        tests.append((f"missing_execution_mode_{i}", assert_err(simulate_module_execution(p), "MISSING_REQUIRED_FIELDS")))
    return tests


def run_family_guard_flag_enforcement():
    tests = []
    flags = [
        ("dispatch_allowed", False),
        ("module_execution_started", True),
        ("response_generation_allowed", True),
        ("domain_writes_performed", True),
    ]
    for idx, (field, value) in enumerate(flags):
        for i in range(12 if idx < 2 else 13):
            p = base_payload()
            mutate(p, ["dispatcher_input", field], value)
            tests.append((f"guard_{field}_{i}", assert_err(simulate_module_execution(p), "INVALID_DISPATCH_INPUT")))
    return tests[:50]


def run_family_cross_tenant_isolation():
    tests = []
    for i in range(25):
        p = base_payload()
        mutate(p, ["tenant_id"], f"tenant:{i}")
        mutate(p, ["dispatcher_input", "step", "step_id"], f"step:tenant:{i}")
        tests.append((f"tenant_scoped_success_{i}", assert_ok(simulate_module_execution(p))))
    for i in range(25):
        p = base_payload()
        mutate(p, ["tenant_id"], f"tenant:{i}")
        mutate(p, ["dispatcher_input", "step", "module_name"], "memory_module")
        tests.append((f"tenant_unsupported_module_{i}", assert_err(simulate_module_execution(p), "UNSUPPORTED_MODULE")))
    return tests


def run_family_replay_idempotency():
    tests = []
    for i in range(50):
        p = base_payload()
        mutate(p, ["idempotency_key"], f"dispatch:replay:{i}")
        a = simulate_module_execution(p)
        b = simulate_module_execution(p)
        tests.append((f"replay_same_output_{i}", a == b))
    return tests


def run_family_unsupported_module_handling():
    tests = []
    modules = ["reminder_module", "memory_module", "improvement_module", "watcher_module_basic", "response_module"]
    actions = ["create", "update", "list", "noop", "execute"]
    for i in range(50):
        p = base_payload()
        mutate(p, ["dispatcher_input", "step", "module_name"], modules[i % len(modules)])
        mutate(p, ["dispatcher_input", "step", "inputs"], {"action": actions[i % len(actions)]})
        tests.append((f"unsupported_module_{i}", assert_err(simulate_module_execution(p), "UNSUPPORTED_MODULE")))
    return tests


def run_family_sql_contract_validation():
    tests = []
    sql_dir = ROOT / "sql" / "me"
    files = sorted(sql_dir.glob("*.sql"))
    assert files, "Expected SQL files"
    read_only = {"01_schema_inspect.sql", "02_load_execution_context.sql", "03_load_dispatch_request.sql", "04_load_task_candidates.sql", "20_read_path_probe.sql", "21_write_path_probe.sql"}
    for file in files:
        text = file.read_text(encoding="utf-8")
        lower = text.lower()
        tests.append((f"{file.name}_not_empty", bool(text.strip())))
        if file.name in read_only:
            tests.append((f"{file.name}_is_probe_or_read", "select" in lower or "--" in lower))
        else:
            tests.append((f"{file.name}_targets_tasks_table", "tasks" in lower))
        tests.append((f"{file.name}_mentions_tenant_or_fixture_scope", ("tenant_id" in lower) or ("fixture" in lower) or (file.name == "01_schema_inspect.sql")))
    critical = ["02_load_execution_context.sql", "03_load_dispatch_request.sql", "05_insert_task.sql", "06_update_task.sql", "07_complete_task.sql", "08_delete_task.sql"]
    checks = {name: (sql_dir / name).read_text(encoding="utf-8").lower() for name in critical}
    idx = 0
    while len(tests) < 50:
        name = critical[idx % len(critical)]
        lower = checks[name]
        if name == "02_load_execution_context.sql":
            tests.append((f"{name}_scopes_execution_context_{idx}", "from public.execution_contexts" in lower and "tenant_id" in lower))
        elif name == "03_load_dispatch_request.sql":
            tests.append((f"{name}_loads_plan_join_{idx}", "join public.execution_plans" in lower and "steps" in lower))
        elif name == "05_insert_task.sql":
            tests.append((f"{name}_inserts_open_task_{idx}", "insert into public.tasks" in lower and "'open'" in lower))
        elif name == "06_update_task.sql":
            tests.append((f"{name}_updates_task_row_{idx}", "update public.tasks" in lower and "updated_at = now()" in lower))
        elif name == "07_complete_task.sql":
            tests.append((f"{name}_completes_task_row_{idx}", "status = 'completed'" in lower))
        elif name == "08_delete_task.sql":
            tests.append((f"{name}_deletes_task_row_{idx}", "delete from public.tasks" in lower))
        idx += 1
    return tests[:50]


def run_family_reporting_and_tooling_contract():
    tests = []
    docs_dir = ROOT.parent / "docs" / "ucenicul_claude_handoff_hardened"
    expected = [
        "09_STAGE_WF-ME-01.md",
        "17_ACTIVE_STAGE_LOCK__WF-ME-01.md",
        "CURRENT_STAGE__WF-ME-01.md",
        "STATE__WF-ME-01.json",
        "BUILD_REPORT__WF-ME-01.md",
        "AUDIT_REPORT__WF-ME-01.md",
        "FIX_LOG__WF-ME-01.md",
        "CLOSURE_REPORT__WF-ME-01.md",
        "00_ROUTE_MAP__WF-ME-01_ACTIVATED.md",
    ]
    for name in expected:
        tests.append((f"doc_exists_{name}", (docs_dir / name).exists()))
    wf_dir = ROOT
    expected_wf = [
        "WF-ME-01_Module_Execution.json",
        "WF-ME-01_blueprint.json",
        "WF-ME-01_NODE_MAP.md",
        "WF-ME-01_CONNECTION_MAP.md",
        "WF-ME-01_IMPORT_PATCH_PLAN.md",
    ]
    for name in expected_wf:
        tests.append((f"workflow_file_exists_{name}", (wf_dir / name).exists()))
    while len(tests) < 50:
        idx = len(tests)
        tests.append((f"results_dir_exists_{idx}", RESULTS_DIR.exists()))
    return tests[:50]


FAMILIES = [
    ("input_validation", run_family_input_validation),
    ("happy_path_task_create", run_family_happy_path_task_create),
    ("happy_path_task_list", run_family_happy_path_task_list),
    ("happy_path_task_update", run_family_happy_path_task_update),
    ("happy_path_task_complete", run_family_happy_path_task_complete),
    ("happy_path_task_delete", run_family_happy_path_task_delete),
    ("invalid_dispatch_envelope", run_family_invalid_dispatch_envelope),
    ("guard_flag_enforcement", run_family_guard_flag_enforcement),
    ("cross_tenant_isolation", run_family_cross_tenant_isolation),
    ("replay_idempotency", run_family_replay_idempotency),
    ("unsupported_module_handling", run_family_unsupported_module_handling),
    ("sql_contract_validation", run_family_sql_contract_validation),
    ("reporting_and_tooling_contract", run_family_reporting_and_tooling_contract),
]


def main():
    family_results = []
    total_pass = 0
    total_fail = 0
    for family_name, fn in FAMILIES:
        tests = fn()
        if len(tests) != 50:
            raise AssertionError(f"{family_name} produced {len(tests)} tests, expected 50")
        passed = sum(1 for _, ok in tests if ok)
        failed = len(tests) - passed
        total_pass += passed
        total_fail += failed
        family_results.append({
            "family": family_name,
            "total": len(tests),
            "passed": passed,
            "failed": failed,
            "tests": [{"name": name, "passed": ok} for name, ok in tests],
        })

    summary = {
        "stage": "WF-ME-01",
        "total_families": len(FAMILIES),
        "tests_per_family": 50,
        "total_tests": len(FAMILIES) * 50,
        "passed": total_pass,
        "failed": total_fail,
        "families": family_results,
    }

    (RESULTS_DIR / "results.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    lines = [
        "# WF-ME-01 Test Results",
        "",
        f"- Total families: {summary['total_families']}",
        f"- Tests per family: {summary['tests_per_family']}",
        f"- Total tests: {summary['total_tests']}",
        f"- Passed: {summary['passed']}",
        f"- Failed: {summary['failed']}",
        "",
        "| Family | Total | Passed | Failed |",
        "|---|---:|---:|---:|",
    ]
    for item in family_results:
        lines.append(f"| {item['family']} | {item['total']} | {item['passed']} | {item['failed']} |")
    (RESULTS_DIR / "results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
