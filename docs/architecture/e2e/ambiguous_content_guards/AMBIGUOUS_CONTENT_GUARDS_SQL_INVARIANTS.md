# AMBIGUOUS CONTENT GUARDS · SQL Invariants

> SELECT-only invariants. Window: `created_at >= 2026-04-25T23:41:30Z` for new
> rows; reminder baseline check is absolute. All values verified against live
> Postgres via `mcp__postgres__execute_sql`.

---

## INV-1 — Ambiguous task (chestia aia) NO_WRITE ✅

```sql
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND created_at >= '2026-04-25T23:41:30Z'
   AND (title ILIKE '%chestia aia%' OR description ILIKE '%chestia aia%');
-- 0
```

`ME_Task_Create_Prep.AMBIGUOUS_OR_EMPTY_TASK` matched the `chestia ... pentru mine` DEMONSTRATIVE_ONLY pattern. Prep returned `_error: true` → DB queryReplacement → all-null params → 0 INSERT.

## INV-2 — Ambiguous memory (asta) NO_WRITE ✅

```sql
SELECT count(*) FROM public.memory_items
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND source_thread_id='fe0c4289-d300-4413-8cbe-b2d15651cb5b'::uuid
   AND created_at >= '2026-04-25T23:41:30Z';
-- 0
```

`ME_Memory_Store_Prep.AMBIGUOUS_OR_EMPTY_MEMORY` matched the post-strip length=4 < MIN_MEMORY_LEN=6.

## INV-3 — Ambiguous reminder→task (Amintește-mi) NO_WRITE ✅

```sql
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND created_at >= '2026-04-25T23:41:30Z'
   AND (title ILIKE 'amintește-mi%' OR title ILIKE 'aminteste-mi%')
   AND title NOT ILIKE '%mâine%';
-- 0
```

PL late-binding rewrote `create_reminder` → `create_task` per ADR-REMINDER-AS-TASK-LAYER, then PL.stripVerbPrefix's OR-fallback returned `Amintește-mi.` to ME. The new ME Prep guard's asciiFold normalized `Amintește` → `aminteste`, the leading-verb strip removed `aminteste-mi` entirely → empty → length=0 < MIN_TASK_LEN → `AMBIGUOUS_OR_EMPTY_TASK` fired.

## INV-4 — Valid create_task NEW_ROW (≥1) ✅

```sql
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND created_at >= '2026-04-25T23:41:30Z'
   AND title ILIKE '%ACG smoke pentru chain post-guard%';
-- 2
```

ACG-04 (initial fire) + ACG-11 (replay-different-msg, different exec_ctx → different DB idem key). The "real replay" ACG-04R (same `message_id` as ACG-04) added 0 new rows — INV-10 (idempotency).

## INV-5 — Valid store_memory NEW_ROW (≥1) ✅

```sql
SELECT count(*) FROM public.memory_items
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND source_thread_id='0411e127-593c-415f-8332-9794eb7dd0b8'::uuid
   AND content ILIKE '%ACG smoke%';
-- 2
```

ACG-05 + ACG-10. Real replay ACG-05R added 0 new rows — INV-11.

## INV-6 — Valid create_reminder→task with due_at NEW_ROW (≥1) ✅

```sql
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND created_at >= '2026-04-25T23:41:30Z'
   AND (title ILIKE '%ACG runtime smoke%' OR description ILIKE '%ACG runtime smoke%')
   AND due_at IS NOT NULL;
-- 1
```

ACG-06 wrote a task with `due_type=datetime`, `due_at` set, `metadata.origin='reminder_intent'`. ADR-REMINDER-AS-TASK-LAYER preserved.

## INV-7 — Valid capture_feedback NEW_ROW (=1) ✅

```sql
SELECT count(*) FROM public.improvement_requests
 WHERE created_at >= '2026-04-25T23:41:30Z'
   AND user_message ILIKE '%ACG smoke%';
-- 1
```

ACG-07. The improvement_module surface (Prep + DB + Result) untouched by this mission — confirms no regression.

## INV-8 — Read-only invariant for search_memory & list_tasks ✅

```sql
-- search_memory ACG-08 fired against positive_lane; result must be 0 row delta beyond INV-5 writes
-- list_tasks ACG-09 fired against positive_lane; result must be 0 row delta beyond INV-4/6 writes
SELECT count(*) FROM public.memory_items
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND content NOT ILIKE '%ACG smoke%'
   AND source_thread_id='0411e127-593c-415f-8332-9794eb7dd0b8'::uuid
   AND created_at >= '2026-04-25T23:41:30Z';
-- 0  (no spurious memory_items written by search)

SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND title NOT ILIKE '%ACG smoke%'
   AND title NOT ILIKE '%ACG runtime smoke%'
   AND created_at >= '2026-04-25T23:41:30Z';
-- 0  (no spurious tasks written by list_tasks)
```

## INV-9 — REMINDER-LIKE writes to public.reminders ✅

```sql
SELECT count(*), max(updated_at) FROM public.reminders;
-- count=1, max=2026-04-13T20:17:13.620582Z
```

ADR-REMINDER-AS-TASK-LAYER invariant preserved. ACG-06 and ACG-03 (reminder-intent fires) wrote to `public.tasks` (or rejected via guard for ACG-03), not to `public.reminders`.

## INV-10 — Replay idempotency (create_task, same message_id) ✅

ACG-04 fired at exec 9522 → 1 task row. ACG-04R fired at exec 9648 with **same** `message_id=ef19addd-…` → 0 new rows. Total ACG-04 task rows: still 1 (plus the separate ACG-11 row with different message_id = 2 total in INV-4).

DB-layer idempotency key is `idem:create_task:${env.execution_context_id}:${step.step_id}`. Same `message_id` → EC derives the same `execution_context_id` → same DB idempotency key → INSERT lookup CTE finds existing row → 0 new INSERT.

## INV-11 — Replay idempotency (store_memory, same message_id) ✅

ACG-05 fired at exec 9536 → 1 memory row. ACG-05R fired at exec 9651 with **same** `message_id=6b6c02b8-…` → 0 new rows. Memory V2's `idempotency_key` UNIQUE constraint + `ON CONFLICT (idempotency_key) DO NOTHING` + `UNION ALL` fallback held.

## INV-12 — Cross-tenant memory recall isolated ✅

```sql
SELECT count(*) FROM public.memory_items
 WHERE tenant_id='eee0e2e0-0000-0000-0000-00000000000a'::uuid
   AND content ILIKE '%ACG smoke%';
-- 0
```

ACG-12 (tenant A) searched for `ACG smoke` — 0 rows in tenant A because the default-tenant memories are scoped by `WHERE tenant_id = $tenant_id` in Memory V2's recall SQL.

## INV-13 — Schema mutation invariant ✅

```sql
SELECT count(*) FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name IN ('tasks','memory_items','improvement_requests','reminders','threads','messages');
-- (unchanged from pre-mission baseline)
```

0 schema mutations; all column shapes preserved.

## INV-14 — Workflow mutation invariant ✅

| WF | versionId before | versionId after | Δ |
|---|---|---|---|
| WF-ME-01 | `161a612d-603a-49a7-9580-a256e1c69be5` | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` | **bumped** (2 jsCode rewrites) |
| WF-PL-01 | `dce0febe-…` | `dce0febe-…` | unchanged |
| WF-TR-01 | `89b783f8…` | `89b783f8…` | unchanged |
| WF-EC-01 | `78569035…` | `78569035…` | unchanged |
| WF-OR-01 | `2d37a1f3…` | `2d37a1f3…` | unchanged |
| WF-DI-01 | `8b10a865…` | `8b10a865…` | unchanged |
| WF-RA-01 | `4a2be8b4…` | `4a2be8b4…` | unchanged |
| WF-SU-01 | `4e7bc0d1…` | `4e7bc0d1…` | unchanged |
| WF-RC-01 | `6d3f5208…` | `6d3f5208…` | unchanged |
| WF-MO-01 | `4e0163b2…` | `4e0163b2…` | unchanged |

Only 1 of 10 canonical workflows mutated; node count + connection count preserved (61 → 61, 79 → 79). Spot-checked 5 unrelated nodes for byte-identity (see PATCH_EVIDENCE.md).
