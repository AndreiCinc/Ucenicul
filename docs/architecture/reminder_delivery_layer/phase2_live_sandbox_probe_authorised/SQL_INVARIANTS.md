# Phase 2 Authorised · SQL Invariants

All values verified via `mcp__postgres__execute_sql` after restore.

## INV-1 — `public.reminders` byte-identical pre/post

```sql
SELECT count(*)::int, max(created_at)::text FROM public.reminders;
```

Pre: `1, 2026-04-13 20:17:13.620582+00`. Post: `1, 2026-04-13 20:17:13.620582+00`. ✅

## INV-2 — `outbound_delivery_ledger_claude_mcp` unchanged

```sql
SELECT count(*)::int FROM public.outbound_delivery_ledger_claude_mcp;
```

Pre: 0. Post: 0. ✅

## INV-3 — exactly one `sent` row for fixture

```sql
SELECT count(*)::int FROM public.task_reminder_deliveries
 WHERE task_id='9d39ae1a-9354-42ca-ba78-66bc6d2a6b78'::uuid
   AND tenant_id='eee0e2e0-0000-0000-0000-00000000000b'::uuid
   AND delivery_status='sent';
```

Result: **1** ✅

## INV-4 — no duplicate occurrence

```sql
SELECT count(*)::int, count(DISTINCT (tenant_id, task_id, due_occurrence_iso))::int
FROM public.task_reminder_deliveries
WHERE task_id='9d39ae1a-9354-42ca-ba78-66bc6d2a6b78'::uuid;
```

Result: **1, 1** ✅

## INV-5 — provider_ref + sent_at + attempts populated

```sql
SELECT provider_message_ref, sent_at, attempts, delivery_target
FROM public.task_reminder_deliveries
WHERE task_id='9d39ae1a-9354-42ca-ba78-66bc6d2a6b78'::uuid;
```

Result:

- `provider_message_ref = '546'` ✅
- `sent_at = 2026-04-27 12:23:04.122+00` ✅
- `attempts = 1` ✅
- `delivery_target = '5101664726'` ✅

## INV-6 — only sandbox tenant changed during probe window

```sql
SELECT tenant_id, count(*)::int FROM public.task_reminder_deliveries
 WHERE created_at >= '2026-04-27T12:20:00Z'
GROUP BY tenant_id;
```

Result: only `eee0e2e0-0000-0000-0000-00000000000b` (count=1). 0 rows
in any other tenant. ✅

## INV-7 — workflow `active=false` post-mission

`mcp__n8n__verify_workflow id=nc7rTC3hjO9QqbXs → active=false` ✅

## INV-8 — NoOp restored

`mcp__n8n__verify_workflow → RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'` ✅

## INV-9 — sandbox `telegram_chat_id` removed from tenant B

```sql
SELECT (metadata->>'telegram_chat_id') FROM tenants WHERE id='eee0e2e0-0000-0000-0000-00000000000b'::uuid;
-- → NULL
```

✅

## INV-10 — fixture soft-cancelled

```sql
SELECT status FROM tasks WHERE id='9d39ae1a-9354-42ca-ba78-66bc6d2a6b78'::uuid;
-- → cancelled
```

✅

## Summary

| Invariant | Verdict |
|---|---|
| INV-1 reminders byte-identical | ✅ |
| INV-2 outbound ledger byte-identical | ✅ |
| INV-3 exactly one `sent` row for fixture | ✅ |
| INV-4 no duplicate occurrence | ✅ |
| INV-5 provider_ref / sent_at / attempts populated | ✅ |
| INV-6 only sandbox tenant changed in window | ✅ |
| INV-7 workflow active=false | ✅ |
| INV-8 NoOp restored | ✅ |
| INV-9 sandbox chat_id removed | ✅ |
| INV-10 fixture soft-cancelled | ✅ |
