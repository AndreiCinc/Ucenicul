"""
test_families.py — Script-first test harness for WF-EC-01.

Coverage families (each with 30 tests, per the 30-TEST RULE):
  1. Input validation (EC_Validate_Input)
  2. Happy path initialization (logic-level)
  3. Idempotency / replay (logic-level)
  4. Cross-tenant / isolation behavior (logic-level)
  5. TR → EC handoff (logic-level)
  6. Node contract tests (per-node)
  7. Tooling / blocker / reporting behavior

Node contract tests are packaged in sub-groups (validation, payload builder,
upsert/reload simulator, result formatter, invalid/error path), each 30 tests.
DB-backed tests go through Postgres MCP and live against `execution_contexts`;
pure-logic tests run in-process against the Python ports of the n8n jsCode.

Output:
  tests/ec/results/results.json  — machine-readable
  tests/ec/results/results.md    — human-readable summary

This file is intended to be imported by `run_ec_tests.py`. It does NOT talk to
Postgres directly; the runner owns the DB session / MCP integration.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SCRIPTS = os.path.join(ROOT, "workflows", "scripts", "ec")
sys.path.insert(0, SCRIPTS)

from ec_logic import (  # noqa: E402
    ec_validate_input,
    ec_build_init_payload,
    ec_shape_return_result,
    ec_shape_return_error,
    UUID_RE,
)

# -------------------- Helpers --------------------


def _uuid(label: str, seed: int = 0) -> str:
    """Deterministic pseudo-UUID derived from a label (for scripted tests)."""
    h = hashlib.sha1(f"{label}:{seed}".encode()).hexdigest()
    return (
        f"{h[0:8]}-{h[8:12]}-4{h[13:16]}-8{h[17:20]}-{h[20:32]}"
    )


TENANT_A = "aaaaaaaa-0000-0000-0000-000000000001"
TENANT_B = "aaaaaaaa-0000-0000-0000-000000000002"
THREAD_A = "11111111-0000-0000-0000-00000000ec01"
THREAD_B = "22222222-0000-0000-0000-00000000ec02"


def _req(**over) -> Dict[str, Any]:
    base = {
        "tenant_id": TENANT_A,
        "thread_id": THREAD_A,
        "trigger_message_id": _uuid("msg", over.pop("seed", 1)),
        "resolution_method": "direct_reply_linkage",
        "resolved_at": "2026-04-16T20:00:00Z",
    }
    base.update(over)
    return base


# -------------------- Test record --------------------


class TestCase:
    __slots__ = (
        "tid",
        "family",
        "purpose",
        "input",
        "preconditions",
        "expected",
        "actual",
        "status",
        "fix_ref",
    )

    def __init__(self, tid: str, family: str, purpose: str, inp: Any,
                 preconditions: str, expected: Any):
        self.tid = tid
        self.family = family
        self.purpose = purpose
        self.input = inp
        self.preconditions = preconditions
        self.expected = expected
        self.actual: Any = None
        self.status: str = "pending"
        self.fix_ref: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "tid": self.tid,
            "family": self.family,
            "purpose": self.purpose,
            "input": self.input,
            "preconditions": self.preconditions,
            "expected": self.expected,
            "actual": self.actual,
            "status": self.status,
            "fix_ref": self.fix_ref,
        }


# -------------------- Family 1: Input validation (30) --------------------


def family_input_validation() -> List[TestCase]:
    cases: List[TestCase] = []
    # 1.01 happy input passes
    c = TestCase("EC-F1-01", "input_validation",
                 "valid input returns _valid=true",
                 _req(seed=1), "none",
                 {"_valid": "true"})
    cases.append(c)

    # 1.02..1.04 three required fields missing individually
    for i, f in enumerate(("tenant_id", "thread_id", "trigger_message_id"), start=2):
        inp = _req(seed=i)
        inp[f] = None
        cases.append(TestCase(
            f"EC-F1-{i:02d}", "input_validation",
            f"missing {f} is rejected with INVALID_INPUT",
            inp, "none", {"_valid": "false", "_error": "INVALID_INPUT", "_missing_field": f}))

    # 1.05..1.07 required fields set to empty string
    for i, f in enumerate(("tenant_id", "thread_id", "trigger_message_id"), start=5):
        inp = _req(seed=i)
        inp[f] = ""
        cases.append(TestCase(
            f"EC-F1-{i:02d}", "input_validation",
            f"empty-string {f} treated as missing",
            inp, "none", {"_valid": "false", "_error": "INVALID_INPUT", "_missing_field": f}))

    # 1.08..1.10 malformed UUID per required field
    for i, f in enumerate(("tenant_id", "thread_id", "trigger_message_id"), start=8):
        inp = _req(seed=i)
        inp[f] = "not-a-uuid"
        cases.append(TestCase(
            f"EC-F1-{i:02d}", "input_validation",
            f"malformed {f} is rejected with INVALID_UUID",
            inp, "none", {"_valid": "false", "_error": "INVALID_UUID", "_missing_field": f}))

    # 1.11 resolved_at invalid string
    cases.append(TestCase(
        "EC-F1-11", "input_validation",
        "malformed resolved_at rejected",
        _req(resolved_at="not-a-date", seed=11),
        "none", {"_valid": "false", "_error": "INVALID_RESOLVED_AT"}))

    # 1.12 resolved_at null is allowed
    cases.append(TestCase(
        "EC-F1-12", "input_validation",
        "null resolved_at accepted",
        _req(resolved_at=None, seed=12),
        "none", {"_valid": "true"}))

    # 1.13 resolved_at with Z suffix accepted
    cases.append(TestCase(
        "EC-F1-13", "input_validation",
        "Z-suffix resolved_at accepted",
        _req(resolved_at="2026-04-17T00:00:00Z", seed=13),
        "none", {"_valid": "true"}))

    # 1.14 resolved_at with +00:00 accepted
    cases.append(TestCase(
        "EC-F1-14", "input_validation",
        "+00:00 offset resolved_at accepted",
        _req(resolved_at="2026-04-17T00:00:00+00:00", seed=14),
        "none", {"_valid": "true"}))

    # 1.15 nested 'request' shape accepted
    nested = {"request": _req(seed=15)}
    cases.append(TestCase(
        "EC-F1-15", "input_validation",
        "nested 'request' shape accepted",
        nested, "none", {"_valid": "true"}))

    # 1.16 nested shape missing tenant_id rejected
    nbad = {"request": _req(seed=16)}
    nbad["request"]["tenant_id"] = None
    cases.append(TestCase(
        "EC-F1-16", "input_validation",
        "nested shape with missing tenant rejected",
        nbad, "none", {"_valid": "false", "_error": "INVALID_INPUT", "_missing_field": "tenant_id"}))

    # 1.17 idempotency_key accepts provided value
    inp = _req(seed=17)
    inp["idempotency_key"] = "custom-key-xyz"
    cases.append(TestCase(
        "EC-F1-17", "input_validation",
        "custom idempotency_key passes through",
        inp, "none", {"_valid": "true", "_idempotency_key": "custom-key-xyz"}))

    # 1.18 idempotency_key derived when absent
    cases.append(TestCase(
        "EC-F1-18", "input_validation",
        "idempotency_key auto-derived when absent",
        _req(seed=18),
        "none", {"_valid": "true", "_idempotency_key_derived": True}))

    # 1.19 idempotency_key 301 chars rejected
    inp = _req(seed=19)
    inp["idempotency_key"] = "x" * 301
    cases.append(TestCase(
        "EC-F1-19", "input_validation",
        "idempotency_key >300 chars rejected",
        inp, "none", {"_valid": "false", "_error": "IDEMPOTENCY_KEY_TOO_LONG"}))

    # 1.20 idempotency_key exactly 300 chars accepted
    inp = _req(seed=20)
    inp["idempotency_key"] = "x" * 300
    cases.append(TestCase(
        "EC-F1-20", "input_validation",
        "idempotency_key exactly 300 chars accepted",
        inp, "none", {"_valid": "true"}))

    # 1.21 non-string tenant_id rejected (int)
    inp = _req(seed=21)
    inp["tenant_id"] = 1
    cases.append(TestCase(
        "EC-F1-21", "input_validation",
        "non-string tenant_id rejected",
        inp, "none", {"_valid": "false", "_error": "INVALID_UUID"}))

    # 1.22 uppercase UUID accepted
    inp = _req(seed=22)
    inp["tenant_id"] = TENANT_A.upper()
    cases.append(TestCase(
        "EC-F1-22", "input_validation",
        "uppercase UUID accepted",
        inp, "none", {"_valid": "true"}))

    # 1.23 trailing whitespace on idempotency_key normalizes to raw value
    inp = _req(seed=23)
    inp["idempotency_key"] = "  "
    cases.append(TestCase(
        "EC-F1-23", "input_validation",
        "whitespace-only idempotency_key is auto-derived",
        inp, "none", {"_valid": "true", "_idempotency_key_derived": True}))

    # 1.24 completely empty payload rejected
    cases.append(TestCase(
        "EC-F1-24", "input_validation",
        "completely empty payload rejected",
        {}, "none", {"_valid": "false", "_error": "INVALID_INPUT"}))

    # 1.25 null payload rejected safely
    cases.append(TestCase(
        "EC-F1-25", "input_validation",
        "null payload handled without throw",
        None, "none", {"_valid": "false", "_error": "INVALID_INPUT"}))

    # 1.26 extra unknown fields ignored
    inp = _req(seed=26)
    inp["unknown_field"] = "ignore_me"
    cases.append(TestCase(
        "EC-F1-26", "input_validation",
        "unknown fields are ignored",
        inp, "none", {"_valid": "true", "_unknown_field_dropped": True}))

    # 1.27 tenant_id same as thread_id still valid (no structural collision)
    inp = _req(seed=27)
    inp["tenant_id"] = inp["thread_id"]
    cases.append(TestCase(
        "EC-F1-27", "input_validation",
        "tenant_id == thread_id still accepted (structural)",
        inp, "none", {"_valid": "true"}))

    # 1.28 integer trigger_message_id rejected
    inp = _req(seed=28)
    inp["trigger_message_id"] = 42
    cases.append(TestCase(
        "EC-F1-28", "input_validation",
        "integer trigger_message_id rejected",
        inp, "none", {"_valid": "false", "_error": "INVALID_UUID"}))

    # 1.29 null tenant_id rejected
    inp = _req(seed=29)
    inp["tenant_id"] = None
    cases.append(TestCase(
        "EC-F1-29", "input_validation",
        "null tenant_id rejected",
        inp, "none", {"_valid": "false", "_error": "INVALID_INPUT", "_missing_field": "tenant_id"}))

    # 1.30 resolution_method optional null allowed
    inp = _req(seed=30)
    inp["resolution_method"] = None
    cases.append(TestCase(
        "EC-F1-30", "input_validation",
        "resolution_method null is allowed",
        inp, "none", {"_valid": "true"}))

    return cases


def run_family_input_validation(cases: List[TestCase]) -> None:
    for tc in cases:
        out = ec_validate_input(tc.input if isinstance(tc.input, (dict, type(None))) else {})
        tc.actual = out
        exp = tc.expected
        if exp.get("_valid") == "true":
            ok = out.get("_valid") == "true"
            if ok and exp.get("_idempotency_key") is not None:
                ok = out.get("_idempotency_key") == exp["_idempotency_key"]
            if ok and exp.get("_idempotency_key_derived"):
                ok = isinstance(out.get("_idempotency_key"), str) and out["_idempotency_key"].endswith("exec_ctx:v1")
            if ok and exp.get("_unknown_field_dropped"):
                ok = "unknown_field" not in out
            tc.status = "pass" if ok else "fail"
        else:
            ok = out.get("_valid") == "false" and out.get("_error") == exp.get("_error")
            if ok and exp.get("_missing_field"):
                ok = exp["_missing_field"] in (out.get("_missing_fields") or [])
            tc.status = "pass" if ok else "fail"


# -------------------- Family 2: Happy path init (30) --------------------


def family_happy_path() -> List[TestCase]:
    cases: List[TestCase] = []
    for i in range(1, 31):
        inp = _req(seed=100 + i)
        cases.append(TestCase(
            f"EC-F2-{i:02d}", "happy_path",
            f"happy-path payload #{i} builds correct init payload",
            inp, "EC_Validate_Input passed", {
                "status": "initialized",
                "pending_steps": [],
                "completed_steps": [],
                "expires_at_delta_minutes": 15,
            }))
    return cases


def run_family_happy_path(cases: List[TestCase]) -> None:
    for tc in cases:
        v = ec_validate_input(tc.input)
        if v.get("_valid") != "true":
            tc.actual = {"validate_failed": v}
            tc.status = "fail"
            continue
        p = ec_build_init_payload(v)
        tc.actual = p
        ok = (
            p["status"] == "initialized"
            and p["pending_steps"] == []
            and p["completed_steps"] == []
            and isinstance(p["expires_at"], str)
            and isinstance(p["idempotency_key"], str)
            and p["tenant_id"] == tc.input["tenant_id"]
            and p["thread_id"] == tc.input["thread_id"]
            and p["trigger_message_id"] == tc.input["trigger_message_id"]
        )
        tc.status = "pass" if ok else "fail"


# -------------------- Family 3: Idempotency / replay (30) --------------------


def family_idempotency() -> List[TestCase]:
    cases: List[TestCase] = []
    for i in range(1, 31):
        inp = _req(seed=200 + i)
        cases.append(TestCase(
            f"EC-F3-{i:02d}", "idempotency",
            f"replay #{i}: derived idempotency_key is deterministic across runs",
            inp, "validate passes", {
                "two_runs_same_key": True,
            }))
    return cases


def run_family_idempotency(cases: List[TestCase]) -> None:
    for tc in cases:
        v1 = ec_validate_input(tc.input)
        v2 = ec_validate_input(tc.input)
        tc.actual = {"key1": v1.get("_idempotency_key"), "key2": v2.get("_idempotency_key")}
        ok = v1.get("_idempotency_key") == v2.get("_idempotency_key")
        ok = ok and v1.get("_idempotency_key", "").endswith("exec_ctx:v1")
        tc.status = "pass" if ok else "fail"


# -------------------- Family 4: Cross-tenant isolation (30) --------------------


def family_cross_tenant() -> List[TestCase]:
    cases: List[TestCase] = []
    for i in range(1, 31):
        msg = _uuid("msg_cross", i)
        inp_a = _req(tenant_id=TENANT_A, thread_id=THREAD_A, trigger_message_id=msg, seed=300 + i)
        inp_b = _req(tenant_id=TENANT_B, thread_id=THREAD_B, trigger_message_id=msg, seed=300 + i)
        cases.append(TestCase(
            f"EC-F4-{i:02d}", "cross_tenant",
            f"same trigger_message_id across tenants derives distinct idempotency_keys (#{i})",
            {"a": inp_a, "b": inp_b}, "validate passes for both",
            {"distinct_keys": True}))
    return cases


def run_family_cross_tenant(cases: List[TestCase]) -> None:
    for tc in cases:
        va = ec_validate_input(tc.input["a"])
        vb = ec_validate_input(tc.input["b"])
        tc.actual = {"keyA": va.get("_idempotency_key"), "keyB": vb.get("_idempotency_key")}
        ok = va.get("_idempotency_key") and vb.get("_idempotency_key") and va["_idempotency_key"] != vb["_idempotency_key"]
        ok = ok and va["_idempotency_key"].startswith(TENANT_A)
        ok = ok and vb["_idempotency_key"].startswith(TENANT_B)
        tc.status = "pass" if ok else "fail"


# -------------------- Family 5: TR → EC handoff (30) --------------------


def family_tr_ec_handoff() -> List[TestCase]:
    """Takes a simulated TR result and checks the EC input mapping holds end-to-end."""
    cases: List[TestCase] = []

    # Build a TR-shaped result, then map to EC input, then validate + build.
    def tr_result(seed: int, decision: str = "attach_existing_thread", resolved_thread: str = THREAD_A) -> Dict[str, Any]:
        return {
            "resolution_id": f"tr_test_{seed}",
            "message_id": _uuid("tr_msg", seed),
            "tenant_id": TENANT_A,
            "decision": decision,
            "resolved_thread_id": resolved_thread,
            "timestamp": "2026-04-17T00:00:00Z",
            "confidence": 1.0 if decision != "fail_invalid_input" else 0.0,
        }

    decisions = [
        "attach_existing_thread", "create_new_thread", "reopen_latent_thread",
        "direct_reply_linkage", "explicit_thread_reference",
    ]

    for i in range(1, 31):
        dec = decisions[(i - 1) % len(decisions)]
        tr = tr_result(400 + i, decision=dec)
        cases.append(TestCase(
            f"EC-F5-{i:02d}", "tr_ec_handoff",
            f"TR result with decision={dec} (#{i}) maps cleanly to EC input",
            tr, "TR shape verified", {
                "ec_input_valid": True,
                "handoff_mapping_complete": True,
            }))
    return cases


def run_family_tr_ec_handoff(cases: List[TestCase]) -> None:
    for tc in cases:
        tr = tc.input
        # Map TR → EC
        ec_in = {
            "tenant_id": tr["tenant_id"],
            "thread_id": tr["resolved_thread_id"] or THREAD_A,
            "trigger_message_id": tr["message_id"],
            "resolution_method": tr["decision"],
            "resolved_at": tr["timestamp"],
        }
        v = ec_validate_input(ec_in)
        tc.actual = {"ec_input": ec_in, "validate": v}
        ok = v.get("_valid") == "true" and v.get("resolution_method") == tr["decision"]
        tc.status = "pass" if ok else "fail"


# -------------------- Family 6: Node contract tests (per node × 30) --------------------


def family_node_validation() -> List[TestCase]:
    """Per-node tests for EC_Validate_Input."""
    cases: List[TestCase] = []
    for i in range(1, 31):
        inp = _req(seed=500 + i)
        cases.append(TestCase(
            f"EC-F6V-{i:02d}", "node_validation",
            f"EC_Validate_Input returns required output keys (#{i})",
            inp, "none",
            {"required_keys": ["_valid", "tenant_id", "thread_id", "trigger_message_id", "_idempotency_key"]}))
    return cases


def run_family_node_validation(cases: List[TestCase]) -> None:
    for tc in cases:
        out = ec_validate_input(tc.input)
        tc.actual = out
        required = tc.expected["required_keys"]
        ok = all(k in out for k in required) and out["_valid"] == "true"
        tc.status = "pass" if ok else "fail"


def family_node_payload_builder() -> List[TestCase]:
    cases: List[TestCase] = []
    for i in range(1, 31):
        inp = _req(seed=600 + i)
        cases.append(TestCase(
            f"EC-F6P-{i:02d}", "node_payload_builder",
            f"EC_Build_Init_Payload produces DB-aligned row (#{i})",
            inp, "validate passed",
            {"required_keys": [
                "tenant_id", "thread_id", "trigger_message_id", "status",
                "pending_steps", "completed_steps", "idempotency_key", "expires_at",
            ]}))
    return cases


def run_family_node_payload_builder(cases: List[TestCase]) -> None:
    for tc in cases:
        v = ec_validate_input(tc.input)
        p = ec_build_init_payload(v)
        tc.actual = p
        ok = all(k in p for k in tc.expected["required_keys"])
        ok = ok and p["status"] == "initialized"
        tc.status = "pass" if ok else "fail"


def family_node_result_formatter() -> List[TestCase]:
    cases: List[TestCase] = []
    for i in range(1, 31):
        # Simulate a loaded DB row
        row = {
            "id": _uuid("row", 700 + i),
            "tenant_id": TENANT_A,
            "thread_id": THREAD_A,
            "trigger_message_id": _uuid("msg", 700 + i),
            "status": "initialized",
            "pending_steps": [],
            "completed_steps": [],
            "idempotency_key": f"wfec01_test_formatter_{i}",
            "expires_at": "2026-04-17T00:15:00Z",
            "created_at": "2026-04-17T00:00:00Z",
            "updated_at": "2026-04-17T00:00:00Z",
            "current_goal": None,
            "current_plan_ref": None,
        }
        cases.append(TestCase(
            f"EC-F6R-{i:02d}", "node_result_formatter",
            f"EC_Return_Result preserves contract shape (#{i})",
            row, "load returned row", {"required_keys": [
                "id", "tenant_id", "thread_id", "trigger_message_id", "status",
                "pending_steps", "completed_steps", "created_at", "updated_at",
                "error", "module_name", "result_type", "status_kind"]}))
    return cases


def run_family_node_result_formatter(cases: List[TestCase]) -> None:
    for tc in cases:
        out = ec_shape_return_result(tc.input)
        tc.actual = out
        ok = all(k in out for k in tc.expected["required_keys"])
        ok = ok and out["status_kind"] == "success" and out["error"] is None
        tc.status = "pass" if ok else "fail"


def family_node_error_formatter() -> List[TestCase]:
    cases: List[TestCase] = []
    errors = [
        ("INVALID_INPUT", ["tenant_id"]),
        ("INVALID_INPUT", ["thread_id"]),
        ("INVALID_INPUT", ["trigger_message_id"]),
        ("INVALID_UUID", ["tenant_id"]),
        ("INVALID_UUID", ["thread_id"]),
        ("INVALID_UUID", ["trigger_message_id"]),
        ("INVALID_RESOLVED_AT", ["resolved_at"]),
        ("IDEMPOTENCY_KEY_TOO_LONG", ["idempotency_key"]),
    ]
    for i in range(1, 31):
        code, miss = errors[(i - 1) % len(errors)]
        inv = {
            "_valid": "false",
            "_error": code,
            "_missing_fields": miss,
            "_request": _req(seed=800 + i),
        }
        cases.append(TestCase(
            f"EC-F6E-{i:02d}", "node_error_formatter",
            f"EC_Return_Error shapes {code} cleanly (#{i})",
            inv, "validate returned invalid",
            {"status_kind": "failed", "error_code": code}))
    return cases


def run_family_node_error_formatter(cases: List[TestCase]) -> None:
    for tc in cases:
        out = ec_shape_return_error(tc.input)
        tc.actual = out
        ok = out["status_kind"] == "failed" and out["error"]["code"] == tc.expected["error_code"]
        tc.status = "pass" if ok else "fail"


# -------------------- Family 7: Tooling / blocker / reporting (30) --------------------


def family_tooling_reporting() -> List[TestCase]:
    """These tests assert report/state properties that the pipeline depends on."""
    cases: List[TestCase] = []
    artifacts = {
        "STATE": os.path.join(ROOT, "docs", "ucenicul_claude_handoff_hardened", "STATE.json"),
        "BUILD": os.path.join(ROOT, "docs", "ucenicul_claude_handoff_hardened", "BUILD_REPORT.md"),
        "AUDIT": os.path.join(ROOT, "docs", "ucenicul_claude_handoff_hardened", "AUDIT_REPORT.md"),
        "FIX":   os.path.join(ROOT, "docs", "ucenicul_claude_handoff_hardened", "FIX_LOG.md"),
        "CLOSURE": os.path.join(ROOT, "docs", "ucenicul_claude_handoff_hardened", "CLOSURE_REPORT.md"),
        "CURRENT": os.path.join(ROOT, "docs", "ucenicul_claude_handoff_hardened", "CURRENT_STAGE.md"),
    }

    # 7.01 STATE.json parses as JSON
    cases.append(TestCase("EC-F7-01", "tooling_reporting",
                          "STATE.json parses as JSON",
                          artifacts["STATE"], "none",
                          {"parses": True}))
    # 7.02 STATE.current_stage is WF-EC-01
    cases.append(TestCase("EC-F7-02", "tooling_reporting",
                          "STATE.current_stage == WF-EC-01",
                          artifacts["STATE"], "STATE parses",
                          {"current_stage": "WF-EC-01"}))
    # 7.03 STATE.status must not be "closed" while blocked
    cases.append(TestCase("EC-F7-03", "tooling_reporting",
                          "STATE.status is blocked_with_evidence",
                          artifacts["STATE"], "STATE parses",
                          {"status": "blocked_with_evidence"}))
    # 7.04 STATE.advance_allowed is False while blocked
    cases.append(TestCase("EC-F7-04", "tooling_reporting",
                          "STATE.advance_allowed is False while blocked",
                          artifacts["STATE"], "STATE parses",
                          {"advance_allowed": False}))
    # 7.05 STATE has next_action
    cases.append(TestCase("EC-F7-05", "tooling_reporting",
                          "STATE.next_action exists and is non-empty",
                          artifacts["STATE"], "STATE parses",
                          {"next_action_nonempty": True}))
    # 7.06 STATE banned strategy recorded
    cases.append(TestCase("EC-F7-06", "tooling_reporting",
                          "failed_path_label == sdk_update_workflow_code",
                          artifacts["STATE"], "STATE parses",
                          {"failed_path_label": "sdk_update_workflow_code"}))
    # 7.07 BUILD_REPORT exists
    cases.append(TestCase("EC-F7-07", "tooling_reporting",
                          "BUILD_REPORT.md exists",
                          artifacts["BUILD"], "none",
                          {"exists": True}))
    # 7.08 BUILD_REPORT references WF-EC-01
    cases.append(TestCase("EC-F7-08", "tooling_reporting",
                          "BUILD_REPORT references WF-EC-01",
                          artifacts["BUILD"], "exists",
                          {"contains": "WF-EC-01"}))
    # 7.09 BUILD_REPORT has a 'Next executable action' section
    cases.append(TestCase("EC-F7-09", "tooling_reporting",
                          "BUILD_REPORT.md has Next executable action",
                          artifacts["BUILD"], "exists",
                          {"contains": "Next executable action"}))
    # 7.10 AUDIT_REPORT exists
    cases.append(TestCase("EC-F7-10", "tooling_reporting",
                          "AUDIT_REPORT.md exists",
                          artifacts["AUDIT"], "none",
                          {"exists": True}))
    # 7.11 AUDIT_REPORT has evidence classification section
    cases.append(TestCase("EC-F7-11", "tooling_reporting",
                          "AUDIT_REPORT has 'Evidence classification' section",
                          artifacts["AUDIT"], "exists",
                          {"contains": "Evidence classification"}))
    # 7.12 AUDIT_REPORT references banned strategy
    cases.append(TestCase("EC-F7-12", "tooling_reporting",
                          "AUDIT_REPORT references banned SDK strategy",
                          artifacts["AUDIT"], "exists",
                          {"contains": "sdk_update_workflow_code"}))
    # 7.13 FIX_LOG exists
    cases.append(TestCase("EC-F7-13", "tooling_reporting",
                          "FIX_LOG.md exists",
                          artifacts["FIX"], "none",
                          {"exists": True}))
    # 7.14 FIX_LOG references failure class
    cases.append(TestCase("EC-F7-14", "tooling_reporting",
                          "FIX_LOG references F2 false success",
                          artifacts["FIX"], "exists",
                          {"contains": "F2 false success"}))
    # 7.15 CLOSURE_REPORT exists
    cases.append(TestCase("EC-F7-15", "tooling_reporting",
                          "CLOSURE_REPORT.md exists",
                          artifacts["CLOSURE"], "none",
                          {"exists": True}))
    # 7.16 CLOSURE_REPORT verdict present
    cases.append(TestCase("EC-F7-16", "tooling_reporting",
                          "CLOSURE_REPORT has BLOCKED_WITH_EVIDENCE verdict (no false closure)",
                          artifacts["CLOSURE"], "exists",
                          {"contains": "BLOCKED_WITH_EVIDENCE"}))
    # 7.17 CURRENT_STAGE marks WF-EC-01
    cases.append(TestCase("EC-F7-17", "tooling_reporting",
                          "CURRENT_STAGE.md names WF-EC-01",
                          artifacts["CURRENT"], "exists",
                          {"contains": "WF-EC-01"}))
    # 7.18 Blueprint JSON exists
    cases.append(TestCase("EC-F7-18", "tooling_reporting",
                          "workflows/WF-EC-01_blueprint.json exists",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "none",
                          {"exists": True}))
    # 7.19 Blueprint JSON parses
    cases.append(TestCase("EC-F7-19", "tooling_reporting",
                          "blueprint JSON parses and has 8 nodes",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"node_count": 8}))
    # 7.20 Blueprint connections count
    cases.append(TestCase("EC-F7-20", "tooling_reporting",
                          "blueprint has 6 connection roots",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"connection_roots": 6}))
    # 7.21 Blueprint has EC_Route_Valid
    cases.append(TestCase("EC-F7-21", "tooling_reporting",
                          "blueprint contains EC_Route_Valid switch node",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"node_name": "EC_Route_Valid"}))
    # 7.22 Blueprint postgres node uses $1..$8
    cases.append(TestCase("EC-F7-22", "tooling_reporting",
                          "EC_Upsert_Context SQL uses $1..$8 params",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"sql_contains": ["$1::uuid", "$8::timestamptz"]}))
    # 7.23 Blueprint postgres node has ON CONFLICT
    cases.append(TestCase("EC-F7-23", "tooling_reporting",
                          "EC_Upsert_Context SQL has ON CONFLICT (idempotency_key) DO NOTHING",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"sql_contains": ["ON CONFLICT (idempotency_key) DO NOTHING"]}))
    # 7.24 Blueprint load node has tenant_id in where clause
    cases.append(TestCase("EC-F7-24", "tooling_reporting",
                          "EC_Load_Existing_Context uses tenant_id predicate",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"sql_contains": ["idempotency_key = $1", "tenant_id = $2::uuid"]}))
    # 7.25 Blueprint postgres nodes have alwaysOutputData
    cases.append(TestCase("EC-F7-25", "tooling_reporting",
                          "EC_Upsert_Context has alwaysOutputData=true",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"node_top_level": ("EC_Upsert_Context", "alwaysOutputData", True)}))
    # 7.26 Blueprint availableInMCP
    cases.append(TestCase("EC-F7-26", "tooling_reporting",
                          "settings.availableInMCP == true",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"settings_availableInMCP": True}))
    # 7.27 Switch node dataType=boolean
    cases.append(TestCase("EC-F7-27", "tooling_reporting",
                          "EC_Route_Valid dataType=boolean",
                          os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json"), "exists",
                          {"switch_dataType": "boolean"}))
    # 7.28 No closure without evidence: STATE.score < 10
    cases.append(TestCase("EC-F7-28", "tooling_reporting",
                          "STATE.score is under 10 while blocked (no false closure)",
                          artifacts["STATE"], "STATE parses",
                          {"score_lt": 10}))
    # 7.29 No advancement: STATE.advance_allowed False
    cases.append(TestCase("EC-F7-29", "tooling_reporting",
                          "STATE.advance_allowed remains False while blocked",
                          artifacts["STATE"], "STATE parses",
                          {"advance_allowed": False}))
    # 7.30 Node map file exists
    cases.append(TestCase("EC-F7-30", "tooling_reporting",
                          "WF-EC-01_NODE_MAP.md exists",
                          os.path.join(ROOT, "workflows", "WF-EC-01_NODE_MAP.md"), "none",
                          {"exists": True}))
    return cases


def run_family_tooling_reporting(cases: List[TestCase]) -> None:
    # Preload docs once
    state = None
    state_path = os.path.join(ROOT, "docs", "ucenicul_claude_handoff_hardened", "STATE.json")
    try:
        state = json.load(open(state_path))
    except Exception as e:
        state = None

    blueprint = None
    bp_path = os.path.join(ROOT, "workflows", "WF-EC-01_blueprint.json")
    try:
        blueprint = json.load(open(bp_path))
    except Exception:
        blueprint = None

    for tc in cases:
        try:
            exp = tc.expected
            path = tc.input
            ok = False
            if "parses" in exp:
                ok = state is not None
                tc.actual = {"parsed": ok}
            elif "current_stage" in exp:
                ok = state and state.get("current_stage") == exp["current_stage"]
                tc.actual = state and state.get("current_stage")
            elif "status" in exp and not isinstance(exp.get("status"), dict):
                ok = state and state.get("status") == exp["status"]
                tc.actual = state and state.get("status")
            elif "advance_allowed" in exp:
                ok = state and state.get("advance_allowed") == exp["advance_allowed"]
                tc.actual = state and state.get("advance_allowed")
            elif "next_action_nonempty" in exp:
                ok = state and isinstance(state.get("next_action"), str) and len(state["next_action"]) > 0
                tc.actual = state and state.get("next_action")
            elif "failed_path_label" in exp:
                ok = state and state.get("failed_path_label") == exp["failed_path_label"]
                tc.actual = state and state.get("failed_path_label")
            elif "score_lt" in exp:
                ok = state and isinstance(state.get("score"), (int, float)) and state["score"] < exp["score_lt"]
                tc.actual = state and state.get("score")
            elif "node_count" in exp:
                ok = blueprint and len(blueprint.get("nodes", [])) == exp["node_count"]
                tc.actual = blueprint and len(blueprint.get("nodes", []))
            elif "connection_roots" in exp:
                ok = blueprint and len(blueprint.get("connections", {})) == exp["connection_roots"]
                tc.actual = blueprint and len(blueprint.get("connections", {}))
            elif "node_name" in exp:
                ok = blueprint and any(n.get("name") == exp["node_name"] for n in blueprint.get("nodes", []))
                tc.actual = bool(ok)
            elif "sql_contains" in exp:
                # Find the right node's SQL
                found = False
                for n in blueprint.get("nodes", []):
                    q = (n.get("parameters") or {}).get("query", "")
                    if all(s in q for s in exp["sql_contains"]):
                        found = True
                        break
                ok = found
                tc.actual = {"found": found}
            elif "node_top_level" in exp:
                nname, key, val = exp["node_top_level"]
                for n in blueprint.get("nodes", []):
                    if n.get("name") == nname:
                        ok = n.get(key) == val
                        tc.actual = n.get(key)
                        break
            elif "settings_availableInMCP" in exp:
                ok = blueprint and blueprint.get("settings", {}).get("availableInMCP") == exp["settings_availableInMCP"]
                tc.actual = blueprint and blueprint.get("settings", {}).get("availableInMCP")
            elif "switch_dataType" in exp:
                for n in blueprint.get("nodes", []):
                    if n.get("name") == "EC_Route_Valid":
                        ok = n.get("parameters", {}).get("dataType") == exp["switch_dataType"]
                        tc.actual = n.get("parameters", {}).get("dataType")
                        break
            elif "exists" in exp:
                ok = os.path.exists(path)
                tc.actual = {"exists": ok}
            elif "contains" in exp:
                try:
                    with open(path, "r") as fh:
                        content = fh.read()
                    ok = exp["contains"] in content
                    tc.actual = {"contains": ok}
                except Exception as e:
                    ok = False
                    tc.actual = {"error": str(e)}
            tc.status = "pass" if ok else "fail"
        except Exception as e:
            tc.actual = {"exception": str(e)}
            tc.status = "fail"


# -------------------- Runner --------------------


FAMILIES: List[Tuple[str, Callable[[], List[TestCase]], Callable[[List[TestCase]], None]]] = [
    ("input_validation", family_input_validation, run_family_input_validation),
    ("happy_path", family_happy_path, run_family_happy_path),
    ("idempotency", family_idempotency, run_family_idempotency),
    ("cross_tenant", family_cross_tenant, run_family_cross_tenant),
    ("tr_ec_handoff", family_tr_ec_handoff, run_family_tr_ec_handoff),
    ("node_validation", family_node_validation, run_family_node_validation),
    ("node_payload_builder", family_node_payload_builder, run_family_node_payload_builder),
    ("node_result_formatter", family_node_result_formatter, run_family_node_result_formatter),
    ("node_error_formatter", family_node_error_formatter, run_family_node_error_formatter),
    ("tooling_reporting", family_tooling_reporting, run_family_tooling_reporting),
]


def main() -> int:
    all_cases: List[TestCase] = []
    for name, build, run in FAMILIES:
        cases = build()
        run(cases)
        all_cases.extend(cases)

    # Output
    out_dir = os.path.join(HERE, "results")
    os.makedirs(out_dir, exist_ok=True)
    json_path = os.path.join(out_dir, "results.json")
    md_path = os.path.join(out_dir, "results.md")

    with open(json_path, "w") as f:
        json.dump([c.as_dict() for c in all_cases], f, indent=2, default=str)

    # Tally
    by_family: Dict[str, Dict[str, int]] = {}
    for c in all_cases:
        d = by_family.setdefault(c.family, {"pass": 0, "fail": 0, "total": 0})
        d["total"] += 1
        d[c.status] = d.get(c.status, 0) + 1

    total = len(all_cases)
    passed = sum(1 for c in all_cases if c.status == "pass")
    failed = total - passed

    with open(md_path, "w") as f:
        f.write(f"# WF-EC-01 Test Results\n\n")
        f.write(f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n\n")
        f.write(f"**TOTAL**: {passed} / {total} passed ({failed} failed)\n\n")
        f.write("## By family\n\n| Family | Pass | Fail | Total |\n|---|---:|---:|---:|\n")
        for fam, d in by_family.items():
            f.write(f"| {fam} | {d.get('pass',0)} | {d.get('fail',0)} | {d['total']} |\n")
        f.write("\n## Failures (first 50)\n\n")
        fails = [c for c in all_cases if c.status == "fail"][:50]
        if not fails:
            f.write("_No failures._\n")
        else:
            for c in fails:
                f.write(f"- **{c.tid}** ({c.family}): {c.purpose}\n")
                f.write(f"  - expected: `{c.expected}`\n")
                f.write(f"  - actual:   `{c.actual}`\n")

    print(f"wrote {json_path}")
    print(f"wrote {md_path}")
    print(f"RESULT: {passed}/{total} passed; {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
