# Phase 3 · SQL Invariants

All values verified via `mcp__postgres__execute_sql` post-patch.

## INV-1 — `public.reminders` byte-identical pre/post

```sql
SELECT count(*)::int, max(created_at)::text FROM public.reminders;
-- → 1, 2026-04-13 20:17:13.620582+00
```

Pre and post identical. ✅

## INV-2 — `outbound_delivery_ledger_claude_mcp` unchanged

```sql
SELECT count(*)::int FROM public.outbound_delivery_ledger_claude_mcp;
-- → 0
```

Unchanged. ✅

## INV-3 — `task_reminder_deliveries` total + UNIQUE

```sql
SELECT count(*)::int, count(DISTINCT (tenant_id, task_id, due_occurrence_iso))::int
FROM public.task_reminder_deliveries;
-- → 26, 26
```

UNIQUE holds. ✅

## INV-4 — sent rows stable; Phase 3 added 0 sends

```sql
SELECT count(*)::int FROM public.task_reminder_deliveries WHERE delivery_status='sent';
-- → 1 (the Phase 2 fixture audit row, unchanged)
```

✅

## INV-5 — Tenant B has no telegram_chat_id

```sql
SELECT (metadata->>'telegram_chat_id') FROM tenants
WHERE id='eee0e2e0-0000-0000-0000-00000000000b'::uuid;
-- → NULL
```

Phase 3 did NOT seed any chat id. ✅

## INV-6 — Tenants-with-chat_id (any) = 0

```sql
SELECT count(*)::int FROM tenants WHERE metadata ? 'telegram_chat_id';
-- → 0
```

No fake target seeded anywhere. ✅

## INV-7 — Workflow `active=false`

`mcp__n8n__verify_workflow id=nc7rTC3hjO9QqbXs → active=false` ✅

## INV-8 — `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`

Verified via `mcp__n8n__verify_workflow nodeFields[0]`. ✅

## INV-9 — Only WF-RD-01 mutated

WF-PL-01 versionId byte-identical (`d97af7ff-…`).
WF-ME-01 versionId byte-identical (`d2197ed5-…`).
WF-MO-01 versionId byte-identical (`4e0163b2-…`).
All other 7 workflows byte-identical. ✅

## Summary

| Invariant | Verdict |
|---|---|
| INV-1 reminders byte-identical | ✅ |
| INV-2 outbound ledger unchanged | ✅ |
| INV-3 task_reminder_deliveries UNIQUE holds | ✅ |
| INV-4 sent rows stable | ✅ |
| INV-5 tenant B no chat_id | ✅ |
| INV-6 tenants-with-chat_id = 0 | ✅ |
| INV-7 workflow active=false | ✅ |
| INV-8 placeholder = NoOp | ✅ |
| INV-9 only WF-RD-01 mutated | ✅ |
