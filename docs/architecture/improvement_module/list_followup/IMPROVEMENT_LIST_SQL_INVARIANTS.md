# IMPROVEMENT_MODULE_LIST_FOLLOWUP · SQL Invariants

## INV-1 — list probes do not write

```sql
-- IL-001..IL-004 + IL-005 (the only tenant default writer is IL-005 capture)
SELECT count(*)::int FROM improvement_requests
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND created_at >= '2026-04-27T08:24:00Z';
-- Expected: exactly 1 (IL-005 capture). Result: 1 ✅
```

## INV-2 — cross-tenant write blocked

```sql
SELECT count(*)::int FROM improvement_requests
 WHERE tenant_id='eee0e2e0-0000-0000-0000-00000000000b'::uuid
   AND created_at >= '2026-04-27T08:24:00Z';
```

Expected: 0. **Result: 0 ✅**

## INV-3 — task regression writes 1

```sql
SELECT count(*)::int FROM tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND created_at >= '2026-04-27T08:24:00Z';
```

Expected: 1. **Result: 1 ✅**

## INV-4 — store_memory regression writes 1

```sql
SELECT count(*)::int FROM memory_items
 WHERE source_thread_id='83485a49-3358-4b69-8805-d96f94e65fb0'::uuid;
```

Expected: 1. **Result: 1 ✅**

## INV-5 — list/feedback probes write no memory rows

```sql
SELECT count(*)::int FROM memory_items
 WHERE source_thread_id IN (
  '83ce3154-737b-4a96-88e6-5e349875d94a'::uuid,
  'e2f4da87-9910-4c8b-8956-fd52a67da968'::uuid,
  '609e6ba6-72f3-4e84-8faa-82c9ef483d93'::uuid,
  'af2e535e-5db4-476c-8c3f-7830939113be'::uuid,
  '1648ad9c-d407-4959-8cf5-68009cf146c7'::uuid,
  '9ee8a9d2-f66d-4cd7-8446-db90e3686a71'::uuid);
```

Expected: 0. **Result: 0 ✅**

## INV-6 — cross-tenant tenant-leak probe (IL-004)

```sql
SELECT count(*)::int FROM execution_contexts
 WHERE thread_id='af2e535e-5db4-476c-8c3f-7830939113be'::uuid
   AND tenant_id<>'eee0e2e0-0000-0000-0000-00000000000b'::uuid;
```

Expected: 0. **Result: 0 ✅** (IL-004 EC exists only in tenant B).

## INV-7 — `public.reminders` unchanged

```sql
SELECT count(*)::int FROM reminders;
SELECT max(created_at)::text FROM reminders;
```

Expected: 1, 2026-04-13 20:17:13Z. **Result: 1, 2026-04-13 20:17:13.620582+00 ✅**

## INV-8 — workflow versionIds

| Workflow | Pre this mission | Post this mission | Δ |
|---|---|---|---|
| WF-PL-01 | `4e0406c3-9813-4374-9178-581409c6bdc4` | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` | jsCode rewrite v2.5 → v2.6 (16n/16c) |
| WF-ME-01 | `328b2b81-58e6-4003-8966-4159d695cfda` | `d2197ed5-5f2d-454e-a540-fd464f526d2e` | +4 nodes / +7 connections (62n/81c → 66n/88c) |

## INV-9 — schema mutation count

0 DDL applied. **Result: 0 ✅**

## Summary

| Invariant | Verdict |
|---|---|
| INV-1 list probes are read-only | ✅ |
| INV-2 cross-tenant write blocked | ✅ |
| INV-3 task regression writes 1 | ✅ |
| INV-4 store_memory regression writes 1 | ✅ |
| INV-5 no memory writes from list/feedback/task probes (other than R-store) | ✅ |
| INV-6 cross-tenant EC isolation | ✅ |
| INV-7 reminders baseline preserved | ✅ |
| INV-8 only WF-PL-01 (jsCode) and WF-ME-01 changed | ✅ |
| INV-9 schema mutation count = 0 | ✅ |
