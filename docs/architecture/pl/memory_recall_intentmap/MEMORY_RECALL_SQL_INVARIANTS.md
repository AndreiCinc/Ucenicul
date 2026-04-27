# MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP · SQL Invariants

All invariants run as SELECT-only post-fires.

## INV-1 — recall probes are read-only

```sql
SELECT count(*)::int FROM memory_items WHERE source_thread_id IN (
  '5d597dcc-0379-4d51-831c-263cf53e2178'::uuid,
  'cec3f33e-b189-43cd-855f-196af1f7ffb8'::uuid,
  '48596462-3ba9-4d44-8ce9-7912436b2093'::uuid);
```

Expected: 0. **Result: 0 ✅**

## INV-2 — search_memory regression read-only

```sql
SELECT count(*)::int FROM memory_items
 WHERE source_thread_id='d94adc01-8eb0-47c2-86ca-07176c5bc5f6'::uuid;
```

Expected: 0. **Result: 0 ✅**

## INV-3 — store_memory regression writes 1 row

```sql
SELECT count(*)::int FROM memory_items
 WHERE source_thread_id='9b93969d-bcd2-4575-8bea-5cd200c24a1d'::uuid;
```

Expected: 1. **Result: 1 ✅**

## INV-4 — create_task regression writes 1 row

```sql
SELECT count(*)::int FROM tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND title ILIKE 'review pull request%' AND created_at >= '2026-04-27T08:00:00Z';
-- Or any task created from R-2:
SELECT id, title FROM tasks WHERE created_at >= '2026-04-27T08:14:00Z'
   AND tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid;
-- → 1 row: id=4a1d7657… title="un task: review pull request"
```

Expected: 1. **Result: 1 ✅** (PL's stripVerbPrefix didn't fully strip
"un task:" — cosmetic, unrelated to this mission).

## INV-5 — capture_feedback regression writes 1 row

```sql
SELECT count(*)::int FROM improvement_requests
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND user_message='Sugestie: adaugă export CSV.';
```

Expected: 1. **Result: 1 ✅**

## INV-6 — cross-tenant recall blocked

```sql
SELECT count(*)::int FROM execution_contexts
 WHERE thread_id='48596462-3ba9-4d44-8ce9-7912436b2093'::uuid
   AND tenant_id='eee0e2e0-0000-0000-0000-00000000000b'::uuid;
-- → 1 (tenant B's own EC)

SELECT count(*)::int FROM execution_contexts
 WHERE thread_id='48596462-3ba9-4d44-8ce9-7912436b2093'::uuid
   AND tenant_id<>'eee0e2e0-0000-0000-0000-00000000000b'::uuid;
-- → 0
```

Expected: tenant_B EC = 1, other-tenant EC = 0. **Result: 1, 0 ✅**

## INV-7 — `public.reminders` unchanged

```sql
SELECT count(*)::int FROM reminders;
SELECT max(created_at)::text FROM reminders;
```

Expected: 1, 2026-04-13 20:17:13Z. **Result: 1, 2026-04-13 20:17:13.620582+00 ✅**

## INV-8 — workflow versionIds

| Workflow | Pre | Post | Δ |
|---|---|---|---|
| WF-PL-01 | `839b1750…` | `4e0406c3…` | **patched** (this mission) |
| WF-ME-01 | `328b2b81…` | `328b2b81…` | unchanged |
| WF-OR-01, WF-EC-01, WF-TR-01, WF-DI-01, WF-RA-01, WF-SU-01, WF-RC-01, WF-MO-01 | — | — | byte-identical |

Expected: only WF-PL-01 changed (this mission), rest unchanged. ✅

## INV-9 — schema mutation

0 DDL applied. **Result: 0 ✅**

## Summary

| Invariant | Verdict |
|---|---|
| INV-1 recall read-only | ✅ |
| INV-2 search regression read-only | ✅ |
| INV-3 store regression writes 1 | ✅ |
| INV-4 task regression writes 1 | ✅ |
| INV-5 capture regression writes 1 | ✅ |
| INV-6 cross-tenant blocked | ✅ |
| INV-7 reminders unchanged | ✅ |
| INV-8 only WF-PL-01 changed | ✅ |
| INV-9 schema mutation = 0 | ✅ |
