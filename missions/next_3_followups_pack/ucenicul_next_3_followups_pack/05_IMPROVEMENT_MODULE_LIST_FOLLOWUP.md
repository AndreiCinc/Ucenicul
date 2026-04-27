# Mission 3 — IMPROVEMENT_MODULE_LIST_FOLLOWUP

## Objective

Implement the deferred read-only `list_improvements` lane for `improvement_module`, if safe.

`improvement_module` is already user-ready for:
- `capture_feedback`
- `log_improvement_request`

`list_improvements` was deferred because it likely requires:
- a ME sub-action router or route refinement;
- list Prep/DB/Result handler chain;
- small PL mapping update.

This mission implements list as read-only and tenant-scoped.

## Expected verdict

`IMPROVEMENT_MODULE_LIST_READY = TRUE`

## Start protocol

Create:
`docs/architecture/improvement_module/list_followup/`

With:
- `IMPROVEMENT_LIST_EXECUTION_LOG.md`
- `IMPROVEMENT_LIST_SCHEMA_PREFLIGHT.md`
- `IMPROVEMENT_LIST_DESIGN_FREEZE.md`
- `IMPROVEMENT_LIST_PATCH_EVIDENCE.md`
- `IMPROVEMENT_LIST_RUNTIME_RESULTS.md`
- `IMPROVEMENT_LIST_SQL_INVARIANTS.md`
- `IMPROVEMENT_LIST_CLOSEOUT.md`
- `artifacts/`

## Required discovery

1. Inspect `public.improvement_requests` schema.
2. Confirm tenant scope fields and indexes.
3. Confirm existing `capture_feedback` nodes and result shape.
4. Inspect PL mapping for `list_improvements`.
5. Inspect DI registry for `improvement_module`.
6. Inspect ME routing for `improvement_module`:
   - Does it distinguish sub-actions?
   - Does capture route catch all improvement actions?
7. Decide smallest safe implementation.

## Schema policy

No schema mutation by default.

If schema lacks tenant_id or cannot support read-only list safely, stop with blocker.

## Target contract

Action:
`list_improvements`

Inputs:
- `action`
- optional `status_filter`
- optional `category`
- optional `severity`
- optional `limit`
- optional `since`
- optional `include_closed`

Behavior:
- SELECT-only;
- tenant-scoped;
- default safe limit;
- sorted newest-first;
- no writes;
- no cross-tenant rows;
- standard Module Result;
- natural RC output;
- no raw JSON.

## Patch policy

Expected possible patch surface:

### WF-PL-01
If missing:
- add `intentMap.list_improvements='list_improvements'`
- add `actionToModule.list_improvements='improvement_module'`
- add extraction for filters.

### WF-ME-01
Likely:
- add/improve improvement sub-action routing.
- add `ME_Improvement_List_Prep`
- add `ME_Improvement_List_DB`
- add `ME_Improvement_List_Result`

No DB write nodes except SELECT.
No schema change.

### WF-DI-01
Only patch if DI blocks the capability.

## Tests

Runtime sequential probes:
1. Seed/capture two improvement requests.
2. `list_improvements` default list returns tenant rows.
3. `list_improvements` with category filter.
4. English list request.
5. Empty tenant list returns safe empty result.
6. Cross-tenant list blocked.
7. `capture_feedback` regression still writes.
8. `store_memory` regression still writes.
9. `create_task` regression still writes.
10. `create_reminder→task` regression still writes task, not reminder.
11. `public.reminders` unchanged.

SQL invariants:
- list produces 0 inserts/updates/deletes;
- only current tenant rows returned;
- capture_feedback still works;
- no memory/task/reminder writes from list;
- no schema mutation;
- no duplicate workflows.

## P0 stop conditions

Stop if:
- list leaks another tenant's rows;
- list writes DB rows;
- capture_feedback regresses;
- task/memory/reminder regresses;
- schema migration required;
- broad ME rewrite required;
- duplicate workflow/Path 5 needed.

## Documentation updates

Update compactly:
- `docs/architecture/Module_Registry_Ucenicul.md` to mark `list_improvements` active/user-ready if implemented.
- `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`.

Do not update unrelated memory docs.

## Final verdict options

- `IMPROVEMENT_MODULE_LIST_READY = TRUE`
- `IMPROVEMENT_MODULE_LIST_PARTIAL_WITH_BLOCKERS`
- `IMPROVEMENT_MODULE_LIST_STOPPED_ON_P0`
