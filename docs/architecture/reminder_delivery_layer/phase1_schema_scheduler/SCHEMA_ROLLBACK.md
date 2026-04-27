# Phase 1 · Schema Rollback

## Rollback file

Path: `db/migrations/20260427_add_task_reminder_deliveries.down.sql`

```sql
BEGIN;

DROP INDEX IF EXISTS public.task_reminder_deliveries_task_idx;
DROP INDEX IF EXISTS public.task_reminder_deliveries_status_idx;
DROP TABLE IF EXISTS public.task_reminder_deliveries;

COMMIT;
```

(The PK and UNIQUE indexes are dropped automatically with the table.)

## Properties

- **Idempotent**: `DROP INDEX IF EXISTS` + `DROP TABLE IF EXISTS`.
- **Loss budget**: dropping the table loses all `task_reminder_deliveries`
  rows. **Acceptable** because Phase 1 v1 is opt-in and operators can
  replay deliveries safely once the new infrastructure is back; any
  in-flight delivery state is reconstructable from `tasks.due_at` plus
  the candidate query.
- **No effect on `public.tasks`** thanks to `ON DELETE CASCADE` only
  going one direction (deletes in tasks → cascade to deliveries; not
  the other way).
- **No effect on `public.reminders`**.
- **No effect on `public.outbound_delivery_ledger_claude_mcp`**.

## When to roll back

- A blocker is discovered that requires re-shaping the table (e.g.,
  switching to a different `due_occurrence` granularity). Run rollback,
  edit the up.sql, re-apply.
- The Phase 1 v1 design is superseded by a later mission.
- A production incident requires stopping all reminder delivery while
  preserving everything else; in that case prefer disabling the
  workflow (`active=false`) before dropping the table.

## How to apply rollback safely

1. Disable WF-RD-01 first: `n8n-patch deactivate nc7rTC3hjO9QqbXs`.
2. Confirm no in-flight delivery: `SELECT count(*) FROM public.task_reminder_deliveries WHERE delivery_status='pending';` — should be 0 (or operator-acknowledged).
3. Run the rollback SQL from the file above.
4. Verify: `SELECT to_regclass('public.task_reminder_deliveries');` returns NULL.
