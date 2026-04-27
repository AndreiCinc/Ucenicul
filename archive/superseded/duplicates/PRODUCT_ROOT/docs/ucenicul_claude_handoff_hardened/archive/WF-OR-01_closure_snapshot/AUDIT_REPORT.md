# Audit Report

## Stage
WF-OR-01

## Audit summary
- status: `ACTIVE WITH NEXT ACTION — LIVE V5 FAIL, SOURCE PATCHED, AWAITING USER RE-IMPORT`
- current score: **`8.5 / 10`**
- runtime alignment verdict: the stage scope is correctly bounded to `EC -> OR` handoff behavior and does not drift into plan generation, module execution, or response composition; V1–V4 and V6-equivalent PASSED on the live engine; V5 cross-tenant isolation FAILED on the live engine due to a node-graph contract gap, now patched in source
- blocker posture: hard blocker is the live V5 re-run after user re-import; no architectural or DB blocker

## Runtime impact
- what changed since the last audit:
  - live import of WF-OR-01 shell by user completed
  - live V1 (shell integrity) PASSED via workflow read
  - live V2 (invalid input) PASSED via execution `700`
  - live V3 (happy path) PASSED via execution `701`, with real DB read-path hitting the single real row in `public.execution_contexts`
  - live V4 (replay stability) PASSED via execution `702`, byte-identical output
  - live V5 (cross-tenant isolation) **FAILED** via execution `703`; OR_Build_Handoff_Payload ignored `_valid='false'` and produced a green-light handoff with `"undefined"` ID fields
  - live V6 upstream smoke handoff PASSED by equivalence with V3 (same FLAT EC_Return_Result shape)
  - post-test DB drift check shows zero new rows in `execution_contexts` for the tenants scanned
  - source JSON patched to v1.2 fail-closed; 650/650 script tests re-run PASS
- what is now possible:
  - user re-import of the patched source JSON
  - live V5 re-run and V4 regression re-run
  - final post-test DB drift check and closure
- what remains blocked:
  - closure at 10/10
  - advancement to `WF-PL-01`

## Evidence classification

### Verified by live workflow read
- WF-OR-01 shell identity: id `KhGmNpi0ZDmrnz8W`, versionId `868e5017-0018-4d96-bee5-b06b92902b56`
- 10 nodes / 9 edges; both triggers present; Postgres credential `z9nKgToNWvIW7P8f` attached on `OR_Load_Execution_Context`
- `alwaysOutputData: true` preserved on the Postgres node
- Switch v3.2 `_valid` routing intact
- OR_Validate_EC_Result carries v1.1 dual-shape (wrapped + flat) adapter

### Verified by DB query
- `public.execution_contexts` schema matches the canonical spec (columns, CHECK constraint permitting `'initialized'`, global UNIQUE on `idempotency_key`, composite tenant+thread index)
- real seed row exists for tenant `aaaaaaaa-…-000000000001`, thread `11111111-…-000000000001`
- idempotency key pattern `{tenant_id}:{trigger_message_id}:exec_ctx:v1` matches our synthesis logic exactly
- zero new rows written by WF-OR-01 across V1–V5 on both real and bogus tenants (no domain drift)

### Verified by runtime execution
- V1 shell integrity: PASS (live workflow read)
- V2 invalid input: PASS (n8n execution `700`; OR_Return_Error envelope with `INVALID_HANDOFF_INPUT`)
- V3 happy path: PASS (n8n execution `701`; end-to-end 9-node success with `allowed_next_stage=WF-PL-01` + all three guard flags false)
- V4 replay stability: PASS (n8n execution `702`; byte-identical to V3)
- V5 cross-tenant isolation: **FAIL** (n8n execution `703`; Verify correctly emitted CONTEXT_MISMATCH but Build node ignored `_valid` and produced a poisoned green-light envelope)
- V6 upstream smoke handoff: PASS by equivalence with V3

### Verified by script-level execution
- `workflows/tests/or/test_families.py` executed green on patched source: **650 / 650**
- required-minimum contract: 10 families x 50 tests = 500 tests -- **satisfied** (13 x 50 = 650 delivered)
- required family coverage:
  - `input_validation` (50)
  - `happy_path` (50)
  - `invalid_input` (50)
  - `replay_idempotency` (50)
  - `cross_tenant_isolation` (50)
  - `ec_to_or_handoff` (50)
  - `node_payload_builder` (50)
  - `node_result_formatter` (50)
  - `sql_contract_validation` (50)
  - `reporting_and_tooling_contract` (50)
- supplementary family coverage:
  - `extract_handoff_input` (50)
  - `error_payload_builder` (50)
  - `blueprint_structure` (50)

### Inferred but not yet executed
- live V5 after re-import PASS (expected based on script-level + patched JS body)
- live V4 regression PASS after re-import (expected; happy-path logic is untouched)
- live post-test DB drift check after re-import (expected clean; no writes added)

### Unknown
- whether the user's re-import will produce any side-effect on the shell (triggers should be stable; OR_Load_Execution_Context credential should remain attached; verify after re-import)

## Findings
1. Script-level PASS does not imply live PASS. The Python port covers the error path via `run_full_pipeline`; the raw `build_handoff_payload` function is not itself guarded, and the live n8n build node mirrored that raw function. Next stage must test error-path routing at the engine level, not just at the library level.
2. The live n8n graph places `OR_Verify_Context_Match → OR_Build_Handoff_Payload` with no Switch between them. The fail-closed short-circuit inside the build node body is the minimum-delta fix and is now applied in source.
3. The stage remains correctly bounded: no plan object is produced, no module execution occurs, no final response is generated, and no domain writes occurred during the live runs.
4. The autonomous-executor directive caught exactly the class of drift it was designed to catch.

## Required fixes
1. User re-imports `workflows/WF-OR-01_Orchestrator_Input_Handoff.json` (versionId `wf-or-01-source-pack-v1.2-fail-closed`) into shell `KhGmNpi0ZDmrnz8W` with shell identity preserved.
2. Claude re-reads live workflow to confirm `OR_Build_Handoff_Payload` contains the `_valid === 'false'` short-circuit.
3. Claude re-runs V5 (cross-tenant isolation) on live engine; expected: OR_Return_Error-equivalent envelope (via the patched Build node short-circuit) with `error.code === 'CONTEXT_MISMATCH'`.
4. Claude re-runs V4 (replay stability) on live engine as regression; expected: byte-identical V3 envelope.
5. Claude re-queries `public.execution_contexts` to confirm zero domain drift.
6. Close at 10/10 only if all three post-re-import checks pass.

## Conflict log
- source-of-truth conflict: none
- decision taken: score capped at 8.5 because V5 failed on the unpatched live engine. Script-level and V1/V2/V3/V4/V6-equivalent live PASS are real, but the isolation gate is a mandatory gate for closure.
- why: a handoff stage cannot claim 10/10 if a cross-tenant probe silently produces a success envelope.

## Recovery status
- fallback_mode_active: false
- failed_path_label: `v5_cross_tenant_isolation_silent_success_on_live_engine`
- current_path_label: `source_fix_applied_awaiting_user_reimport`
- next_path_label: `user_reimports_patched_json_then_rerun_V5_and_post_test_db_check`
- banned_strategy_labels:
  - `sdk_update_workflow_code`
  - `mcp__n8n__patch_workflow_nodes`

## Next executable action
Wait for user to re-import patched JSON. Then autonomously: live-read `OR_Build_Handoff_Payload` body, re-run V5 + V4, re-check DB drift, close at 10/10 if all PASS.
