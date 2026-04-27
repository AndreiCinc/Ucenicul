# Current Stage

## Active stage
`WF-EC-01`

## Stage file
`06_STAGE_WF-EC-01.md`

## Goal
Replace the placeholder shell internals of `WF-EC-01` with a correct Execution Context Init workflow and close the stage at 10/10.

## Current posture
`GREEN — CLOSED` — live V1/V2/V3/V4/V5/V6 PASS; V2e PASS; extended runtime suite V2e-ext PASS across 9 additional live executions. Stage is CLOSED at 10/10 and `WF-OR-01` is unlocked.

## Score
- current: **10 / 10** — CLOSED
- previous: 9.5 / 10 (V2e deferred in cycle 3)
- closure mechanism: dual-trigger pinData + 11 live executions across fresh, replay, invalid-input, and concurrent scenarios

## What closed the cap
- user set pinData on BOTH triggers (manual + chat) with identical happy-path payload
- cycle-4 fix note: `mcp__f2e8be41-…__execute_workflow` in manual mode selects webhook-registered trigger (chat) as start node, not the manual trigger; dual-trigger pinData is the working pattern
- 2 V2e executions (689 fresh, 690 replay) + 9 extended runtime executions (691–699) all PASS with expected DB invariants
- post-suite DB: 0 stage-local rows, carry-forward TR→EC evidence preserved

## What is complete in this stage

### Script-level (additive, cycle 2)
- native n8n blueprint JSON:
  - `workflows/WF-EC-01_Execution_Context.json` (now carries the cycle-3 switch fix)
  - `workflows/WF-EC-01_blueprint.json` (duplicate)
- planning docs:
  - `workflows/WF-EC-01_NODE_MAP.md`
  - `workflows/WF-EC-01_CONNECTION_MAP.md`
  - `workflows/WF-EC-01_IMPORT_PATCH_PLAN.md`
- canonical SQL (the fixtures file has the cycle-3 `organization_id` patch):
  - `workflows/sql/ec/01_schema_inspect.sql`
  - `workflows/sql/ec/02_upsert.sql`
  - `workflows/sql/ec/03_load_existing.sql`
  - `workflows/sql/ec/10_fixtures_create.sql`
  - `workflows/sql/ec/11_fixtures_cleanup.sql`
  - `workflows/sql/ec/20_behavior_probe.sql`
- node logic port:
  - `workflows/scripts/ec/ec_logic.py`
- test suite (≥30-per-family rule):
  - `workflows/tests/ec/test_families.py`
  - 10 families × 30 tests = 300 total
  - result: **300 / 300 pass**
  - artifacts: `workflows/tests/ec/results/results.json`, `workflows/tests/ec/results/results.md`

### Live runtime (cycles 3 + 4)
- manual native-JSON import into shell `v9jih4jqeXpOJOiH` (user-performed)
- post-import live shell: 9 nodes (2 triggers + 7 EC) + 8 connections, credentials bound, `alwaysOutputData: true` on both Postgres nodes, `availableInMCP: true`
- cycle-3 switch routing bug discovered and fixed (user in UI; mirrored on disk)
- cycle-4: user set pinData on BOTH triggers; dual-trigger pinData is the working pattern for programmatic execution of the manual trigger's intent
- live probes (all PASS):
  - **V1** shell structural: PASS
  - **V2** happy-path upsert (DB-level): PASS
  - **V3** replay idempotency (DB-level): PASS
  - **V4** cross-tenant isolation (DB-level): PASS
  - **V5** invalid input END-TO-END (execution 687): PASS
  - **V6** TR→EC handoff (DB-level): PASS
  - **V2e** happy-path END-TO-END (executions 689 fresh, 690 replay): PASS
  - **V2e-ext** extended runtime suite (executions 691–699): PASS — 1 fresh + 3 sequential replays + 2 production-mode invalid inputs + 3 concurrent replays
- DB invariants verified across 11 live executions:
  - 7 happy-path runs → 1 row, 1 distinct id (idempotency under sequential + concurrent loads)
  - 3 invalid-input runs → 0 DB writes, canonical error shape
- fixtures cleanup completed; carry-forward TR→EC evidence preserved; tenant_2 kept per cleanup design
- audit reports: `workflows/POST_IMPORT_AUDIT_WF-EC-01.md` + this handoff pack

## What remains for this stage
Nothing. Stage is CLOSED at 10/10.

## Runtime position
Current stage contributes to:
- `Thread Resolver -> Execution Context Init`

## Runtime dependencies

### Previous runtime segment
- `WF-TR-01` — Thread Resolver
- status: closed
- usable as carry-forward evidence for TR -> EC smoke (V6 used it)

### Next runtime segment
- `WF-OR-01` — Orchestrator Input Handoff
- status: planned only
- not permitted to start until WF-EC-01 is promoted to `CLOSED at 10/10`

## Read next
1. `17_ACTIVE_STAGE_LOCK.md`
2. `06_STAGE_WF-EC-01.md`
3. `BUILD_REPORT.md`
4. `AUDIT_REPORT.md`
5. `FIX_LOG.md`
6. `STATE.json`
7. `../../workflows/POST_IMPORT_AUDIT_WF-EC-01.md`
8. `../../workflows/WF-EC-01_IMPORT_PATCH_PLAN.md`
9. `../../workflows/tests/ec/results/results.md`

## Carry-forward notes for next stage
- preserve the shell workflow record (still `v9jih4jqeXpOJOiH`) if future stages reuse it
- do not trust save success without live re-read
- do not infer schema from tool errors
- SDK `update_workflow(code)` remains banned
- `mcp__n8n__patch_workflow_nodes` remains unsafe (PUT-schema mismatch)
- `mcp__f2e8be41-…__execute_workflow` in manual mode selects webhook-registered trigger; use dual-trigger pinData when exercising the manual trigger's path programmatically
- chat trigger emits `{sessionId, action, chatInput}`; needs adapter for structured modules

## Next executable action
Advance to `WF-OR-01` (Orchestrator Input Handoff). See `00_ROUTE_MAP.md` for next stage file.
