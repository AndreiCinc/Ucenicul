# F9 — OR Live Execution Gating · Probe Results

> Run-tag `f9probe-2026-04-25`. Sequential fires through WF-TR-01.
> Goal: confirm no chain-path regression after the F9 audit. Six probes,
> one per intent class.

## 1. Probe matrix

| # | case_id | intent | message_id | thread_id | execution_id |
|---|---|---|---|---|---|
| 1 | f9probe:create_task | `create_task` | `f9000001-…0001` | `f9000001-…1001` | **8499** |
| 2 | f9probe:list_tasks | `list_tasks` | `f9000002-…0002` | `f9000002-…1002` | **8513** |
| 3 | f9probe:briefing | `briefing` | `f9000003-…0003` | `f9000003-…1003` | **8527** |
| 4 | f9probe:search_memory | `search_memory` | `f9000004-…0004` | `f9000004-…1004` | **8531** |
| 5 | f9probe:capture_feedback | `save_suggestion` | `f9000005-…0005` | `f9000005-…1005` | **8545** |
| 6 | f9probe:create_reminder | `create_reminder` | `f9000006-…0006` | `f9000006-…1006` | **8559** |

Every fire returned `status:"success"` from the n8n executor MCP.

## 2. Outcome per probe

### Probe 1 — `create_task`

Row written: `362a2189-e8a4-41bf-8cac-be7c80272739`,
title `'F9 probe — verifică gating telemetric'`, status `open`,
`metadata->>'idempotency_key' = 'idem:create_task:55871350-…:step_01_create_task'`.

✅ Task module continues to write real `tasks` rows under OR's
`orchestrator_input.{module_execution_allowed:false, domain_writes_allowed:false}`.
Empirically confirms the OR-side flags are not enforced.

### Probe 2 — `list_tasks`

Read-only path. Global new-tasks count from `13:50:00+` is 2 (probes 1+6
only — no new row from probe 2). ✅

### Probe 3 — `briefing` (response-only)

Global new-tasks count from `13:50:00+` is unchanged after this fire.
No memory write. No `tasks` row written. Chain returned
`status:"success"` from TR; the response-only path reaches RC/MO without
writing a domain row. ✅

### Probe 4 — `search_memory`

`memory_items` count for tenant default before and after = **0**
(no row created). Read-only memory recall path is not regressed by the F9
audit. ✅

### Probe 5 — `capture_feedback` (`save_suggestion` intent)

No `tasks` row, no `memory_items` row, no `reminders` row written.
`improvement_module` remains a stub at the ME layer (intentional, out of
scope of this mission per pack §"Out of scope" — separate mission).
Confirms F9 is **not** the gate that keeps `improvement_module` from
writing — it doesn't write because its handler is a stub. ✅

### Probe 6 — `create_reminder` → `task_module.create_task`

Row written in `tasks`: `b3b2c188-94cf-41a1-964e-9e199f9c870c`,
title `'Remind me tomorrow at 8 to F9-probe-route'`, `due_type=datetime`,
`due_at=2026-04-26T08:00:00Z`, `metadata->>'origin'='reminder_intent'`.

`reminders` count: **1** (unchanged), `last_updated` =
`2026-04-13T20:17:13Z` (pre-mission, untouched).

✅ ADR-REMINDER-AS-TASK-LAYER invariant holds.

## 3. Aggregate invariants

```sql
SELECT (SELECT count(*) FROM public.tasks       WHERE created_at >= '2026-04-25T13:50:00') AS new_tasks_global,
       (SELECT count(*) FROM public.memory_items WHERE created_at >= '2026-04-25T13:50:00') AS new_memory_global,
       (SELECT count(*) FROM public.reminders   WHERE updated_at >= '2026-04-25T13:50:00') AS new_reminder_writes;
-- new_tasks_global=2, new_memory_global=0, new_reminder_writes=0
```

The 2 new tasks correspond exactly to probes 1 and 6 (create_task +
create_reminder→task). Memory and reminders side-effect counts stay at
zero. ✅

## 4. Task regression result

**No regression.** The task path produces real rows; the reminder→task
re-route still works; idempotency markers are still set; tenant scope
holds (all default-tenant rows). The predecessor mission's verdict
`E2E_TASK_CORRIDORS_PHASE1_READY = TRUE` continues to hold after the F9
audit + probes.

## 5. Memory regression result

**No regression.** `memory_items` count unchanged for the probe tenant
before and after. Memory routes (`search_memory`, `capture_feedback`,
`observe`) preserve their predecessor behavior.

## 6. Conclusion

All 6 probes returned `success`, all DB-side invariants hold, no
regression observed. F9's framing as a "gate" was empirically incorrect.
The hardcoded OR flags continue to be telemetry-only.

The discovery's classification stands: `F9 = F9_TELEMETRY_ONLY_MISMATCH`.

No workflow patch is necessary or justified. **Doc-only reconciliation.**
