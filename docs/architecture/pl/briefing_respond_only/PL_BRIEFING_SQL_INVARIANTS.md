# PL_BRIEFING_INTENT_MAPPING_FOLLOWUP · SQL Invariants

Run-tag: `plbrf-2026-04-26`. All SELECT-only.

## INV-1 — `public.reminders` baseline preserved end-to-end

```sql
SELECT count(*)::int AS c, max(updated_at) AS last_updated FROM public.reminders;
-- BEFORE: c=1, last_updated=2026-04-13T20:17:13.620Z
-- AFTER:  c=1, last_updated=2026-04-13T20:17:13.620Z (UNCHANGED)
```

✅ ADR-REMINDER-AS-TASK-LAYER preserved across all 6 fires (B-1, B-3, B-4, B-5, R-4, R-1).

## INV-2 — Briefing probes wrote 0 domain rows on their threads

| Probe | tenant_id | thread_id | window | mem | tsk | imp |
|---|---|---|---|---|---|---|
| B-1 | eee0…0001 | adc4c056-1d4b-4690-8284-02d05cd972f7 | 03:20–03:25 | 0 | 0 | 0 |
| B-3 | eee0…0001 | a3e8e93e-c694-4c84-810c-872f61843477 | 03:25–03:30 | 0 | 0 | 0 |
| B-4 | eee0…0001 | 9f089561-2025-4e17-83f0-3b9b907efc66 | 03:25–03:30 | 0 | 0 | 0 |
| B-5 | eee0…0001 | b3d18a6f-83d5-4cd4-8245-c67007b49bdd | 03:25–03:30 | 0 | 0 | 0 |

✅ Briefing → no-write contract holds.

## INV-3 — Regression writes appear in expected tables only

```sql
SELECT id::text, description, status, created_at
FROM tasks
WHERE tenant_id='eee0e2e0-…0001'::uuid
  AND created_at BETWEEN '2026-04-26T03:20:00Z' AND '2026-04-26T03:35:00Z';
-- 1 row: 1e83ba0c-a4ce-41a8-8343-6b71c0b43bd9 (R-4 C6-L1-V1 create_task; description="Fă-mi un plan simplu pentru"; status=open)

SELECT id::text, status, content, created_at FROM memory_items
WHERE tenant_id='eee0e2e0-…0001'::uuid
  AND created_at BETWEEN '2026-04-26T03:20:00Z' AND '2026-04-26T03:35:00Z';
-- 1 row: ad8d328e-205b-41c3-8879-e5c55537557e (R-1 C2-L1-V1 store_memory; content="Andrei preferă antrenamente dimineața"; status=active)

SELECT count(*) FROM improvement_requests
WHERE tenant_id='eee0e2e0-…0001'::uuid
  AND created_at BETWEEN '2026-04-26T03:20:00Z' AND '2026-04-26T03:35:00Z';
-- 0 (no improvement writes from this window's probes)
```

✅ Exactly the expected per-regression rows; nothing extra.

## INV-4 — No cross-tenant leak

Tenant_A and Tenant_B not exercised live in this window. Pre-patch invariants from prior closeouts (RCP1 + ACG + supersede + supersede_defensive_guard + OR_passthrough) preserve cross-tenant scoping. No changes in this mission touch tenant isolation logic.

## INV-5 — No duplicate workflows / no schema mutation

```sql
-- Workflow mutation count:
-- WF-PL-01: 1 (versionId rolled bbef84fe → 839b1750)
-- WF-DI-01: 1 (versionId rolled 8b10a865 → a1f9eaa2)
-- WF-ME-01: 1 (versionId rolled 3c7b95dd → 328b2b81)
-- 0 duplicate workflows. 0 new top-level workflows.
-- Schema mutation count: 0
```

## INV-6 — Memory V2 untouched

ME's Memory V2 chain (`ME_Memory_Store_*`, `ME_Memory_Search_*`, `ME_Memory_Supersede_*`, `ME_Memory_Recall_*`, `ME_Memory_Promote_*`) byte-identical post-patch. Only changes in WF-ME-01: switch parameter + 1 new isolated Code node (`ME_Response_Respond_Only_Result`) + 2 new connections. **`MEMORY_100_FOR_CURRENT_STAGE = TRUE` preserved.**
