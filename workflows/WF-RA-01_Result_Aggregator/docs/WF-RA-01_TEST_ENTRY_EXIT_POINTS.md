# WF-RA-01_TEST_ENTRY_EXIT_POINTS

Derived from `docs/WF-RA-01_NODE_MAP.md` and `docs/WF-RA-01_CONNECTION_MAP.md`.

## Entry points (inputs)

| Node | Purpose | Used in tests? |
|---|---|---|
| `RA_Input` | Canonical Execute Workflow entrypoint from WF-ME-01 or DI-01 fan-in layer. Primary integration test entry. | YES — V1/V2/V3/V4/V5 shell path (live E2E executions 736/737/738) |
| `RA_Manual_Test_Trigger` | Manual-trigger shell path for local authoring and live debugging. Same downstream path as RA_Input. | YES — off-node unit tests + live authoring (Cycle 5 user-assisted pinData closure) |

Both entry points converge on `RA_Validate_Module_Batch` (edges 1, 2 in CONNECTION_MAP). Tests MAY exercise either entry point; oracles are identical.

## Exit points (outputs)

| Node | Emits | Oracle type | Routed by |
|---|---|---|---|
| `RA_Return_Result` | Canonical `aggregated_result` success envelope (§3.a of CONTRACTS) | Schema match + exact-field assertions (`result_type`, `aggregated_result.status`, `per_status_counts`, `module_names`, `expected_step_ids`, `returned_step_ids`, `allowed_next_stage`, `state_update_allowed`, `response_generation_allowed`, `domain_writes_performed`) | Happy path through `RA_Route_Valid._valid` → `RA_Route_Context_Ready._context_ready` → `RA_Build_Downstream_Envelope` |
| `RA_Return_Error` | Canonical `aggregation_error` envelope on invalid batch (§3.b of CONTRACTS) | Schema match + exact `error.code` assertion | Reachable from `RA_Route_Valid.extra` (edges 5) |
| `RA_Return_Context_Error` | Canonical `aggregation_error` envelope on context mismatch (§3.b of CONTRACTS) | Schema match + exact `error.code="CONTEXT_MISMATCH"` assertion | Reachable from `RA_Route_Context_Ready.extra` (edges 9) |

`RA_Status_Summary` (edge 14) emits debug/logging info to `RA_Return_Result` in parallel; not an oracle exit point but available for observability.

## Decision-point taps (intermediate observation points for routing oracles)

| Node | Emits | Observe | Edge(s) | Routing context |
|---|---|---|---|---|
| `RA_Validate_Module_Batch` | Boolean validation result | ok/not-ok state | — | Entry-point guard; if false, route to error; if true, continue |
| `RA_Route_Valid` | Two outputs: valid vs invalid | Output index taken (default `._valid`, fallback `.extra`) | 4, 5 | If validation failed, take edge 5 to `RA_Return_Error`; else edge 4 to `RA_Load_Execution_Context` |
| `RA_Load_Execution_Context` | SQL result set | Row count (0 or 1) | — | If 0 rows, `alwaysOutputData=true` emits `{}` for downstream context check |
| `RA_Verify_Context_Match` | Boolean match decision | hasRow / tenant+thread match | — | If hasRow false or tenant mismatch, emit error |
| `RA_Route_Context_Ready` | context_ready vs context_mismatch | Output index taken (default `._context_ready`, fallback `.extra`) | 8, 9 | If context OK, take edge 8 to `RA_Build_Aggregation_Input`; else edge 9 to `RA_Return_Context_Error` |
| `RA_Aggregate_Module_Results` | Rollup status + flattened arrays | All outputs preserved and routed | 11, 12 | Emit aggregated result to edges 11 and 12 (both fire in parallel) |

## Test harness binding

- Off-node harness: `tests/test_families.py` — 13 families × 50 tests = 650 total (all family names per lines 187–200):
  - `input_validation` — valid envelope shape validation
  - `happy_path_single` — single module_result success aggregation
  - `happy_path_parallel` — multi-module parallel aggregation
  - `partial_status_rollup` — success + partial → partial
  - `failed_status_rollup` — failed + success → partial
  - `no_action_rollup` — all no_action → no_action
  - `cross_tenant_isolation` — tenant_id preservation and verification
  - `replay_idempotency` — deterministic re-execution on same input
  - `step_coverage_validation` — expected_step_ids coverage check
  - `guard_flag_enforcement` — guard flag validation (aggregation_allowed, response_generation_allowed, module_execution_completed, domain_writes_performed)
  - `upstream_me_to_ra_handoff` — downstream-stage signal validation (allowed_next_stage=WF-SU-01, state_update_allowed, response_generation_allowed=false)
  - `sql_contract_validation` — canonical SQL file presence and parameterization audit
  - `reporting_and_tooling_contract` — stage metadata file presence and consistency

- Fixture harness: `sql/10_fixtures_create.sql` + `sql/11_fixtures_cleanup.sql` (fixture row: id=33333333-…-3333, tenant_id=44444444-…-4444, thread_id=55555555-…-5555)

- Probes: `sql/20_read_path_probe.sql` (read-path V6 DB drift audit, pre/post baseline comparison)

## Live E2E test routes (Cycle 5 closure, per TEST_MATRIX.md)

| Test | Execution | Entry point | Decision path | Exit point | Observable |
|---|---|---|---|---|---|
| V3 Happy path | 736 | `RA_Manual_Test_Trigger` pinData | valid → context_ready → aggregate | `RA_Return_Result` | `result_type=aggregated_result`, `status=success`, `per_status_counts={success:1, partial:0, failed:0, no_action:0}`, `module_names=['mem']`, `idempotency_key=aggregate:33333333-…-3333` |
| V5 Context mismatch | 737 | `RA_Manual_Test_Trigger` pinData | valid → context_mismatch (SQL 0 rows) | `RA_Return_Context_Error` | `error.code=CONTEXT_MISMATCH`, `details.tenant_id=99999999-…-9999` |
| V4 Malformed batch | 738 | `RA_Manual_Test_Trigger` pinData | invalid (duplicate step_id=s1) | `RA_Return_Error` | `error.code=DUPLICATE_STEP_IDS`, `details.step_id=s1` |
