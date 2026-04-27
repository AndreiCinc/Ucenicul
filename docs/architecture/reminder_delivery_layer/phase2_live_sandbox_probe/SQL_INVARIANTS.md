# Phase 2 · SQL Invariants

## Status

**No live SQL probe executed (mission halted at the gate).** The
read-only preflight queries are recorded below as evidence that the
DB state was inspected only — no DML applied during this run.

## Preflight (SELECT-only) — verified 2026-04-27

```sql
SELECT
  (SELECT count(*)::int FROM information_schema.tables
    WHERE table_schema='public' AND table_name='task_reminder_deliveries') AS trd_table_exists,
  (SELECT count(*)::int FROM public.task_reminder_deliveries) AS trd_rows_total,
  (SELECT count(*)::int FROM reminders) AS reminders_count,
  (SELECT max(created_at)::text FROM reminders) AS reminders_max_created,
  (SELECT count(*)::int FROM outbound_delivery_ledger_claude_mcp) AS outbound_ledger_count,
  (SELECT (metadata->>'telegram_chat_id') FROM tenants WHERE id='eee0e2e0-…000b'::uuid) AS tgt_tenant_b;

-- Result:
--   trd_table_exists      = 1
--   trd_rows_total        = 24
--   reminders_count       = 1
--   reminders_max_created = 2026-04-13 20:17:13.620582+00
--   outbound_ledger_count = 0
--   tgt_tenant_b          = NULL  ← sandbox target NOT seeded
```

These match the Phase 1 post-state byte-for-byte.

## Invariants that WILL be checked when the live probe runs

(Derived from mission brief §SQL invariants Phase 2.)

### INV-1 — `public.reminders` byte-identical pre/post

```sql
SELECT count(*)::int, max(created_at)::text FROM public.reminders;
```

Expected: `1, 2026-04-13 20:17:13Z` unchanged. (Verified pre-mission ✅; post-mission still 1 / 2026-04-13.)

### INV-2 — `outbound_delivery_ledger_claude_mcp` unchanged

```sql
SELECT count(*)::int FROM public.outbound_delivery_ledger_claude_mcp;
```

Expected: 0 unchanged. (Verified pre-mission ✅.)

### INV-3 — exactly one `sent` row for the fixture (when probe runs)

```sql
SELECT count(*)::int
FROM public.task_reminder_deliveries
WHERE task_id   = '<fixture_task_id>'::uuid
  AND tenant_id = 'eee0e2e0-0000-0000-0000-00000000000b'::uuid
  AND delivery_status = 'sent';
```

Expected: 1.

### INV-4 — no duplicate occurrence

```sql
SELECT count(*)::int,
       count(DISTINCT (tenant_id, task_id, due_occurrence_iso))::int
FROM public.task_reminder_deliveries
WHERE task_id = '<fixture_task_id>'::uuid;
```

Expected: 1, 1.

### INV-5 — provider_message_ref populated, sent_at + attempts present

```sql
SELECT provider_message_ref, sent_at, attempts
FROM public.task_reminder_deliveries
WHERE task_id = '<fixture_task_id>'::uuid;
```

Expected:
- `sent_at IS NOT NULL`.
- `attempts >= 1`.
- `provider_message_ref` populated if Telegram returns a message id.

### INV-6 — only sandbox tenant changed during probe window

```sql
SELECT tenant_id, count(*)::int
FROM public.task_reminder_deliveries
WHERE created_at >= '<probe_start_iso>'::timestamptz
GROUP BY tenant_id;
```

Expected: only tenant B with count=1.

### INV-7 — workflow `active=false` post-probe

`mcp__n8n__verify_workflow id=nc7rTC3hjO9QqbXs → active=false`. (Verified pre-probe ✅.)

### INV-8 — NoOp restored if reversible patch chosen

`RD_Live_Send_PLACEHOLDER.type = 'n8n-nodes-base.noOp'` after
restore. (Verified pre-mission ✅; post-mission still NoOp because
no patch was applied this run.)
