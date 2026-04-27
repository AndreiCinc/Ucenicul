# F14 — PL `store_memory` IntentMap · Probe Results

> Run-tag `f14probe-2026-04-25`. Sequential fires through WF-TR-01.

## 1. Probe matrix

| # | case_id | intent | message_id | thread_id | execution_id |
|---|---|---|---|---|---|
| 1 | f14probe:store_memory | `store_memory` (happy path) | `f140bb01-…0001` | `f140aa01-…0001` | **8573** |
| 2 | f14probe:store_memory (replay, identical envelope) | `store_memory` | `f140bb01-…0001` (same as probe 1 by design) | `f140aa01-…0001` | **8587** |
| 3 | f14probe:search_memory | `search_memory` | `f140bb02-…0002` | `f140aa02-…0002` | **8590** |
| 4 | f14probe:create_task | `create_task` | `f140bb03-…0003` | `f140aa03-…0003` | **8604** |
| 5 | f14probe:create_reminder | `create_reminder` (→ `task_module.create_task`) | `f140bb04-…0004` | `f140aa04-…0004` | **8618** |

Every fire returned `status:"success"` from the n8n executor MCP.

## 2. Per-probe outcome

### Probe 1 — `store_memory` happy path

Row written to `public.memory_items` for tenant `eee0e2e0-…0001`:

| field | value |
|---|---|
| `id` | `4b459e04-7d43-470c-a140-806e4721f39e` |
| `tenant_id` | `eee0e2e0-…0001` |
| `content` | `'prefer întâlnirile de dimineață, ideal la ora 9'` |
| `memory_type` | `fact` |
| `category` | `general` |
| `source_thread_id` | `f140aa01-…0001` (matches probe thread) |
| `source_message_id` | (set; matches probe message) |
| `idempotency_key` | `store_memory:9e97affc-7427-43ef-b4c5-4799d0ba82cf:step_01_store_memory` |
| `created_at` | `2026-04-25T14:37:00.497Z` |

✅ PL stripped the `Ține minte că ` prefix as designed via the new `stripMemoryWritePrefix` helper.
✅ ME_Memory_Store_Prep accepted the inputs without `MISSING_REQUIRED_FIELDS`.
✅ ME_Memory_Store_DB inserted the row with the expected idempotency_key shape.
✅ Memory V2 internals (Embed → Embed_Merge → DB → Result) executed end-to-end without modification.

### Probe 2 — `store_memory` replay (same envelope)

Re-fired the identical envelope from probe 1. Post-replay state:

```sql
SELECT count(*) AS store_rows,
       count(DISTINCT idempotency_key) AS distinct_keys
  FROM public.memory_items
 WHERE tenant_id='eee0e2e0-…0001'
   AND idempotency_key LIKE 'store_memory:%'
   AND created_at >= '2026-04-25T14:36:00';
-- store_rows=1, distinct_keys=1
```

✅ **Idempotency held.** The replay produced 0 new rows; the existing row is returned via the `ON CONFLICT (idempotency_key) DO NOTHING + UNION ALL` fallback in `ME_Memory_Store_DB`. The same `execution_context_id` is reused because EC dedupes by `(tenant_id, trigger_message_id)` in TR→EC handoff.

### Probe 3 — `search_memory` regression

Fired with the same probe tenant. After fire:

- `count(*) FROM public.memory_items WHERE tenant_id='eee0e2e0-…0001'` = **1** (unchanged from probe 1's row).
- No new memory write.

✅ Memory V2 search path unchanged by the F14 patch. Read-only invariant preserved.

### Probe 4 — `create_task` regression

Task row written:

| field | value |
|---|---|
| `id` | `09217452-2157-46f9-9579-bedfc85f4331` |
| `title` | `'F14 regression smoke pentru task path'` |
| `status` | `open` |
| `metadata->>'idempotency_key'` | `idem:create_task:a129fbf7-db2f-4061-abf0-9cac05c2fbd0:step_01_create_task` |

✅ Task module path unaffected by the F14 patch. The predecessor task-corridors-phase1 verdict (`E2E_TASK_CORRIDORS_PHASE1_READY = TRUE`) continues to hold.

### Probe 5 — `create_reminder` → `task_module.create_task` regression

Task row written (NOT a `reminders` row):

| field | value |
|---|---|
| `id` | `f15d3a44-1c6a-48ac-907b-a6fac6eb3fba` |
| `title` | `'Remind me tomorrow at 11 to F14-reminder-route-check'` |
| `due_type` | `datetime` |
| `due_at` | `2026-04-26T11:00:00Z` |
| `metadata->>'origin'` | `reminder_intent` |

✅ ADR-REMINDER-AS-TASK-LAYER honored. PL re-route still works under the F14 patch; `metadata.origin='reminder_intent'` tag set as expected for the English "remind me" phrasing.

## 3. Aggregate window invariants

```sql
SELECT (SELECT count(*) FROM public.tasks        WHERE created_at >= '2026-04-25T14:36:00' AND tenant_id='eee0e2e0-…0001') AS new_tasks,
       (SELECT count(*) FROM public.memory_items WHERE created_at >= '2026-04-25T14:36:00' AND tenant_id='eee0e2e0-…0001') AS new_memory,
       (SELECT count(*) FROM public.reminders    WHERE updated_at >= '2026-04-25T14:36:00') AS reminders_writes;
-- new_tasks=2, new_memory=1, reminders_writes=0
```

| Window invariant | Expected | Actual | Result |
|---|---|---|---|
| `tasks` rows from probes 4+5 | 2 | 2 | ✅ |
| `memory_items` rows from probe 1 (probe 2 deduped) | 1 | 1 | ✅ |
| `reminders` writes | 0 | 0 | ✅ |
| `reminders.count` baseline | 1 | 1 | ✅ |
| `reminders.last_updated` | `2026-04-13T20:17:13Z` | `2026-04-13T20:17:13Z` | ✅ unchanged |

## 4. Cross-tenant probe (defensive)

Spot-check that the new memory_items row stays scoped to the probe tenant:

```sql
SELECT count(*) FROM public.memory_items WHERE tenant_id <> 'eee0e2e0-…0001' AND created_at >= '2026-04-25T14:36:00';
-- 0
```

✅ Zero leak. Tenant scope holds at the DB layer (Memory V2's design) and PL did not introduce any cross-tenant field.

## 5. Conclusion

All 5 probes GREEN; all aggregate invariants hold. F14 is closed.

- `store_memory` reaches `memory_module.store_memory` and writes a real `memory_items` row.
- Replay is idempotent (1 row across 2 fires).
- `search_memory`, `create_task`, and `create_reminder` paths are unchanged.
- `public.reminders` invariant unchanged.

Workflow mutation: 1 (`WF-PL-01` only).
Schema mutation: 0.
Memory V2 reopen: 0.
Task module change: 0.
