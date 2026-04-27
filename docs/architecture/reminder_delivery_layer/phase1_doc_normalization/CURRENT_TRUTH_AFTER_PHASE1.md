# Current Truth After Phase 1 Doc Normalization

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
- **`REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE`** (current latest)

## Phase 1 facts (canonical)

- Phase 1 closed with: `REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE`.
- Phase 1 created the table `public.task_reminder_deliveries` (additive migration).
- Phase 1 created the canonical workflow `WF-RD-01_Reminder_Delivery_Scheduler`.

### WF-RD-01 properties

| Field | Value |
|---|---|
| n8n id | `nc7rTC3hjO9QqbXs` |
| versionId | `894ad514-7ce7-4b35-90d4-6c5190f01408` |
| nodes | 11 |
| connections | 14 |
| active | **false** |
| availableInMCP | true |

### Live send status

- `RD_Live_Send_PLACEHOLDER` is `n8n-nodes-base.noOp`.
- 0 external Telegram sends to date.
- 0 fake `tenants.metadata.telegram_chat_id` seeded.

### DB invariants (current truth)

- `public.reminders` count=1, max(created_at)=2026-04-13 20:17:13.620582+00 — **unchanged** (and remains the ADR-protected invariant; the new layer never writes here).
- `public.outbound_delivery_ledger_claude_mcp` count=0 — unchanged (Phase 1 does not call MO).
- `public.task_reminder_deliveries` rows: 24 (all `skipped_missing_target` from the 3 dry-run probes; e2e tenants have NULL `telegram_chat_id`).
- `public.tasks`: byte-identical relative to NEXT_3_FOLLOWUPS post-state.

### Workflow versionId table (current)

| Workflow | versionId | nodes / connections | active |
|---|---|---|---|
| WF-TR-01 (`wI8hpSROxQI0zC9f`) | `88d2d45b…` | 24 / 25 | true |
| WF-EC-01 (`v9jih4jqeXpOJOiH`) | `d25e4316…` | 11 / 10 | true |
| WF-OR-01 (`KhGmNpi0ZDmrnz8W`) | `f4925ede…` | 13 / 12 | true |
| WF-PL-01 (`RwToPLa1ErHl2tUi`) | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` (v2.6) | 16 / 16 | true |
| WF-DI-01 (`abqYINcXr3JAhGGk`) | `a1f9eaa2…` | 16 / 16 | true |
| WF-ME-01 (`uq26nh1grIpnHju0`) | `d2197ed5-5f2d-454e-a540-fd464f526d2e` | 66 / 88 | true |
| WF-RA-01 (`5RcNLtxNjAHJsZPE`) | `4a2be8b4…` | 16 / 16 | true |
| WF-SU-01 (`ENiYNfL3ul8AmmCB`) | `4e7bc0d1…` | 18 / 19 | true |
| WF-RC-01 (`TClXgmO8H8zsSwMb`) | `6d3f5208…` | 18 / 17 | true |
| WF-MO-01 (`OooZdC0DgsDR6gm0`) | `4e0163b2…` | 18 / 18 | true |
| **WF-RD-01 (`nc7rTC3hjO9QqbXs`)** | **`894ad514-7ce7-4b35-90d4-6c5190f01408`** | **11 / 14** | **false** |

## Open follow-ups (current)

| Follow-up | State |
|---|---|
| `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE` | **OPEN — current next frontier**. Gated on operator providing a sandbox `telegram_chat_id`. |
| `reminder_module.{list,update,cancel}` ME stubs | **DEFERRED** per ADR-REMINDER-AS-TASK-LAYER. Phase 1 v1 does NOT open the CRUD lane on `public.reminders`. |
| FULL_240 syntactic siblings (L1-V3/V4 + L2..L5 × V1..V4) | DEFERRED — same code path as proven L1 family samples |
| MO `MISSING_DELIVERY_TARGET` for e2e tenants | KNOWN_FIXTURE_LIMITATION |
| `improvement_requests.category` / `severity` columns | OUT OF SCOPE (would require schema migration) |
| WF-OR-01 contracts §4 doc hygiene (F9 reclassification) | OPTIONAL, STILL OPEN (no functional impact) |

## Closed follow-ups (must NOT be listed as open)

- ~~`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`~~ → CLOSED 2026-04-27
- ~~`IMPROVEMENT_MODULE_LIST_FOLLOWUP`~~ → CLOSED 2026-04-27
- ~~`F14`, `IMPROVEMENT-MODULE-LIVE-EXECUTION`, `AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP`, `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`, `OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP`, `MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`, `C11_REPLAY_GROUPING_TARGETED_RERUN`~~ → all closed earlier (see lineage in §0 of reconciliation).
- ~~Phase 2 rich matrix run~~ → DONE 2026-04-26 by FULL_240_VARIANT_SWEEP / FULL_240_RERUN.

## Authoritative cross-references

- `docs/architecture/decisions/ADR-REMINDER-AS-TASK-LAYER.md` — ADR, unchanged; consistent with Phase 1.
- `docs/architecture/Module_Registry_Ucenicul.md` — top-of-file banner + `reminder_module` 2026-04-27 banner.
- `docs/architecture/n8n_Workflow_Mapping.md` — §11 declaration of WF-RD-01.
- `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` — §0 Current truth + §0.1 Open blockers + §0.2 Continuation path.
- `docs/architecture/reminder_delivery_layer/phase1_schema_scheduler/CLOSEOUT.md` — Phase 1 closeout.
- `docs/architecture/reminder_delivery_layer/phase1_schema_scheduler/LIVE_SANDBOX_PROBE.md` — Phase 2 runbook.
- `db/migrations/20260427_add_task_reminder_deliveries.{up,down}.sql` — applied migration + rollback.
