# FULL_240_RERUN · SQL Invariants

Run-tag: `f240r-2026-04-26`. All SELECT-only.

## INV-1 — `public.reminders` baseline preserved end-to-end

```
BEFORE: count=1, last_updated=2026-04-13T20:17:13.620Z
AFTER:  count=1, last_updated=2026-04-13T20:17:13.620Z (UNCHANGED)
```

✅ ADR-REMINDER-AS-TASK-LAYER preserved across all 11 rerun fires + 6 PL_BRIEFING fires + all prior missions.

## INV-2 — C9-V1 wrote durable memory in thread A

```sql
SELECT count(*)::int FROM memory_items
WHERE tenant_id='eee0e2e0-…0001'::uuid
  AND source_thread_id='5423bd25-a301-406d-8ad8-773c32c83dc9'::uuid
  AND created_at >= '2026-04-26T03:40:00Z';
-- 1 row: id=09f39d52-…
```

✅ Durable seed written.

## INV-3 — C9-V2 cross-thread same-tenant recall structurally permitted (read-only)

C9-V2 (TR 10110) ran `search_memory` against tenant default. Memory V2's `ME_Memory_Search_DB` filters `WHERE tenant_id=$1` only, so the V1 seed in thread A is findable from thread B within the same tenant. **0 writes** for V2 (read-only invariant).

## INV-4 — C10 tenant isolation (write-side)

```sql
SELECT count(*)::int AS tenant_a_writes FROM memory_items
WHERE tenant_id='eee0e2e0-…000a'::uuid AND created_at >= '2026-04-26T03:42:00Z';
-- 1 row: id=dfb88c46-…  (C10 tA-seed wrote correctly to tenant A only)

SELECT count(*)::int AS tenant_b_writes FROM memory_items
WHERE tenant_id='eee0e2e0-…000b'::uuid AND created_at >= '2026-04-26T03:43:00Z';
-- 0 rows (cross-tenant probe was read-only; 0 leak)
```

✅ No cross-tenant leak. Tenant A write isolated to tenant A.

## INV-5 — C11 idempotency: 1 row across 2 fires

```sql
-- TR 10152 first_delivery wrote one row.
-- TR 10166 replay was rejected at OR (NOT_READY_FOR_PLANNING) — 0 second row.
SELECT count(*)::int FROM memory_items
WHERE tenant_id='eee0e2e0-…0001'::uuid
  AND source_thread_id='011803d4-d094-40f4-8c57-236e08f76014'::uuid
  AND created_at >= '2026-04-26T03:40:00Z';
-- 1 row: id=5b2bf08a-…
```

✅ Replay rejected at execution_context layer (OR `NOT_READY_FOR_PLANNING`). Memory V2's UNIQUE on `idempotency_key` is the second line of defense; not exercised because the chain bailed earlier.

## INV-6 — C4 supersede backlink

```sql
SELECT id::text, status, supersedes_memory_id::text
FROM memory_items
WHERE id IN ('c4f24026-…'::uuid, '1ad91651-…'::uuid)
ORDER BY created_at;

c4f24026-aaaa-4bbb-8ccc-000000000001  superseded  NULL
1ad91651-e35e-4040-a50a-7affb4b6db87  active      c4f24026-aaaa-4bbb-8ccc-000000000001
```

✅ OLD row → `superseded`. NEW row → `active` with `supersedes_memory_id` backlink. Wrong-target supersede: NOT observed.

## INV-7 — C7 ACG guards: 0 writes for ambiguous content

```sql
-- Ambiguous task fire TR 10183: 0 tasks rows written for that case
-- Ambiguous memo fire TR 10197: 0 memory_items rows written for that case
SELECT count(*)::int AS ambig_task_rows FROM tasks
WHERE tenant_id='eee0e2e0-…0001'::uuid
  AND description ILIKE '%fă chestia aia%' AND created_at >= '2026-04-26T09:30:00Z';
-- 0

SELECT count(*)::int AS ambig_memo_rows FROM memory_items
WHERE tenant_id='eee0e2e0-…0001'::uuid
  AND content ILIKE '%ține minte asta%' AND created_at >= '2026-04-26T09:31:00Z';
-- 0
```

✅ Ambiguity guards fire correctly: `AMBIGUOUS_OR_EMPTY_TASK` for task lane, `AMBIGUOUS_OR_EMPTY_MEMORY` for memory lane.

## INV-8 — Briefing probes (re-cited from PL_BRIEFING)

C1-L1-V1 / C5-L1-V1 / C7-L1-V1-briefing / C9-L1-V3 each wrote 0 rows in `tasks` / `memory_items` / `improvement_requests` / `reminders`. Per `PL_BRIEFING_SQL_INVARIANTS.md`.

## INV-9 — C12 wrote exactly one task

```sql
SELECT id::text, description, status FROM tasks
WHERE tenant_id='eee0e2e0-…0001'::uuid AND created_at >= '2026-04-26T09:29:00Z' ORDER BY created_at;
-- 1 row: 082588ba-864d-4b88-9a14-614a0dc05e7b "Ține minte Andrei dimineața și fă-mi un mesaj pentru Maria" status=open
```

✅ Single canonical task row from large-composition primary_intent=create_task.

## INV-10 — Total side-effect tally

```sql
-- This rerun window (post-PL_BRIEFING, fires 10096..10225)
-- memory_items delta: +5 (4 new + 1 superseded transition; ad8d328e R-1 carried from PL_BRIEFING)
-- tasks delta:        +1 (C12 082588ba; 1e83ba0c carried from PL_BRIEFING R-4)
-- improvement_requests delta: 0
-- reminders delta:    0
```

✅ Every domain row is traceable to an explicit corridor + intent. No orphan writes.

## INV-11 — Workflow / schema mutations: zero

- WF-PL-01 versionId `839b1750…` (unchanged this run)
- WF-DI-01 versionId `a1f9eaa2…` (unchanged this run)
- WF-ME-01 versionId `328b2b81…` (unchanged this run)
- All other workflows: unchanged this run.
- Schema mutations: 0.
- Duplicate workflows: 0.
- Memory V2 reopen: NO.
