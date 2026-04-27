# Phase 1 · SQL Invariants

All invariants run via `mcp__postgres__execute_sql`.

## SCH-1 — `task_reminder_deliveries` table exists with 15 columns

```sql
SELECT count(*)::int FROM information_schema.columns
 WHERE table_schema='public' AND table_name='task_reminder_deliveries';
```

Expected: 15. **Result: 15 ✅**

## SCH-2 — FK ON DELETE CASCADE

```sql
SELECT con.conname, pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
 WHERE nsp.nspname='public' AND rel.relname='task_reminder_deliveries' AND con.contype='f';
-- → task_reminder_deliveries_task_id_fkey  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
```

✅

## SCH-3 — UNIQUE constraint

```sql
SELECT con.conname, pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
 WHERE rel.relname='task_reminder_deliveries' AND con.contype='u';
-- → UNIQUE (tenant_id, task_id, due_occurrence_iso)
```

✅

## SCH-4 — UNIQUE blocks duplicate inserts

```sql
INSERT INTO public.task_reminder_deliveries (tenant_id, task_id, due_occurrence_iso, …)
VALUES (…) ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO NOTHING;  -- inserts 1
INSERT … (same)
ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO NOTHING;             -- inserts 0
```

`rows_after_first_insert=1`, `rows_after_duplicate_insert=1`. ✅

## SCH-5 — `public.tasks` byte-identical post-mission

```sql
SELECT count(*) FROM tasks; -- 98 (unchanged)
SELECT count(*) FROM tasks WHERE id::text LIKE 'aaaaaaaa-0001-%' AND updated_at > created_at + INTERVAL '1 second';
-- → 0
```

✅

## SCH-6 — `public.reminders` byte-identical

```sql
SELECT count(*) FROM reminders;            -- 1 (unchanged)
SELECT max(created_at) FROM reminders;     -- 2026-04-13 20:17:13.620582+00 (unchanged)
```

✅

## SCH-7 — `public.outbound_delivery_ledger_claude_mcp` byte-identical

```sql
SELECT count(*) FROM outbound_delivery_ledger_claude_mcp;  -- 0 (unchanged)
```

✅

## CAND-1 — candidate query is tenant-scoped

The candidate query loaded 24 rows total: 22 from tenant default, 2
from tenant A, 0 from tenant B (per tick-1 RD_Load_Candidates output).
Tenant A's row F7 does NOT appear in tenant default's set (verified
`SELECT count(*) WHERE tenant_id='…0001' AND task_id='aaaaaaaa-…0007' = 0`).
✅

## LEDGER-1 — exactly one ledger row per (tenant, task, due_occurrence_iso)

```sql
SELECT count(*)::int AS total,
       count(DISTINCT (tenant_id, task_id, due_occurrence_iso))::int AS distinct_tuples
FROM public.task_reminder_deliveries;
-- → 24, 24
```

✅

## LEDGER-2 — UNIQUE replay (tick 2 produced 0 new rows)

Tick 1: 0 → 24 rows.
Tick 2: 24 → 24 rows (candidate query returned 0 candidates because
`NOT IN ('skipped_missing_target', …)` excluded all 24).
✅

## LEDGER-3 — UPSERT-DO-UPDATE increments attempts on re-fire

After resetting F1's row to `delivery_status='pending'`, tick 3
re-picked F1, upsert hit the DO UPDATE branch:

```
F1 row pre-tick3:  delivery_status='pending', attempts=1
F1 row post-tick3: delivery_status='skipped_missing_target', attempts=2
```

No new row created. Total ledger rows still 24. ✅

## WF-1 — only one new workflow created

`mcp__f2e8be41__search_workflows query="WF-RD"`:
```
[{"id":"nc7rTC3hjO9QqbXs","name":"WF-RD-01_Reminder_Delivery_Scheduler","active":false}]
count: 1
```
✅

## WF-2 — upstream workflows byte-identical

| Workflow | Pre-mission | Post-mission |
|---|---|---|
| WF-PL-01 | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` | unchanged ✅ |
| WF-ME-01 | `d2197ed5-5f2d-454e-a540-fd464f526d2e` | unchanged ✅ |
| WF-MO-01 | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | unchanged ✅ |

## WF-3 — WF-RD-01 imported INACTIVE

```
mcp__n8n__verify_workflow id=nc7rTC3hjO9QqbXs → active=false ✅
```

## Summary

| Invariant | Verdict |
|---|---|
| SCH-1 table + columns | ✅ |
| SCH-2 FK ON DELETE CASCADE | ✅ |
| SCH-3 UNIQUE constraint exists | ✅ |
| SCH-4 UNIQUE blocks duplicate inserts | ✅ |
| SCH-5 tasks byte-identical | ✅ |
| SCH-6 reminders byte-identical | ✅ |
| SCH-7 outbound ledger byte-identical | ✅ |
| CAND-1 candidate query tenant-scoped | ✅ |
| LEDGER-1 one row per (tenant, task, occurrence) | ✅ |
| LEDGER-2 second tick zero-new-rows | ✅ |
| LEDGER-3 attempts increment on re-fire | ✅ |
| WF-1 exactly one new workflow | ✅ |
| WF-2 upstream WFs unchanged | ✅ |
| WF-3 WF-RD-01 imported inactive | ✅ |
