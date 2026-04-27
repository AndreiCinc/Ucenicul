# WF-RA-01_TEST_MATRIX

Live workflow: id `5RcNLtxNjAHJsZPE`, versionId `8eeb0bd0-477c-40a3-839a-8f76415bc962`, active.
Live executions referenced: `721` (placeholder iteration, superseded), `734` (real canonical JS, V1+V2), `735` (V1+V2 Cycle 4 re-verification), `736` (V3 happy E2E), `737` (V5 context mismatch E2E), `738` (V4 malformed batch E2E).

## V1 — Shell integrity — **LIVE PASS** (executions 734, 736, 737, 738)
- node count = 14 (re-read from live n8n API)
- connection count = 14 (main-edge count across the graph)
- triggers present: `RA_Input` (executeWorkflowTrigger), `RA_Manual_Test_Trigger` (manualTrigger)
- switch keys `_valid` / `_context_ready`
- `RA_Load_Execution_Context.alwaysOutputData = true`
- Postgres credential binding retained and intentional (`z9nKgToNWvIW7P8f` / "Postgres account 2")
- Postgres `options.queryReplacement` binds `$1` and `$2` from `$json._envelope.execution_context_id` and `tenant_id`
- 9 Code nodes all carry canonical JS translated from `ra_logic.py` (no placeholders)

## V2 — Invalid aggregation input — **LIVE PASS** (execution 734)
- missing top-level fields — covered: empty `{}` input observed to emit canonical `INVALID_AGGREGATION_INPUT` with missing fields `["status_kind","result_type","execution_context_id","thread_id","tenant_id","aggregation_input"]`, routed through `RA_Route_Valid` fallback to `RA_Return_Error`
- wrong `result_type` — covered off-node by `input_validation` family (50/50)
- missing `aggregation_input` — covered live by empty input run; off-node by `input_validation`
- invalid guard flags — covered off-node by `guard_flag_enforcement` family (50/50)

## V3 — Happy path — **LIVE PASS E2E** (execution 736)
- SQL read path: **LIVE PASS** — `RA_Load_Execution_Context` returned 1 row with all 8 expected columns for fixture `id=33333333-…-3333 / tenant_id=44444444-…-4444`
- full happy branch: `Manual_Test_Trigger → Validate_Module_Batch (_valid=true) → Route_Valid → Load_Execution_Context → Verify_Context_Match (_context_ready=true) → Route_Context_Ready → Build_Aggregation_Input → Aggregate_Module_Results → Build_Downstream_Envelope → Return_Result`
- canonical output at `RA_Return_Result`: `status_kind=success`, `result_type=aggregated_result`, `aggregated_result.status=success`, `per_status_counts={success:1, partial:0, failed:0, no_action:0}`, `module_names=['mem']`, `expected_step_ids=['s1']`, `returned_step_ids=['s1']`, `allowed_next_stage=WF-SU-01`, `state_update_allowed=true`, `response_generation_allowed=false`, `domain_writes_performed=false`, `idempotency_key=aggregate:33333333-…-3333`
- single success module_result — off-node `happy_path_single` family (50/50)
- multiple parallel success module_results — off-node `happy_path_parallel` family (50/50)
- mixed success + no_action — off-node `partial_status_rollup` + `no_action_rollup` (100/100)
- flattened actions/artifacts preserved — off-node `happy_path_parallel` + `reporting_and_tooling_contract` (100/100)

## V4 — Malformed or incomplete module batch — **LIVE PASS E2E** (execution 738)
- duplicate step ids — **LIVE PASS** — envelope with two `module_results` both carrying `step_id="s1"` → `RA_Validate_Module_Batch` emits canonical `DUPLICATE_STEP_IDS` with `details.step_id="s1"`, routed through `RA_Route_Valid` fallback to `RA_Return_Error`
- missing expected step coverage — off-node `step_coverage_validation` (50/50)
- malformed module_result objects — off-node `input_validation` (50/50)
- empty module_results list — off-node `input_validation` (50/50)

## V5 — Cross-tenant / context mismatch — **LIVE PASS E2E** (execution 737)
- SQL-layer isolation: **LIVE PASS** — same `id`, wrong `tenant_id` returned 0 rows (fail-closed)
- E2E JS mismatch branch: **LIVE PASS** — envelope with `tenant_id=99999999-…-9999` → `Load_Execution_Context` returns 0 rows (alwaysOutputData emits `{}`) → `Verify_Context_Match` sees `hasRow=false` and emits canonical `CONTEXT_MISMATCH` with `details.execution_context_id=33333333-…-3333` and `details.tenant_id=99999999-…-9999`, routed through `RA_Route_Context_Ready` fallback to `RA_Return_Context_Error`
- wrong tenant — off-node `cross_tenant_isolation` (50/50); live E2E by execution 737
- wrong thread — off-node `cross_tenant_isolation` (50/50)
- missing execution_context row — off-node; live by construction (row absent → 0 rows)
- wrong execution_context id — off-node; live by construction

## V6 — DB drift — **LIVE PASS**
- pre/post row counts unchanged across `execution_contexts`, `tasks`, `reminders`, `messages`, `rag_memories`
  - baseline: 2 / 4 / 1 / 5 / 42
  - post-closure (after all 3 E2E runs + fixture cleanup): 2 / 4 / 1 / 5 / 42
  - drift: 0 / 0 / 0 / 0 / 0
- no writes performed (fixture row was inserted and cleaned up within the probe window)
- read-only SQL posture held across all live operations

## Closure status
- Score: **10 / 10**
- Posture: `live_closed`
- Closed: **true**
- Advance to WF-SU-01: **allowed**

## Oracle types per vector

| V | Oracle type(s) | Authoritative observation |
|---|---|---|
| V1 | Schema / shape match | 14 nodes / 14 edges; trigger, switch, Postgres credential bindings per node spec |
| V2 | Exact error code match + routing invariant | `error.code == "INVALID_AGGREGATION_INPUT"` with enumerated `missing_fields` array; routed via `RA_Route_Valid` fallback to `RA_Return_Error` |
| V3 | Exact output match + downstream handoff assertion | `aggregated_result.status`, `per_status_counts`, `allowed_next_stage == "WF-SU-01"`, `state_update_allowed=true`, `response_generation_allowed=false`, `domain_writes_performed=false`, `idempotency_key` format |
| V4 | Exact error code match | `error.code == "DUPLICATE_STEP_IDS"` with `details.step_id` echoed |
| V5 | Exact error code match + routing invariant | `error.code == "CONTEXT_MISMATCH"` with `details.execution_context_id` + `details.tenant_id` echoed; routed via `RA_Route_Context_Ready` fallback to `RA_Return_Context_Error` |
| V6 | DB side-effect assertion (zero drift) | Pre/post row counts on `execution_contexts`, `tasks`, `reminders`, `messages`, `rag_memories`: delta = 0 / 0 / 0 / 0 / 0 |

Off-node harness: 13 families × 50 tests = 650 tests. Exact-output oracle per fixture for success families; exact-error-code oracle for error families.

