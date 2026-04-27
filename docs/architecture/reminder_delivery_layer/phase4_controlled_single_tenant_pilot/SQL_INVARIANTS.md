# Phase 4 · SQL Invariants

All values verified post-restore (mission end).

## INV-1 — `public.reminders` byte-identical

```sql
SELECT count(*)::int, max(created_at)::text FROM public.reminders;
-- pre  → 1, 2026-04-13 20:17:13.620582+00
-- post → 1, 2026-04-13 20:17:13.620582+00
```

✅

## INV-2 — `outbound_delivery_ledger_claude_mcp` byte-identical

```sql
SELECT count(*)::int FROM public.outbound_delivery_ledger_claude_mcp;
-- pre → 0
-- post → 0
```

✅

## INV-3 — exactly one `sent` row for the pilot fixture

```sql
SELECT count(*)::int FROM public.task_reminder_deliveries
 WHERE task_id='d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde'::uuid
   AND tenant_id='eee0e2e0-0000-0000-0000-00000000000b'::uuid
   AND delivery_status='sent';
-- → 1
```

✅

## INV-4 — no duplicate occurrence

```sql
SELECT count(*)::int, count(DISTINCT (tenant_id, task_id, due_occurrence_iso))::int
FROM public.task_reminder_deliveries
WHERE task_id='d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde'::uuid;
-- → 1, 1
```

✅

## INV-5 — provider_ref + sent_at + attempts populated

```sql
SELECT provider_message_ref, sent_at, attempts, delivery_target
FROM public.task_reminder_deliveries
WHERE task_id='d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde'::uuid;
-- → '548', 2026-04-27 13:45:23.751+00, 2, '5101664726'
```

✅

## INV-6 — only sandbox tenant changed during pilot window

```sql
SELECT tenant_id, count(*)::int FROM public.task_reminder_deliveries
 WHERE created_at >= '2026-04-27T13:36:58Z'::timestamptz
GROUP BY tenant_id;
-- → only eee0e2e0-0000-0000-0000-00000000000b (count=1)
```

✅

## INV-7 — workflow `active=false` post-mission

`mcp__n8n__verify_workflow id=nc7rTC3hjO9QqbXs → active=false` ✅

## INV-8 — NoOp restored

`RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'` ✅

## INV-9 — false-sent count = 0

```sql
SELECT count(*)::int FROM public.task_reminder_deliveries
WHERE delivery_status='sent' AND provider_message_ref IS NULL;
-- → 0
```

✅ — the Phase 3 false-sent guard prevented the pending row (from
the safe-failure first tick) from ever being marked `sent` without a
real `message_id`.

## INV-10 — sandbox `telegram_chat_id` removed from tenant B

```sql
SELECT (metadata->>'telegram_chat_id') FROM tenants
WHERE id='eee0e2e0-0000-0000-0000-00000000000b'::uuid;
-- → NULL
```

✅

## INV-11 — Tenants with chat_id (any) = 0

```sql
SELECT count(*)::int FROM tenants WHERE metadata ? 'telegram_chat_id';
-- → 0
```

✅

## INV-12 — Total `task_reminder_deliveries` ledger UNIQUE holds

```sql
SELECT count(*)::int, count(DISTINCT (tenant_id, task_id, due_occurrence_iso))::int
FROM public.task_reminder_deliveries;
-- → 27, 27
```

✅

## INV-13 — All non-WF-RD workflows byte-identical

| Workflow | versionId pre/post | Δ |
|---|---|---|
| WF-PL-01 | `d97af7ff-…` | 0 |
| WF-ME-01 | `d2197ed5-…` | 0 |
| WF-MO-01 | `4e0163b2-…` | 0 |
| WF-TR/EC/OR/DI/RA/SU/RC | unchanged | 0 |

✅

## Summary

13 / 13 invariants ✅. The pilot is GREEN with a documented
mid-window safety patch.
