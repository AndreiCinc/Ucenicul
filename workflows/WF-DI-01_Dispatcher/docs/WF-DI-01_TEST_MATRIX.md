# WF-DI-01_TEST_MATRIX

Test-vector enumeration for WF-DI-01 Dispatcher. Derived from `reports/STATE__WF-DI-01.json` (family_breakdown) and `tests/test_families.py`.

All vectors have been executed and closed at 10/10. Live proofs: execs 716–720 (V1–V5), V6 (DB drift zero).

---

## Vector families (V1–V6 live proof + 13 script families)

### Live runtime vectors

#### V1: Happy Path
- **Family**: `family_happy_path` (50 tests)
- **Purpose**: Validate nominal dispatcher operation with valid plan input, context match, and dependency grouping.
- **Input**: Good plan with 2–3 steps, mixed parallel/sequential execution modes, valid module names, initialized execution context row.
- **Expected output**: `DI_Return_Result` with `status_kind: "success"`, `result_type: "dispatch"`, `allowed_next_stage: "WF-ME-01"`, non-empty `ready_groups`.
- **Oracle type**: Exact output match + schema match + routing invariant (allowed_next_stage == WF-ME-01).
- **Live execution**: exec 716, PASS.
- **DB side-effect**: Zero writes to `public.execution_contexts`.

#### V2: Invalid Handoff Input
- **Family**: `family_input_validation` (50 tests)
- **Purpose**: Reject malformed plan envelopes at entry validation stage.
- **Input**: Null, array, missing required fields (goal, payload, status_kind), wrong status_kind, dispatcher_input gate flags incorrect.
- **Expected output**: `DI_Return_Error` with `error.code: "INVALID_HANDOFF_INPUT"`, missing_fields array populated.
- **Oracle type**: Exact error code match.
- **Live execution**: exec 717, PASS.
- **DB side-effect**: Zero writes.

#### V3: Invalid Plan
- **Family**: `family_invalid_plan` (50 tests)
- **Purpose**: Reject structurally or semantically invalid plans (empty steps, bad execution_mode, missing step fields, wrong step status, dispatcher_input flags).
- **Input**: Valid envelope but malformed steps array: empty, execution_mode not in {sequential, parallel}, missing module_name, status != pending, dispatcher_input flags != expected.
- **Expected output**: `DI_Return_Error` with `error.code: "INVALID_PLAN"`.
- **Oracle type**: Exact error code match.
- **Live execution**: exec 718, PASS.
- **DB side-effect**: Zero writes.

#### V4: Replay Idempotency
- **Family**: `family_replay_idempotency` (50 tests)
- **Purpose**: Ensure deterministic `dispatch_id` and per-step idempotency keys on replay.
- **Input**: Same good plan (V1 input) executed twice.
- **Expected output**: `dispatch_id` and per-step idempotency keys identical on second execution.
- **Oracle type**: Byte-identical output match on replay.
- **Live execution**: exec 719, PASS (dispatch_id matches V1).
- **DB side-effect**: Zero writes.

#### V5: Cross-Tenant Isolation
- **Family**: `family_cross_tenant_isolation` (50 tests)
- **Purpose**: Fail-closed when execution context does not match tenant_id / thread_id / execution_id of input plan.
- **Input**: Good plan with tenant_id A, but execution context row has tenant_id B (or thread_id/execution_id mismatch, or row missing entirely).
- **Expected output**: `DI_Return_Error` with `error.code: "CONTEXT_MISMATCH"`.
- **Oracle type**: Exact error code match.
- **Live execution**: exec 720, PASS.
- **DB side-effect**: Zero writes (V6 hash identical pre/post across V1–V5).

#### V6: DB Drift
- **Family**: Database integrity check.
- **Purpose**: Verify dispatcher reads only, performs zero writes.
- **Input**: Sequence V1–V5 executions.
- **Expected output**: `public.execution_contexts` row count and hash identical pre/post.
- **Oracle type**: State transition (DB snapshot hash).
- **Pre-test hash**: `985d6ef34955abe59117ce7d6ff76f12` (2 rows).
- **Post-test hash**: `985d6ef34955abe59117ce7d6ff76f12` (2 rows).
- **DB side-effect**: PASS — zero drift.

---

### Script-level test families (13 families, 650 tests total)

All 13 families are executed by the harness `workflows/tests/di/test_families.py`. Each family runs 50 iterations.

| Family | Purpose | Input characteristics | Expected behavior | Oracle |
|---|---|---|---|---|
| `input_validation` | Validate plan envelope structure and required fields | Null, array, missing top-level fields, bad status_kind, dispatcher_input gate flags | `validate_plan_result` returns `valid=False` with correct error code and missing_fields | Code match: `INVALID_HANDOFF_INPUT` |
| `happy_path` | Nominal dispatcher flow with valid plan and context | 3-step plan, mixed execution modes, all modules in registry, context row present and matches | `run_full_pipeline` returns success dispatch envelope with `allowed_next_stage: "WF-ME-01"` and non-empty ready_groups | Schema match + status_kind/result_type/next_stage assertions |
| `invalid_plan` | Reject structurally invalid plans (empty steps, bad execution_mode, missing fields, wrong status, dispatcher_input) | Empty steps, invalid execution_mode, missing step fields, status != pending, dispatcher_input flags incorrect | `run_full_pipeline` returns error envelope with code `INVALID_PLAN` or `INVALID_HANDOFF_INPUT` | Code match |
| `step_contract_validation` | Validate required step fields and dependency references | Steps with missing fields (step_id, module_name, purpose, inputs, depends_on, execution_mode, expected_outputs, replan_if, failure_policy, status) | `validate_plan_result` or `build_ready_steps` returns error with missing_fields list | Code match + missing_fields populated |
| `dependency_ordering` | Ensure all `depends_on` references exist in plan steps | Steps with unknown dependencies, circular dependencies (if applicable) | `build_ready_steps` returns error code `INVALID_PLAN` with missing_fields pointing to unknown step_ids | Code match + error message clarity |
| `parallel_dispatch_eligibility` | Correctly route parallel-eligible steps into group:parallel:001 | Steps with execution_mode=parallel and empty depends_on | `build_ready_steps` groups them together in `ready_parallel` | Group structure match (group_id, execution_mode, step_ids) |
| `replay_idempotency` | Ensure dispatch_id and per-step idempotency keys are deterministic | Same plan input executed multiple times | `dispatch_id` == `f"dispatch:{plan_id}:v1"` on every run; per-step key == `f"{idempotency_key}:{step_id}:dispatch:v1"` | Byte-identical output on replay |
| `cross_tenant_isolation` | Fail-closed on tenant/thread/execution_id mismatch | Execution context row with different tenant_id, thread_id, or execution_id; or row missing | `verify_context_match` returns `ok=False` with code `CONTEXT_MISMATCH` | Code match + error message includes mismatched field |
| `wf_pl_to_wf_di_handoff` | Validate WF-PL-01 → WF-DI-01 envelope contract | Plan envelope from `good_plan()` fixture with all required fields, correct dispatcher_input flags | `validate_plan_result` + `extract_dispatch_input` extract all fields correctly for downstream use | Schema match + field presence assertions |
| `reporting_and_tooling_contract` | Ensure error payloads include missing_fields for tooling error reporting | Invalid plans with various missing fields | `build_error_payload` includes non-empty missing_fields array in error envelope | Schema match + missing_fields array non-empty and populated |
| `module_registry_resolution` | Verify MODULE_REGISTRY lookup and unknown-module rejection | Steps with module_name in registry, and steps with unknown module_name | `load_module_registry` returns static registry; `build_ready_steps` rejects unknown modules | Schema match (registry structure) + UNKNOWN_MODULE error code |
| `error_payload_builder` | Validate error envelope structure (all codes, missing_fields) | Various error paths triggered by input validation, context verification, module resolution | `build_error_payload` returns envelope with status_kind=failed, result_type=error, error.code, error.message, error.missing_fields | Schema match + all required error fields present |
| `blueprint_structure` | Verify node count, connection count, trigger types, routing keys | Statically inspect workflow JSON (if applicable in test harness) | 13 nodes, 13 connections, both triggers, _valid and _context_ready routing keys preserved | Count match + node/edge name match + routing key presence |

---

## Test execution summary

- **Total test vectors**: V1–V6 (live) + 13 families (script-level) = 19 logical test families.
- **Total test cases**: 6 (live proof vectors) + 13 × 50 (script families) = 656 test cases.
- **Actual count**: 650 (script families, V1–V6 are one-off live executions, not iterated 50×).
- **Script-level pass rate**: 650 / 650 (100%).
- **Live runtime pass rate**: 6 / 6 (100%).
- **Overall**: 10 / 10 closure score.

---

## Test execution environment

- **Harness**: `workflows/tests/di/test_families.py` (276 lines).
- **Fixtures**: `sql/10_fixtures_create.sql`, `sql/11_fixtures_cleanup.sql`.
- **Probes**: `sql/20_read_path_probe.sql` (read-path V6), no write probes (dispatcher is read-only).
- **Live shell**: `wf-di-01-source-pack-v1.1-chat-adapter-fix`, workflowId `abqYINcXr3JAhGGk`.

---

## Known limitations / not documented in on-disk evidence

- Timeout / performance benchmarks: not documented.
- Stress test (10k+ plans): not documented.
- Concurrent execution contention: not documented.
- Specific SQL index utilization: not documented.
