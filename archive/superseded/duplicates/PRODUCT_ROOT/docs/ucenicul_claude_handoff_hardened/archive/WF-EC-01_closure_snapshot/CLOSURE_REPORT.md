# Closure Report

## Stage
WF-EC-01

## Verdict
**CLOSED at 10/10** — all live probes PASS; extended runtime suite (11 total live executions) PASS with all invariants verified; DB post-suite clean; carry-forward evidence preserved; `WF-OR-01` unlocked.

## What is live
- `WF-EC-01` workflow shell (id `v9jih4jqeXpOJOiH`) preserved and healthy: 9 nodes (2 trigger placeholders + 7 EC nodes), 8 connections, credentials bound on both Postgres nodes, `alwaysOutputData: true`, `availableInMCP: true`
- pinData set on BOTH triggers (manual + chat) with identical happy-path payload; this is the working pattern for dual-trigger programmatic execution via MCP
- on-disk blueprint (`workflows/WF-EC-01_Execution_Context.json`) mirrors the live shell post cycle-3 switch fix — re-import is idempotent and safe
- live DB: `execution_contexts` usable (18 cols, global UNIQUE on `idempotency_key`, status CHECK allows `initialized`)
- carry-forward TR → EC evidence row preserved (`a7ae786a-…`, key `…:aaaabbbb-…-000000000010:exec_ctx:v1`)
- tenant #2 present (created by fixtures SQL; kept by cleanup design)

## What was runtime-tested (11 live executions)

| # | Exec ID | Mode | Input | Last Node | DB effect | Result |
|---|---|---|---|---|---|---|
| V5 | 687 | production | `chatInput: "invalid probe after fix"` | EC_Return_Error | 0 writes | PASS |
| V2e fresh | 689 | manual | pinData | EC_Return_Result | fresh INSERT `1db85188-…`, TTL 900s | PASS |
| V2e replay | 690 | manual | pinData | EC_Return_Result | conflict → 0 rows; canonical load | PASS |
| R1 fresh | 691 | manual | pinData | EC_Return_Result | fresh INSERT `440275dc-…` (post intermediate cleanup) | PASS |
| R2 replay | 692 | manual | pinData | EC_Return_Result | conflict → canonical load | PASS |
| R3 replay | 693 | manual | pinData | EC_Return_Result | conflict → canonical load | PASS |
| R4 replay | 694 | manual | pinData | EC_Return_Result | conflict → canonical load | PASS |
| R5 invalid | 695 | production | `chatInput: "R5-bad-input-not-json"` | EC_Return_Error | 0 writes | PASS |
| R6 invalid | 696 | production | `chatInput: ""` | EC_Return_Error | 0 writes | PASS |
| R7a concurrent | 697 | manual | pinData | EC_Return_Result | conflict → canonical load | PASS |
| R7b concurrent | 698 | manual | pinData | EC_Return_Result | conflict → canonical load | PASS |
| R7c concurrent | 699 | manual | pinData | EC_Return_Result | conflict → canonical load | PASS |

**Invariants verified:**
- 7 happy-path executions under the same `idempotency_key` → exactly 1 DB row, 1 distinct id
- 3 invalid-input executions → 0 DB writes, canonical error shape identical across all three
- Switch v2 fix confirmed on all 11 executions (route 0 on valid, route 1 on invalid)
- `EC_Return_Result` emits identical canonical shape on fresh-insert and replay paths
- TTL = 900 seconds exact on all happy-path rows
- Concurrent executions under the same key held idempotency without duplicates

**DB-level probes (V2/V3/V4/V6):** all PASS from cycle 3 (retained).

## DB state after testing
- stage-local rows cleaned: 0 rows matching `wfec01_fixture_%` or `wfec01_test_%`
- carry-forward TR → EC evidence: preserved (id `a7ae786a-…`)
- fixture threads/messages: deleted
- tenant #2: kept (per cleanup SQL design)
- total rows in `public.execution_contexts`: 1 (just the carry-forward row)

## Remaining notes / known limitations (carry-forward)
- `mcp__n8n__patch_workflow_nodes` remains unsafe for in-place shell mutation in this environment (PUT-schema mismatch refuses top-level fields GET returns: `timeSavedMode`, `alwaysOutputData`, `notes`; also rejects `settings` injections)
- `mcp__f2e8be41-…__execute_workflow` in manual mode selects the webhook-registered trigger as start node (chat trigger with `webhookId` wins over `manualTrigger`); use dual-trigger pinData as the working pattern
- Chat trigger emits `{sessionId, action, chatInput}` — not a valid direct driver for structured modules; any chat-driven entry requires an adapter node mapping `chatInput` → `{tenant_id, thread_id, trigger_message_id}`
- SDK `update_workflow(code)` remains banned from cycle 1's F2 false success

## Next stage readiness
**UNLOCKED** — `WF-OR-01` (Orchestrator Input Handoff) may begin.

## Final score
**10 / 10**

## State transition
- previous_state: `green_with_deferred` (9.5, cycle 3)
- new_state: `closed` (10, cycle 4)
- advance_allowed: true

## Next executable action
Open `WF-OR-01` per `00_ROUTE_MAP.md`. Apply forward the documented MCP tool limitations and the dual-trigger pinData pattern when exercising manual-trigger paths programmatically.
