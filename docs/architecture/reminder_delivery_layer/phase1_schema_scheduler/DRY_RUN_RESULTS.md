# Phase 1 · Dry-run Results

## Trigger

3 manual MCP-driven executions of `WF-RD-01_Reminder_Delivery_Scheduler`
in `mode='dry_run_audit'` (default) on 2026-04-27.

## Tick 1 (TR exec 10796)

- 24 candidates loaded by `RD_Load_Candidates`
  (22 tenant default + 2 tenant A + 0 tenant B).
- All 24 classified `missing_target` (e2e tenants have NULL
  `tenants.metadata.telegram_chat_id`).
- 24 ledger rows upserted with `delivery_status='skipped_missing_target'`,
  `attempts=1`.
- 0 calls to MO. 0 Telegram sends. 0 changes to `tasks` /
  `reminders` / `outbound_delivery_ledger_claude_mcp`.

Per-tenant breakdown (post tick 1):

| Tenant | Candidates | Ledger rows |
|---|---|---|
| default | 22 | 22 (all `skipped_missing_target`) |
| tenant A | 2 | 2 (all `skipped_missing_target`) |
| tenant B | 0 | 0 |

## Tick 2 (TR exec 10797) — idempotency probe

- 0 candidates loaded (`NOT IN ('sent','failed_terminal',
  'skipped_missing_target','skipped_backlog')` clause excluded all 24).
- 0 ledger rows changed.
- Total ledger rows still 24, distinct tuples still 24.

## Tick 3 (TR exec 10798) — UPSERT-DO-UPDATE probe

Setup: forced F1's ledger row back to `delivery_status='pending'` via
SQL UPDATE.

Result: `RD_Load_Candidates` re-picked F1, `RD_Upsert_Delivery_Row`
executed the `ON CONFLICT DO UPDATE` branch:

```
F1 row pre-tick3:  delivery_status='pending', attempts=1
F1 row post-tick3: delivery_status='skipped_missing_target', attempts=2
```

Confirms the retry-and-re-evaluate path works as designed.

## Outcome counts (cumulative across 3 ticks)

| Outcome | Count |
|---|---|
| skipped_missing_target | 24 |
| skipped_backlog | 0 (no e2e tenants have a target ⇒ missing_target wins) |
| dry_run | 0 (same reason) |
| dry_run_no_write | 0 |
| live | 0 |
| sent | 0 |
| failed | 0 |
| errors | 0 |

## Cross-tenant probe

F7 fixture (`aaaaaaaa-…0007`) was seeded in tenant A. Check:

```sql
SELECT count(*)::int FROM public.task_reminder_deliveries
WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
  AND task_id='aaaaaaaa-0001-4000-8000-000000000007'::uuid;
-- → 0
```

Tenant default ledger has 0 entries for F7. ✅

## Side-effect summary

| Bucket | Pre-mission | Post-mission | Δ |
|---|---|---|---|
| `public.task_reminder_deliveries` rows | 0 | **24** | +24 (all by WF-RD-01) |
| `public.task_reminder_deliveries` distinct (tenant_id, task_id, due_occurrence_iso) | 0 | 24 | matches row count → UNIQUE holds |
| `public.tasks` total | 98 | 98 | 0 |
| `public.tasks` rows with `updated_at > created_at + 1s` since mission start | 0 | 0 | 0 — no task mutated |
| `public.reminders` count | 1 | 1 | 0 |
| `public.reminders` max(created_at) | 2026-04-13 20:17:13Z | 2026-04-13 20:17:13.620582+00 | unchanged |
| `public.outbound_delivery_ledger_claude_mcp` rows | 0 | 0 | 0 |

## Workflow result envelope sample (RD_Aggregate_Result tick 1)

```json
{
  "status_kind": "success",
  "result_type": "reminder_delivery_summary",
  "workflow_name": "WF-RD-01_Reminder_Delivery_Scheduler",
  "run_started_at": "2026-04-27T09:54:09.057Z",
  "mode": "dry_run_audit",
  "live_allowed": false,
  "counts": {
    "candidates_seen": 24,
    "sent": 0, "failed": 0,
    "dry_run": 0, "dry_run_no_write": 0,
    "skipped_missing_target": 24,
    "skipped_backlog": 0,
    "errors": 0
  }
}
```
