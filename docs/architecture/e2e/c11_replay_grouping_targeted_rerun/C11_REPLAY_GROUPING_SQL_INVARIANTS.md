# C11_REPLAY_GROUPING_TARGETED_RERUN · SQL Invariants

All invariants run as SELECT-only against the live tenant default lane.

## INV-1 — replay group writes exactly one logical domain row

```sql
SELECT count(*)::int FROM memory_items
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND source_thread_id='8567245f-ae46-4cb8-847d-09f7c1a434a1'::uuid;
```

Expected: 1. **Result: 1 ✅**

## INV-3 — no extra execution_contexts created by replays

```sql
SELECT count(*)::int FROM execution_contexts
 WHERE thread_id='8567245f-ae46-4cb8-847d-09f7c1a434a1'::uuid;
SELECT count(DISTINCT thread_id)::int FROM execution_contexts
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND thread_id='8567245f-ae46-4cb8-847d-09f7c1a434a1'::uuid;
```

Expected: count=1, distinct=1. **Result: 1, 1 ✅** (4 fires → 1 EC).

## INV-5 — fresh control writes one legitimate additional row

```sql
SELECT count(*)::int FROM memory_items
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND source_thread_id='9bcfc96c-71b0-4388-895a-d25406e56fb1'::uuid;
```

Expected: 1. **Result: 1 ✅**

## INV-6 — `public.reminders` baseline preserved

```sql
SELECT count(*)::int FROM reminders;
SELECT max(created_at)::text FROM reminders;
```

Expected: count=1, max=2026-04-13 20:17:13Z.
**Result: 1, 2026-04-13 20:17:13.620582+00 ✅**

## INV-7 — workflow versionIds unchanged

| Workflow | Pre versionId | Post versionId | Verdict |
|---|---|---|---|
| WF-PL-01 | `839b1750-2fb2-40ab-aeb2-88508d0a01c7` | `839b1750-2fb2-40ab-aeb2-88508d0a01c7` | ✅ unchanged |
| WF-ME-01 | `328b2b81-58e6-4003-8966-4159d695cfda` | `328b2b81-58e6-4003-8966-4159d695cfda` | ✅ unchanged |

Verified via `mcp__n8n__verify_workflow` after final fire.

## INV-8 — schema mutation count

0 DDL statements applied. Only DML INSERTs (idempotent ON CONFLICT) for
seed pack. **Result: 0 ✅**

## Cross-tenant probe

```sql
SELECT count(*)::int FROM memory_items
 WHERE tenant_id IN ('eee0e2e0-…000a'::uuid,'eee0e2e0-…000b'::uuid)
   AND source_thread_id IN ('8567245f-…','9bcfc96c-…')::uuid;
```

Expected: 0. **Result: 0 ✅**

## Summary

| Invariant | Verdict |
|---|---|
| INV-1 replay-group dedupe (1 row) | ✅ |
| INV-3 EC reuse (1 EC) | ✅ |
| INV-5 fresh-control writes 1 row | ✅ |
| INV-6 reminders unchanged | ✅ |
| INV-7 workflow versionIds unchanged | ✅ |
| INV-8 schema mutations = 0 | ✅ |
| cross-tenant leak | 0 ✅ |
