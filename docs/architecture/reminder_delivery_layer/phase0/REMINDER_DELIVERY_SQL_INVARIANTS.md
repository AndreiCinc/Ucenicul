# REMINDER_DELIVERY_LAYER · Phase 0 · SQL Invariants

All invariants run as SELECT-only.

## INV-1 — candidate query is tenant-scoped

```sql
SELECT count(*)::int FROM tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND status='open' AND due_at IS NOT NULL AND due_at <= NOW()
   AND COALESCE(metadata->'reminder_delivery'->>'status','pending') <> 'sent';
```

Expected: 22 (default tenant). **Result: 22 ✅**

```sql
-- Cross-tenant: F7 (tenant A) must NOT appear in default selection
SELECT count(*)::int FROM tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND id='aaaaaaaa-0001-4000-8000-000000000007'::uuid;
```

Expected: 0. **Result: 0 ✅**

## INV-2 — exclusions hold

```sql
SELECT count(*)::int FROM tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND status='open' AND due_at IS NOT NULL AND due_at <= NOW()
   AND COALESCE(metadata->'reminder_delivery'->>'status','pending') <> 'sent'
   AND id IN ('aaaaaaaa-0001-4000-8000-000000000003'::uuid,    -- F3 future
              'aaaaaaaa-0001-4000-8000-000000000004'::uuid,    -- F4 done
              'aaaaaaaa-0001-4000-8000-000000000005'::uuid,    -- F5 cancelled
              'aaaaaaaa-0001-4000-8000-000000000006'::uuid,    -- F6 already sent
              'aaaaaaaa-0001-4000-8000-000000000008'::uuid);   -- F8 no due_at
```

Expected: 0 (none of F3..F6, F8 should be selected). **Result: 0 ✅**

## INV-3 — `tasks` not mutated by dry-run

```sql
SELECT count(*)::int FROM tasks
 WHERE id::text LIKE 'aaaaaaaa-0001-%' AND updated_at > created_at;
```

Expected: 0. **Result: 0 ✅**

## INV-4 — `reminders` baseline preserved

```sql
SELECT count(*)::int FROM reminders;
SELECT max(created_at)::text FROM reminders;
```

Expected: 1, 2026-04-13 20:17:13Z. **Result: 1, 2026-04-13 20:17:13.620582+00 ✅**

## INV-5 — `outbound_delivery_ledger_claude_mcp` empty (no Phase 0 inserts)

```sql
SELECT count(*)::int FROM outbound_delivery_ledger_claude_mcp;
```

Expected: 0. **Result: 0 ✅**

## INV-6 — only F6 carries `metadata.reminder_delivery` (the exclusion-test seed)

```sql
SELECT count(*)::int FROM tasks WHERE metadata ? 'reminder_delivery';
```

Expected: 1 (F6 only — seeded intentionally with `status='sent'` to
test the exclusion). **Result: 1 ✅**

## INV-7 — workflow versionIds unchanged

| Workflow | Pre this mission | Post this mission |
|---|---|---|
| WF-PL-01 | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` ✅ |
| WF-ME-01 | `d2197ed5-5f2d-454e-a540-fd464f526d2e` | `d2197ed5-5f2d-454e-a540-fd464f526d2e` ✅ |
| WF-MO-01 | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | `4e0163b2-e176-40ad-ac33-a8438d7c2147` ✅ |

## INV-8 — schema mutation count

0 DDL applied. **Result: 0 ✅**

## INV-9 — no new workflow created

`search_workflows query=reminder|scheduler|cron` → 0 hits before AND
after the mission. **Result: 0 ✅** (Phase 0 explicitly produces no
new workflow; the proposed `WF-RD-01_Reminder_Delivery_Scheduler` is
deferred to Phase 1.)

## Summary

| Invariant | Verdict |
|---|---|
| INV-1 candidate query tenant-scoped | ✅ |
| INV-2 exclusions hold | ✅ |
| INV-3 tasks not mutated | ✅ |
| INV-4 reminders baseline preserved | ✅ |
| INV-5 outbound ledger empty | ✅ |
| INV-6 only F6 carries reminder_delivery meta | ✅ |
| INV-7 workflow versionIds unchanged | ✅ |
| INV-8 schema mutation count = 0 | ✅ |
| INV-9 no new workflow created | ✅ |
