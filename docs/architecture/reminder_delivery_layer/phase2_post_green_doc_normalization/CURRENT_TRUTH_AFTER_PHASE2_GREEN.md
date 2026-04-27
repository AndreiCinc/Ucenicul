# Current Truth After Phase 2 GREEN (post-normalization)

Date: 2026-04-27.

## Status flags (CURRENT)

- `MEMORY_100_FOR_CURRENT_STAGE = TRUE`
- `TASK_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- `F14_STORE_MEMORY_INTENTMAP_READY = TRUE`
- `IMPROVEMENT_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- `AMBIGUOUS_CONTENT_GUARDS_READY = TRUE`
- `MEMORY_SUPERSEDE_PL_INTENTMAP_READY = TRUE`
- `OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_READY = TRUE`
- `MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_READY = TRUE`
- `PL_BRIEFING_RESPOND_ONLY_READY = TRUE`
- `PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`
- `FULL_240_VARIANT_SWEEP_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`
- `C11_REPLAY_GROUPING_TARGETED_RERUN_READY = TRUE`
- `MEMORY_RECALL_PL_INTENTMAP_READY = TRUE`
- `IMPROVEMENT_MODULE_LIST_READY = TRUE`
- `NEXT_3_FOLLOWUPS_CLOSED_GREEN = TRUE`
- `REMINDER_DELIVERY_PHASE0_DRY_RUN_READY = TRUE`
- `REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE`
- `REMINDER_DELIVERY_PHASE1_DOC_NORMALIZATION_READY_FOR_PHASE2 = TRUE`
- **`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN = TRUE`** (current latest)
- `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_READY = TRUE`

## Phase 2 facts (canonical)

- Reminder Delivery Layer dovedit end-to-end live în sandbox.
- Exact 1 Telegram message trimis în sandbox (chat `5101664726`,
  Telegram `result.message_id=546`).
- Replay tick: **0 duplicate sends, 0 new ledger rows**.
- `public.reminders` byte-identical (count=1, max=2026-04-13 20:17:13.620582+00).
- `public.outbound_delivery_ledger_claude_mcp` byte-identical (count=0).
- WF-RD-01 final state restored to byte-identical Phase 1 baseline:
  - id `nc7rTC3hjO9QqbXs`
  - versionId **`9744e3a6-6824-42fd-867c-91622b4722b4`** (post aggregator fix)
  - 11 nodes / 14 connections
  - `active=false`
  - `availableInMCP=true`
  - `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`

## What is NOT open anymore

- ~~`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`~~ → CLOSED 2026-04-27 (GREEN).
- ~~`RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP`~~ → CLOSED 2026-04-27.

## What IS the next frontier

**`REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE`** — production gate / policies / false-sent guard. **Not** production rollout.

After Phase 3, the next planned frontier will be:

`REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT` — first real production pilot on a single controlled tenant.

## Workflow versionId table (current)

| Workflow | versionId | nodes / connections | active |
|---|---|---|---|
| WF-TR-01 | `88d2d45b…` | 24 / 25 | true |
| WF-EC-01 | `d25e4316…` | 11 / 10 | true |
| WF-OR-01 | `f4925ede…` | 13 / 12 | true |
| WF-PL-01 | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` (v2.6) | 16 / 16 | true |
| WF-DI-01 | `a1f9eaa2…` | 16 / 16 | true |
| WF-ME-01 | `d2197ed5-5f2d-454e-a540-fd464f526d2e` | 66 / 88 | true |
| WF-RA-01 | `4a2be8b4…` | 16 / 16 | true |
| WF-SU-01 | `4e7bc0d1…` | 18 / 19 | true |
| WF-RC-01 | `6d3f5208…` | 18 / 17 | true |
| WF-MO-01 | `4e0163b2…` | 18 / 18 | true |
| **WF-RD-01** | **`9744e3a6-6824-42fd-867c-91622b4722b4`** | **11 / 14** | **false** |

## DB state (current)

| Table | Value |
|---|---|
| `public.reminders` count / max(created_at) | **1 / 2026-04-13 20:17:13.620582+00** (byte-identical to pre-Phase-1 baseline) |
| `public.outbound_delivery_ledger_claude_mcp` rows | **0** (Phase 1 v1 audits via `task_reminder_deliveries`, not via MO ledger) |
| `public.task_reminder_deliveries` rows | 26 (24 Phase 1 dry-run + 1 Phase 2 fixture `sent` + 1 aggregator-fix verify) |
| `public.task_reminder_deliveries` rows with `delivery_status='sent'` | 1 (the Phase 2 fixture, kept as audit) |
| Tenant B `metadata.telegram_chat_id` | NULL (removed post-Phase-2-restore) |

## Open follow-ups (current)

| Follow-up | State |
|---|---|
| `REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE` | **OPEN — current next frontier**. Production gate, not rollout. |
| `reminder_module.{list,update,cancel}` ME stubs | DEFERRED per ADR. Phase 3 does NOT open the CRUD lane. |
| FULL_240 syntactic siblings | DEFERRED — same code path as proven L1 family samples |
| MO `MISSING_DELIVERY_TARGET` for e2e tenants | KNOWN_FIXTURE_LIMITATION |
| `improvement_requests.category` / `severity` columns | OUT OF SCOPE (would require schema migration) |
| WF-OR-01 §4 doc hygiene (F9 reclassification) | OPTIONAL, STILL OPEN |
