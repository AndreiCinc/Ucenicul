# BUILD_REPORT — WF-RA-01

## Stage
WF-RA-01 — Result Aggregator

## Objective
Create a full pre-live source pack for Result Aggregator, aligned to the orchestration-first runtime,
with canonical rollup semantics for parallel and sequential module results, and drive it through
live import + V1–V6 proof.

## Starting state
A candidate WF-RA-01 source pack existed in `wf-ra-01_full_source_pack.zip` with an intact
`SHA256SUMS.txt`. The pack was filename→content coherent internally but diverged from the
canonical SQL filename contract on two files and had a small connection-count inconsistency
between the blueprint/test-matrix and the actual workflow JSON.

## Artifacts present after the final cycle
- stage file (`10_STAGE_WF-RA-01.md`)
- active-stage lock, current-stage, state JSON (`STATE__WF-RA-01.json`)
- build/audit/fix/closure reports
- route map activation file
- workflow JSON (`WF-RA-01_Result_Aggregator.json`) + blueprint
- node map, connection map, import patch plan, test matrix
- SQL pack (7 canonical files + 2 retained documentation files)
- deterministic off-node Python logic (`ra_logic.py`)
- heavy test suite (`test_families.py`) with regenerated results
- **live workflow JSON** (`WF-RA-01_Result_Aggregator_LIVE.json`) — all 9 Code nodes carry the canonical JS translated from `ra_logic.py`, no placeholders
- apply guide and Claude execution prompt

## Repairs applied across cycles
### Cycle 2 (source-pack reconciliation)
- Added canonical SQL bridge files (read-only, tenant-scoped, parameterised):
  - `workflows/sql/ra/03_load_module_results.sql`
  - `workflows/sql/ra/04_load_plan_context.sql`
- Strengthened `family_sql_contract_validation`:
  - name-based presence check for each of the 7 canonical SQL files
  - explicit forbid-list for writes against `tasks`, `reminders`, `messages`, `rag_memories`
- Fixed connection count: `WF-RA-01_blueprint.json` → 14; `WF-RA-01_TEST_MATRIX.md` V1 → 14
- Pruned `workflows/scripts/ra/__pycache__/`
- Regenerated `SHA256SUMS.txt`

### Cycle 3 (live runtime cycle)
- Authored `WF-RA-01_Result_Aggregator_LIVE.json` with full canonical JS in every Code node (validate, verify-match, build-aggregation-input, aggregate, build-downstream-envelope, return-result, return-error, return-context-error, status-summary).
- Configured `RA_Load_Execution_Context.options.queryReplacement` to bind `$1`/`$2` from `$json._envelope.execution_context_id` and `tenant_id`.
- User imported the live JSON into n8n (workflow id `5RcNLtxNjAHJsZPE`, version `8eeb0bd0-477c-40a3-839a-8f76415bc962`) and rebound the Postgres credential `z9nKgToNWvIW7P8f` / "Postgres account 2".
- Executed V1 + V2 live (execution 734): real canonical logic fired and the fallback path produced the canonical `INVALID_AGGREGATION_INPUT` error envelope.
- Probed V3 (happy-path SQL read) and V4 (cross-tenant isolation) with a fixture row `id=33333333-3333-3333-3333-333333333333` / tenant `44444444-4444-4444-4444-444444444444` / thread `55555555-5555-5555-5555-555555555555`.
- Verified V6 DB drift: pre/post row counts identical across all 5 domain tables (2/4/1/5/42 → 2/4/1/5/42).
- Cleaned up fixture row at end of cycle.

### Cycle 5 (full live E2E closure)
- User pasted V3 happy / V5 context-mismatch / V4 malformed-batch envelopes sequentially into `RA_Manual_Test_Trigger.pinData` via the n8n UI.
- Claude invoked `execute_workflow(executionMode=manual)` for each, recorded execution ids, and verified canonical outputs:
  - execution `736` (V3) → `RA_Return_Result` with canonical `aggregated_result`, `allowed_next_stage=WF-SU-01`, `idempotency_key=aggregate:33333333-…-3333`
  - execution `737` (V5) → `RA_Return_Context_Error` with `CONTEXT_MISMATCH`, `details.tenant_id=99999999-…-9999`
  - execution `738` (V4) → `RA_Return_Error` with `DUPLICATE_STEP_IDS`, `details.step_id=s1`
- Shell re-verified intact after each run (14/14, alwaysOutputData, queryReplacement, versionId unchanged).
- Fixture cleanup: 1 row deleted; final drift 0/0/0/0/0 across all 5 domain tables.
- All handoff docs updated; SHA256SUMS.txt regenerated.

## Build posture (final, post-closure)
- source pack complete: **yes**
- script verified (reproduced in this run): **yes** — 13 families × 50 tests = **650/650 PASS**
- DB verified: **yes** (live read probe + cross-tenant probe + drift probe)
- live workflow verified: **yes** (14 nodes / 14 edges re-read from live n8n API, confirmed intact post-closure)
- runtime proof complete: **full** (V1, V2 live; V3/V4/V5 live E2E; V6 live)
- post-test DB drift verified: **yes** (0/0/0/0/0 after closure + cleanup)
- closed: **true**
- advance allowed: **true**
- score: **10 / 10**

## Shell shape (live, not from docs)
- node count: **14**
- connection edges (main): **14**
- triggers: `RA_Input` (executeWorkflowTrigger), `RA_Manual_Test_Trigger` (manualTrigger)
- switch nodes: `RA_Route_Valid` (`_valid`), `RA_Route_Context_Ready` (`_context_ready`)
- Postgres node: `RA_Load_Execution_Context` with `alwaysOutputData: true`, `options.queryReplacement` bound to envelope, and credential bound (`z9nKgToNWvIW7P8f`)
- terminal code nodes: `RA_Return_Result`, `RA_Return_Error`, `RA_Return_Context_Error`, `RA_Status_Summary`

## Test suite
- Heavy deterministic off-node suite: **13 families × 50 = 650/650 PASS**
- Families:
  1. input_validation
  2. happy_path_single
  3. happy_path_parallel
  4. partial_status_rollup
  5. failed_status_rollup
  6. no_action_rollup
  7. cross_tenant_isolation
  8. replay_idempotency
  9. step_coverage_validation
  10. guard_flag_enforcement
  11. upstream_me_to_ra_handoff
  12. sql_contract_validation (strengthened this cycle)
  13. reporting_and_tooling_contract

## Live evidence pointers
- workflow id: `5RcNLtxNjAHJsZPE`
- version id: `8eeb0bd0-477c-40a3-839a-8f76415bc962`
- executions: `721` (placeholder iteration), `734` (V1 + V2 live, real canonical JS), `735` (Cycle 4 re-verification), `736` (V3 happy E2E), `737` (V5 context mismatch E2E), `738` (V4 malformed batch E2E)
- V3/V4 SQL probes: see Cycle 3 in `FIX_LOG__WF-RA-01.md`
- drift baseline and post-test: see `STATE__WF-RA-01.json.live_proof.db_drift`

## Next executable action
Activate **WF-SU-01 State + DB + Memory Update**. WF-RA-01 is closed; its canonical `aggregated_result` envelope with `allowed_next_stage=WF-SU-01`, `state_update_allowed=true`, `domain_writes_performed=false` is the upstream contract WF-SU-01 expects.
