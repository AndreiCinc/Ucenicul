# Audit Report

## Stage
WF-EC-01

## Audit summary
- status: `GREEN — CLOSED`
- current score: **`10 / 10`** (raised from 9.5 after dual-trigger pinData by user + 11 live runtime executions)
- runtime alignment verdict: stage direction, contracts, node graph, SQL, node logic, and live runtime wiring are all correct and proved end-to-end across fresh-insert, replay (sequential + concurrent), and invalid-input scenarios; cycle-3 switch fix persisted and confirmed across 4 live invalid-input runs
- blocker posture: none — stage is CLOSED; `WF-OR-01` is unlocked

## Runtime impact
- what changed since the previous audit:
  - user set pinData on **both triggers** (`When clicking 'Execute workflow'` AND `When chat message received`) with identical payload
  - V2e (happy path end-to-end) executed twice — exec 689 (fresh insert) + exec 690 (replay idempotency) — both PASS, DB confirms 1 row with `ttl_seconds=900` exact, replay returns canonical identical row with original timestamps
  - extended runtime suite V2e-ext executed — 9 additional live executions (691–699) covering: 1 fresh + 3 sequential replays + 2 production-mode invalid inputs + 3 concurrent replays
  - invariants verified across 11 total live executions:
    - 7 happy-path runs → exactly 1 row + 1 distinct id (idempotency held sequential + concurrent)
    - 3 invalid-input runs (V5 687 + R5 695 + R6 696) → 0 DB writes, canonical error shape `{status: "failed", error.code: "INVALID_INPUT", missing_fields: [...]}`
    - switch fix confirmed on all executions (true branch for valid; false branch for invalid)
  - final cleanup executed; stage-local rows = 0; carry-forward TR→EC evidence (id `a7ae786a-…`) preserved
- what is now possible:
  - advance to next stage: `WF-OR-01` (Orchestrator Input Handoff)
- what remains open:
  - none for this stage

## Evidence classification

### Verified by live workflow read
- `WF-EC-01` id `v9jih4jqeXpOJOiH` — shell preserved throughout
- post-import: 9 total nodes (2 trigger placeholders + 7 EC nodes), 8 connections (2 trigger→EC + 6 EC→EC)
- `settings.availableInMCP: true`
- credentials bound on both Postgres nodes (`Postgres account 2`)
- `alwaysOutputData: true` on both Postgres nodes
- switch v2 fix persisted live (versionCounter 22, versionId `7fa2f135-…`)

### Verified by DB query
- `execution_contexts` 18 cols, `idempotency_key` global UNIQUE, `status` CHECK allows `initialized`
- V2 upsert under tenant_1: row `d03aa8a7-7d73-49db-b145-9c4a90e49544` inserted, `status=initialized`, `expires_at - created_at = 900s` exact
- V3 replay: 0 rows returned on duplicate `INSERT ... ON CONFLICT DO NOTHING`; canonical load returns identical row
- V4 cross-tenant: tenant_2 read for tenant_1's key → 0 rows; cross-tenant insert under tenant_1's key → blocked by global UNIQUE (ON CONFLICT DO NOTHING)
- V6 TR→EC: derived key `<tenant>:<trigger_msg>:exec_ctx:v1` prefixed `wfec01_test_tr_ec_t1_` — upsert, replay, canonical load, cross-tenant isolation all PASS; TTL exactly 900s
- carry-forward row `aaaaaaaa-…:aaaabbbb-…:exec_ctx:v1` preserved
- post-cleanup: `stage_local_ec_rows=0`, `fixture_threads_remaining=0`, `fixture_messages_remaining=0`, `tenant_2_remaining=1` (kept by cleanup design)

### Verified by script-level execution
- `workflows/tests/ec/test_families.py` executed green: 300 / 300
- coverage (10 families × 30):
  - input_validation (30)
  - happy_path (30)
  - idempotency (30)
  - cross_tenant (30)
  - tr_ec_handoff (30)
  - node_validation (30)
  - node_payload_builder (30)
  - node_result_formatter (30)
  - node_error_formatter (30)
  - tooling_reporting (30)
- structural asserts against blueprint JSON: 8 nodes, switch `dataType=boolean`, `alwaysOutputData` on both Postgres nodes, `availableInMCP: true`

### Verified by runtime execution (n8n engine)
- **V5 (invalid input end-to-end, execution 687):** chat trigger → `EC_Validate_Input` → `EC_Route_Valid` (output 1) → `EC_Return_Error`; canonical error shape; 0 DB side-effects.
- **V2e happy path fresh insert (execution 689):** trigger → `EC_Validate_Input` (_valid=true) → `EC_Route_Valid` (output 0) → `EC_Build_Init_Payload` → `EC_Upsert_Context` (INSERT returned row `1db85188-…`) → `EC_Load_Existing_Context` (canonical) → `EC_Return_Result` (`status=initialized, status_kind=success, result_type=state`); DB row TTL=900s exact.
- **V2e replay idempotency (execution 690):** same pinData → upsert emits `{success: true}` (0 rows) → alwaysOutputData allows load → canonical identical row returned → canonical result shape emitted identically; DB: COUNT=1, DISTINCT_IDS=1.
- **V2e-ext R1 fresh (691):** fresh INSERT post-intermediate-cleanup, new id `440275dc-…`.
- **V2e-ext R2/R3/R4 sequential replays (692/693/694):** conflict → canonical load of `440275dc-…` returned in all three.
- **V2e-ext R5 production-mode invalid (695):** production mode bypasses pinData; chat trigger emits `{sessionId, action, chatInput: "R5-bad-input-not-json"}`; validator rejects with `INVALID_INPUT + missing_fields=[tenant_id, thread_id, trigger_message_id]`; switch routes to output 1; `EC_Return_Error` emits canonical error shape; 0 DB writes.
- **V2e-ext R6 production-mode empty chatInput (696):** same outcome as R5; 0 DB writes.
- **V2e-ext R7a/R7b/R7c concurrent burst (697/698/699):** 3 concurrent executions under same idempotency_key; all conflict → canonical load; post-burst DB: 1 row, 1 distinct id — idempotency held under concurrency.
- **Across all 11 live executions:** 7 happy-path runs produced exactly 1 row; 3 invalid-input runs produced 0 DB writes; switch fix confirmed on 4 invalid-input routings and 7 valid routings.

### Unknown
- none material to this stage

## Findings
1. The manual import path is safe and reproducible; the on-disk blueprint is the single source of truth and re-import is idempotent post-fix.
2. Script-level testing caught logic bugs but NOT the switch config bug — a useful reminder that node-level behavior tests on their own do not substitute for live runtime probes of graph-wide routing.
3. Global UNIQUE on `idempotency_key` (not per-tenant) is an architectural fact with correctness implications: the `AND tenant_id = $2` filter in `EC_Load_Existing_Context` is a correctness guarantee, not a performance hint. Documented in `POST_IMPORT_AUDIT_WF-EC-01.md` §3.V4.
4. The `mcp__n8n__patch_workflow_nodes` PUT-schema mismatch (`settings must NOT have additional properties`, `nodes/N must NOT have additional properties`) blocks programmatic patching of fields that `GET` returns. This is a tool-side limitation and does not indicate a product issue in the stage deliverable.
5. Fixture SQL needed a cycle-2 patch (organization_id NOT NULL on `public.messages`) — now inherited from owning tenant via subquery; idempotent and safe to re-run.

## Required fixes (still in force)
1. Do not use SDK-style `update_workflow(code)` in this stage (banned from cycle 1's F2 false success).
2. Do not attempt programmatic pinData via `mcp__n8n__patch_workflow_nodes` until the PUT-schema mismatch is resolved.
3. Keep the on-disk blueprint authoritative for any re-import; the live shell and the on-disk file must remain in sync (they are, post cycle-3 fix mirror).
4. Preserve carry-forward TR→EC evidence during any future cleanup.

## Conflict log
- script-level green vs live-runtime routing bug: script-level tests exercised `EC_Validate_Input` pure logic and `EC_Error_Payload` pure logic; they did not exercise the switch's boolean↔string comparison semantics. The cycle-3 live bug exposed this gap.
- decision taken: live runtime probes are non-substitutable; script-level tests are necessary but not sufficient for stage closure.
- why: graph wiring and engine-specific node type semantics are only provable by running the live engine.

## Recovery status
- fallback_mode_active: false (stage is CLOSED)
- failed_path_label: `sdk_update_workflow_code` (cycle 1; still banned)
- current_path_label: `native_json_blueprint_plus_manual_import_plus_dual_trigger_pindata_plus_extended_runtime_suite`
- next_path_label: `advance_to_wf_or_01`
- banned_strategy_labels:
  - `sdk_update_workflow_code`

## Next executable action
Advance to `WF-OR-01` (Orchestrator Input Handoff). Apply forward the documented MCP tool limitations (see `workflows/POST_IMPORT_AUDIT_WF-EC-01.md` §7): patch tool unsafe, manual-mode execute prefers webhook trigger, chat trigger needs adapter.
