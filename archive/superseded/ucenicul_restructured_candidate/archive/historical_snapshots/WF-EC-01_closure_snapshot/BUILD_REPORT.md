# Build Report

## Stage
WF-EC-01

## Attempt identity
- attempt_date: 2026-04-17
- phase: build + script-level verification + live runtime verification
- strategy_label: native_json_blueprint_plus_manual_import_plus_live_probes
- strategy_retry_count: 0 on the current path
- reversible: yes (import was performed manually by the user into the existing shell; fixture rows cleaned via prefix-scoped SQL)

## Objective
Produce a complete, implementation-ready WF-EC-01 package — native n8n JSON, node/connection/patch plans, canonical SQL, node-level logic tests, and a ≥30-tests-per-family proof suite — then import into the live shell (via user-performed manual import after the previously-observed SDK path was banned) and execute live V1–V6 probes. Close the stage at maximum achievable score.

## Live starting state
- workflow: `WF-EC-01` (`v9jih4jqeXpOJOiH`) — active shell with 3 placeholder nodes (manualTrigger, chatTrigger, Code)
- db: `public.execution_contexts` 18 cols, UNIQUE `idempotency_key`, CHECK allows `initialized`
- active write surface: manual UI import (performed by user)
- snapshot_before_id: `snapshot_WF-EC-01_before_2026-04-17_manual_import`

## Changes made
1. Read canonical handoff pack in full.
2. Inspected live `execution_contexts` schema via Postgres MCP.
3. Inspected live shell via n8n MCP read.
4. Produced native n8n blueprint (8→7 EC nodes after consolidation), node/connection/import plan docs.
5. Produced canonical SQL (`01_schema_inspect`, `02_upsert`, `03_load_existing`, `10_fixtures_create`, `11_fixtures_cleanup`, `20_behavior_probe`).
6. Ported EC node jsCode to Python (`workflows/scripts/ec/ec_logic.py`).
7. Built and ran 300-test script-level harness (10 families × 30), 300/300 pass.
8. **User manually imported** the blueprint JSON into the shell via UI (Claude did not execute the write — the only verified write surface was manual).
9. Post-import live probes V1–V6 executed (see next section).
10. One live bug found on the switch node (empty-array routing under `dataType=boolean` + coerced-boolean `value1`). User applied the fix in UI; Claude mirrored the fix into the on-disk blueprint so re-import is safe.

## Artifacts produced / updated
- Blueprint JSON (now with switch fix): `workflows/WF-EC-01_Execution_Context.json` (+ duplicate `WF-EC-01_blueprint.json`)
- Plans: `WF-EC-01_NODE_MAP.md`, `WF-EC-01_CONNECTION_MAP.md`, `WF-EC-01_IMPORT_PATCH_PLAN.md`
- SQL: `workflows/sql/ec/{01_schema_inspect, 02_upsert, 03_load_existing, 10_fixtures_create, 11_fixtures_cleanup, 20_behavior_probe}.sql` (`10_fixtures_create` patched to include `organization_id` for messages)
- Python logic: `workflows/scripts/ec/ec_logic.py`
- Script tests: `workflows/tests/ec/test_families.py` + `results.json` + `results.md`
- **New:** `workflows/POST_IMPORT_AUDIT_WF-EC-01.md` (live V1–V6 audit)

## Live V1–V6 evidence (summary; full detail in POST_IMPORT_AUDIT_WF-EC-01.md)
- **V1** shell structural: PASS — 7 EC nodes + 6 EC connections + switch fixed + Postgres creds bound + `alwaysOutputData: true` on both Postgres nodes + `availableInMCP: true`
- **V2** happy-path upsert (DB level): PASS — row `d03aa8a7…` inserted, status=initialized, 15m TTL
- **V3** replay idempotency (DB level): PASS — 0 rows on replay; canonical load returns identical row
- **V4** cross-tenant isolation (DB level): PASS — tenant_2 query returns 0; UNIQUE is global; `AND tenant_id = $2` is a correctness guarantee
- **V5** invalid input END-TO-END (n8n execution 687): PASS — chat trigger → Validate → Route[1] → Return_Error; canonical error shape emitted; 0 DB side-effects
- **V6** TR→EC handoff (DB level): PASS — derived key upsert, replay, canonical load, cross-tenant isolation, TTL = 900s exact
- **V2e** happy-path END-TO-END: DEFERRED — not executed via n8n engine due to MCP `patch_workflow_nodes` PUT schema mismatch (cannot safely inject pinData programmatically); instructions documented in POST_IMPORT_AUDIT §3.V2e for the user to perform one UI-pinned execution if/when 10/10 is desired

## Fixture ledger
- `TR_to_EC_smoke_row_a7ae786a` (carry_forward_fixture): preserved ✅
- `wfec01_fixture_probe_happy_v1` (V2/V3 probe): inserted then cleaned ✅
- `wfec01_test_tr_ec_t1_…` (V6 probe): inserted then cleaned ✅
- Fixture threads + messages: inserted via `10_fixtures_create.sql`, cleaned via `11_fixtures_cleanup.sql`
- Tenant #2: preserved (per cleanup SQL design; may be referenced by other stages)

## Tooling notes
- on-disk authoring: file tools (Read/Write/Edit)
- DB live probes: `mcp__postgres__execute_sql`
- workflow reads: `mcp__n8n__get_workflow`, `mcp__n8n__verify_workflow`
- workflow execution: `mcp__f2e8be41-…__execute_workflow` + `get_execution`
- programmatic workflow patch: attempted via `mcp__n8n__patch_workflow_nodes` — BLOCKED by n8n PUT schema mismatch (`settings must NOT have additional properties`, `nodes/N must NOT have additional properties`). User performed the switch fix in UI.
- BANNED: SDK `update_workflow(code)` (F2 false success from cycle 1).

## Verification after build
- live shell re-read: 9 nodes, 8 connections, versionCounter 22, versionId `9c4c5e2a-…` → then `7fa2f135-…` post switch-fix
- live DB post-cleanup: `stage_local_ec_rows=0`, `carry_forward_tr_ec_evidence=1`, `fixture_threads_remaining=0`, `fixture_messages_remaining=0`, `tenant_2_remaining=1`
- script-level: 300/300 pass
- live runtime: V1/V2/V3/V4/V5/V6 all PASS; V2e DEFERRED as documented

## Score update
- previous: 9.5 / 10 (live V1–V6 PASS; V2e deferred)
- current: **10 / 10 — CLOSED**
- V2e closed via user-set dual-trigger pinData + 11 live runtime executions:
  - 689: V2e fresh insert (happy path end-to-end)
  - 690: V2e replay idempotency (happy path end-to-end)
  - 691–694: R1/R2/R3/R4 — fresh insert + 3 sequential replays with same idempotency_key
  - 695–696: R5/R6 — production mode with invalid chatInput (bypassed pinData) → EC_Return_Error canonical shape, 0 DB writes
  - 697–699: R7a/R7b/R7c — 3 concurrent executions under same idempotency_key
- Invariants verified end-to-end:
  - 7 happy-path executions → exactly 1 DB row, 1 distinct id (idempotency held under sequential + concurrent loads)
  - 3 invalid-input executions (V5 687 + R5 + R6) → 0 DB writes, canonical error shape
  - Switch fix persistence confirmed across all executions
  - EC_Return_Result emits identical canonical shape on fresh-insert and replay paths

## Next executable action
Open `WF-OR-01` (Orchestrator Input Handoff) per `00_ROUTE_MAP.md`. Apply forward the known MCP tool limitations documented in `POST_IMPORT_AUDIT_WF-EC-01.md` §7:
- `mcp__n8n__patch_workflow_nodes` is not safe for in-place shell mutation in this environment (PUT-schema mismatch).
- `mcp__f2e8be41-…__execute_workflow` in manual mode selects the webhook-registered trigger as start node; use dual-trigger pinData when the intent is to exercise the manual trigger's path.
- Chat trigger emits `{sessionId, action, chatInput}` — not a valid direct driver for structured modules; any chat-driven entry must pass through an adapter node.
