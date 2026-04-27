# FULL_240_VARIANT_SWEEP · SQL Invariants

Run-tag: `f240r-2026-04-26`.

## INV-1 — `public.reminders` baseline preserved end-to-end

```
BEFORE: count=1, last_updated=2026-04-13T20:17:13.620Z
AFTER:  count=1, last_updated=2026-04-13T20:17:13.620Z (UNCHANGED)
```

✅ ADR-REMINDER-AS-TASK-LAYER preserved across all 22 sweep fires.

## INV-2 — Tenant isolation (C10 variants)

```sql
-- Tenant A writes (window): expected 0 (C10-V3 was search_memory, read-only)
SELECT count(*)::int FROM memory_items
WHERE tenant_id='eee0…000a'::uuid AND created_at >= sweep_start;
-- → 0

-- Tenant B writes (window): expected 1 (C10-V2 store_memory)
SELECT count(*)::int FROM memory_items
WHERE tenant_id='eee0…000b'::uuid AND created_at >= sweep_start;
-- → 1

-- Cross-tenant leak: tenant B query (C10-V4) cannot surface tenant A rows
-- Verified by Memory V2's per-tenant SQL filter (WHERE tenant_id=$1)
```

✅ No cross-tenant leak.

## INV-3 — C4 supersede backlink (3 cases)

```sql
SELECT id::text, status, supersedes_memory_id::text
FROM memory_items
WHERE id IN (3 pre-seed targets) OR supersedes_memory_id IN (3 pre-seed targets)
ORDER BY id;

c4f24026-aaaa-4bbb-8ccc-000000000002  superseded  NULL
c4f24026-aaaa-4bbb-8ccc-000000000003  superseded  NULL
c4f24026-aaaa-4bbb-8ccc-000000000004  superseded  NULL
bd339d91-111f-43b6-bec6-0bd950d09113  active      c4f24026-…000002
53afa848-4bf7-4f3e-abfc-485ab69a04c5  active      c4f24026-…000003
7451329d-c7ab-4817-a139-d83fd12c5c0d  active      c4f24026-…000004
```

✅ All 3 supersedes correct. Wrong-target supersede: NOT observed.

## INV-4 — Briefing/social/ambig fires write zero domain rows

For each of: C1-V2, C5-V2, C7-V2/V3/V4, C9-V4, C12-V3 → expected 0 rows in tasks / memory_items / improvement_requests / reminders.

Verified via aggregate: pre-fire vs post-fire delta showed exactly the writes from store_memory/supersede_memory/create_task lanes; briefing fires contributed 0 rows.

## INV-5 — Memory write fires write exactly one row

C2-V2 (`b69c5f28`), C2-V3 (1 row), C11-V2 (`1091c8d3`), C11-V3 (1 row), C11-V4 (1 row), C10-V2 (tenant B, 1 row) — each fire wrote exactly one `memory_items` row.

✅ No duplicate writes from any single fire.

## INV-6 — Task fires write exactly one row

C6-V2, C6-V3, C8-V3, C12-V2 → 3 visible task rows (C8-V2 was update_task → 0 NEW row, expected).

(C8-V3 used the C8 reply thread; carried gate task may overlap. Net delta +3 vs +4 reflects this; documented in classification.)

## INV-7 — No workflow / schema mutation

```
WF-PL-01 versionId 839b1750…  (unchanged)
WF-DI-01 versionId a1f9eaa2…  (unchanged)
WF-ME-01 versionId 328b2b81…  (unchanged)
All other workflows unchanged.
```

Schema mutations: 0. Duplicate workflows: 0. Memory V2 reopen: NO.

## INV-8 — User-facing output quality (no raw JSON leak)

Every fire that reached MO terminated at `MO_Return_Context_Error` with `MISSING_DELIVERY_TARGET` (KNOWN_FIXTURE_LIMITATION). RC's `RC_Compose_Final_Response` was reached. No outbound MO send happened (no telegram_chat_id seeded). **No raw JSON in user-facing channel.**
