# Phase 1 · Closeout

Mission: `REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION`.
Date: 2026-04-27 (autonomous run).
Predecessor: `REMINDER_DELIVERY_PHASE0_DRY_RUN_READY = TRUE`.

## Verdict

**`REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE`**

All Phase 1 work GREEN; the controlled live sandbox probe was NOT
executed because no sandbox `telegram_chat_id` was authorised in this
run (per the mission brief, this downgrade-to-partial is explicitly
allowed and does not count as a blocker).

## Schema delta

- **+1 table:** `public.task_reminder_deliveries` (15 columns).
- **+2 secondary indexes** plus the auto-created PK + UNIQUE
  indexes (4 total).
- **+1 FK** with `ON DELETE CASCADE` to `public.tasks(id)`.
- **+1 UNIQUE** on `(tenant_id, task_id, due_occurrence_iso)`.
- 0 changes to `public.tasks`, `public.reminders`,
  `public.outbound_delivery_ledger_claude_mcp`, or any other table.
- Rollback file present and valid:
  `db/migrations/20260427_add_task_reminder_deliveries.down.sql`.

## Workflow delta

- **+1 new canonical workflow:**
  `WF-RD-01_Reminder_Delivery_Scheduler`
  (id `nc7rTC3hjO9QqbXs`, versionId `894ad514-7ce7-4b35-90d4-6c5190f01408`,
  11 nodes / 14 connections, **active=false**, `availableInMCP=true`).
- 0 changes to all 10 pre-existing canonical workflows (TR, EC, OR,
  PL, DI, ME, RA, SU, RC, MO).
- 0 duplicate workflows.
- 0 Path 5 invocations.
- 0 unauthorised MCP writes (canonical V2-028 local CLI used for
  import + replace).

## Side-effect summary

| Bucket | Pre-mission | Post-mission | Δ |
|---|---|---|---|
| `public.tasks` count | 98 | 98 | 0 |
| `public.tasks` rows mutated | 0 | 0 | 0 |
| `public.reminders` count / max(created_at) | 1 / 2026-04-13 20:17:13Z | 1 / 2026-04-13 20:17:13.620582+00 | **0 / unchanged** |
| `public.outbound_delivery_ledger_claude_mcp` rows | 0 | 0 | 0 |
| `public.task_reminder_deliveries` rows | (table did not exist) | 24 (all `skipped_missing_target`) | +24 |
| Distinct tuples in `task_reminder_deliveries` | — | 24 | matches row count → UNIQUE holds |
| External Telegram sends attempted | 0 | 0 | 0 |
| External Telegram sends succeeded | 0 | 0 | 0 |
| Workflow versionIds for upstream WFs | (see REGRESSION_RESULTS.md) | byte-identical | 0 |
| New workflows | 0 | 1 | +1 |

## Per-mission acceptance checklist

- [x] Schema migration applied (additive, no other tables touched).
- [x] Rollback documented and valid.
- [x] `WF-RD-01` created.
- [x] Workflow inactive/dry-run-safe by default.
- [x] Dry-run GREEN (24 candidates, all `skipped_missing_target` for e2e tenants).
- [x] Missing-target GREEN.
- [x] Backlog logic GREEN by unit test (live evidence not surfaceable
      because every e2e tenant has NULL target ⇒ `missing_target` wins).
- [x] Idempotency GREEN (UNIQUE replay proven; UPSERT-DO-UPDATE
      attempt-increment proven via tick 3).
- [x] `public.reminders` unchanged.
- [x] No duplicate sends (live placeholder is NoOp; ledger blocks
      duplicates by UNIQUE).
- [ ] Sandbox live probe — **not run; explicit READY_EXCEPT_LIVE_SANDBOX_PROBE downgrade.**

## Live execution summary

| TR exec | Phase | Outcome |
|---|---|---|
| 10796 | Tick 1 (initial dry-run) | 24 ledger rows produced, all `skipped_missing_target`. |
| 10797 | Tick 2 (idempotency probe) | 0 new rows (NOT IN exclusion blocks). |
| 10798 | Tick 3 (after forcing F1 to `pending`) | 0 new rows; F1's `attempts` 1 → 2 (UPSERT-DO-UPDATE proven). |

## Documents created (this mission)

- `MISSION_BRIEF.md`
- `READ_STATUS.md`
- `SCHEMA_MIGRATION.md`
- `SCHEMA_ROLLBACK.md`
- `WORKFLOW_DESIGN.md`
- `WORKFLOW_PATCH_LOG.md`
- `DELIVERY_TARGET_POLICY.md`
- `BACKLOG_POLICY.md`
- `IDEMPOTENCY_AND_RETRY_POLICY.md`
- `DRY_RUN_RESULTS.md`
- `LIVE_SANDBOX_PROBE.md`
- `SQL_INVARIANTS.md`
- `REGRESSION_RESULTS.md`
- `P0_STOP_CONDITIONS.md`
- `CLOSEOUT.md` (this file)
- `artifacts/build_wf_rd_01.mjs`
- `artifacts/WF-RD-01.json`
- `artifacts/WF-MO-01_pre.json` (snapshot)
- `artifacts/classify_unit_test.mjs`
- `db/migrations/20260427_add_task_reminder_deliveries.up.sql`
- `db/migrations/20260427_add_task_reminder_deliveries.down.sql`

Plus reconciliation update + Module Registry banner update +
`n8n_Workflow_Mapping.md` declaration of `WF-RD-01`.

## Next recommended frontier

`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`:

1. Operator authorises a sandbox Telegram chat id.
2. Insert the chat id on tenant B's metadata (single-tenant gating
   so the rest of the system is unaffected).
3. Replace `RD_Live_Send_PLACEHOLDER` (NoOp) with
   `n8n-nodes-base.telegram` configured with the sandbox bot.
4. Insert one fixture task in tenant B with `due_at=NOW()`.
5. Manually fire WF-RD-01 with `mode='live'` + `live_allowed=true`.
6. Verify exactly one row in `public.task_reminder_deliveries`
   marked `sent` with `provider_message_ref` populated; verify the
   sandbox chat received the reminder text.
7. Revert metadata + delete fixture + restore NoOp.
8. Sign-off, mark `READY_FOR_PRODUCTION_TENANT_ONBOARDING`.
