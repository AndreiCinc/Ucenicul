# MEMORY V2 SUPERSEDE EMBED · Defensive Guard · SQL Invariants

> 16 SELECT-only invariants. All values verified against live Postgres.

---

## INV-1 — Valid supersede: OLD row marked superseded ✅
```sql
SELECT status::text FROM public.memory_items WHERE id='11c66583-c60b-4982-8eb0-618aea10eaf4'::uuid;
-- superseded
```

## INV-2 — Valid supersede: NEW row points to OLD ✅
```sql
SELECT EXISTS(SELECT 1 FROM public.memory_items
              WHERE supersedes_memory_id='11c66583-c60b-4982-8eb0-618aea10eaf4'::uuid AND status='active');
-- PASS
```

## INV-3 — Unrelated control row unchanged ✅
```sql
SELECT status::text FROM public.memory_items WHERE id='24809ce4-d37f-4df0-8580-d72843f72dbe'::uuid;
-- active
```

## INV-4 — Missing memory_id: 0 row delta (no crash, no write) ✅
```sql
SELECT count(*) FROM public.memory_items WHERE source_message_id='bfe116ef-…'::uuid;
-- 0
```
This is **the headline invariant** — pre-patch, this probe crashed the entire chain at the Embed node. Post-patch, the chain completes with a clean `status:success` (with internal `_error` envelope) and zero DB writes.

## INV-5 — Invalid UUID memory_id: 0 row delta ✅
```sql
SELECT count(*) FROM public.memory_items WHERE source_message_id='e1f6b58e-…'::uuid;
-- 0
```
The OR allowlist drops `"NOT-A-UUID-AT-ALL"` because it doesn't match the UUID regex. Same downstream behavior as INV-4.

## INV-6 — Wrong-tenant: tenant A row stays active ✅
```sql
SELECT status::text FROM public.memory_items WHERE id='ea076ebb-…'::uuid;
-- active
```

## INV-7 — Wrong-tenant: 0 NEW supersede rows pointing to tenant-A row ✅
```sql
SELECT count(*) FROM public.memory_items WHERE supersedes_memory_id='ea076ebb-…'::uuid;
-- 0
```
Memory V2 SQL `WHERE id=$1::uuid AND tenant_id=$2::uuid` blocks cross-tenant supersede.

## INV-8 — Replay idempotency: total NEW rows pointing to OLD = 1 ✅
```sql
SELECT count(*) FROM public.memory_items WHERE supersedes_memory_id='11c66583-…'::uuid;
-- 1
```
Probe 1 + replay probe 5 (same `message_id`, same `idempotency_key`) → exactly 1 NEW supersede row. Memory V2 `idempotency_key` UNIQUE + `ON CONFLICT DO NOTHING` + UNION ALL fallback held.

## INV-9 — store_memory regression NEW_ROW ✅
```sql
SELECT count(*) FROM public.memory_items
 WHERE source_message_id='ed165c00-…'::uuid AND content ILIKE '%msdg regression smoke%';
-- 1
```

## INV-10 — search_memory read-only ✅
```sql
SELECT count(*) FROM public.memory_items WHERE source_message_id='c935b899-…'::uuid;
-- 0
```

## INV-11 — create_task regression NEW_ROW ✅
```sql
SELECT count(*) FROM public.tasks
 WHERE created_at >= '2026-04-26T02:33:00Z' AND title ILIKE '%msdg regression smoke%';
-- 1
```

## INV-12 — capture_feedback regression NEW_ROW ✅
```sql
SELECT count(*) FROM public.improvement_requests
 WHERE created_at >= '2026-04-26T02:33:00Z' AND user_message ILIKE '%msdg regression smoke%';
-- 1
```

## INV-13 — reminder→task with due_at NEW_ROW ✅
```sql
SELECT count(*) FROM public.tasks
 WHERE created_at >= '2026-04-26T02:33:00Z' AND title ILIKE '%msdg regression%' AND due_at IS NOT NULL;
-- 1
```

## INV-14 — Ambiguous task guard regression: no-write ✅
```sql
SELECT count(*) FROM public.tasks
 WHERE created_at >= '2026-04-26T02:33:00Z' AND title ILIKE '%chestia aia%';
-- 0
```
ACG guard from prior mission still fires for `Fa chestia aia pentru mine`.

## INV-15 — Ambiguous memory guard regression: no-write ✅
```sql
SELECT count(*) FROM public.memory_items WHERE source_message_id='2f529a62-…'::uuid;
-- 0
```
ACG guard from prior mission still fires for `Tine minte asta`.

## INV-16 — Reminders unchanged ✅
```sql
SELECT count(*), max(updated_at) FROM public.reminders;
-- 1 / 2026-04-13 20:17:13.620582+00
```

## INV-17 — Schema mutation count = 0 ✅
`information_schema.columns` for `public.tasks`, `public.memory_items`, `public.improvement_requests`, `public.reminders`, `public.threads`, `public.messages`, `public.execution_contexts` — unchanged from pre-mission shape.

## INV-18 — Workflow mutation: only WF-ME-01, surgical ✅

| WF | versionId before | versionId after | Δ |
|---|---|---|---|
| TR | `89b783f8…` | `89b783f8…` (unchanged) | — |
| EC | `78569035…` | `78569035…` (unchanged) | — |
| OR | `f4925ede…` | `f4925ede…` (unchanged) | — |
| PL | `bbef84fe…` | `bbef84fe…` (unchanged) | — |
| DI | `8b10a865…` | `8b10a865…` (unchanged) | — |
| **ME** | **`4fd95689…`** | **`3c7b95dd-…`** | 1 node `parameters` change |
| RA / SU / RC / MO | unchanged | unchanged | — |
| Duplicate workflows: 0 | | | |
