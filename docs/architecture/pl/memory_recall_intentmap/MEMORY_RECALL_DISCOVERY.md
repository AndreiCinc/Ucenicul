# MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP · Discovery

Date: 2026-04-27 (autonomous run, post-FULL_240_VARIANT_SWEEP_GREEN +
post-C11_REPLAY_GROUPING_TARGETED_RERUN_READY).

## PL state pre-patch (v2.4)

Pulled live `WF-PL-01.PL_Build_Planner_Input.parameters.jsCode` and
saved the canonical pre-image to
`artifacts/PL_Build_Planner_Input_v2.4_pre.js`.

`intentMap` keys (v2.4):

```
create_task, list_tasks, update_task, complete_task, delete_task,
create_reminder, list_reminders, update_reminder, cancel_reminder,
store_memory, supersede_memory, search_memory, save_suggestion,
log_improvement_request, briefing
```

**`recall_memory` is NOT in intentMap.** Upstream `intent='recall_memory'`
falls through PL with `INSUFFICIENT_PLANNING_CONTEXT`.

`actionToModule` keys (v2.4):

```
create_task, list_tasks, update_task, complete_task, delete_task,
create_reminder, list_reminders, update_reminder, cancel_reminder,
store_memory, supersede_memory, search_memory, capture_feedback,
observe, respond_only
```

**`recall_memory` is NOT in actionToModule** either.

`extractInputsForAction` does NOT have a `recall_memory` clause.

## ME state pre-patch

`WF-ME-01` already has a real `recall_memory` handler chain:

- `ME_Memory_Recall_Prep` — requires AT LEAST ONE STRUCTURAL FILTER
  from `entity_id`, `source_thread_id`, `category`, `memory_type`. If
  none present, returns `MISSING_REQUIRED_FIELDS`.
- `ME_Memory_Recall_DB` — parameterised SELECT against
  `public.memory_items` filtered by tenant_id + status + optional
  filters. ORDER BY created_at DESC LIMIT $8.
- `ME_Memory_Recall_Result` — wraps results into a `module_result`
  envelope with `result_type='analysis'` and
  `actions_executed=[{action:'recall_memory', details:{recall_results}}]`.
  `domain_writes_performed=false`.

`ME_Route_Memory_Action` switch already routes the action
`recall_memory` to the recall handler chain. **No ME changes needed.**

## DI state pre-patch

`WF-DI-01.DI_Load_Module_Registry` includes `memory_module` with
capabilities `['store_memory', 'search_memory', 'recall_memory',
'promote_memory', 'supersede_memory']` per the canonical registry. **No
DI changes needed.**

## Decision: Option A — route to `recall_memory` (real ME handler)

The architectural answer per main reconciliation §0.1 is:

> Add `recall_memory` to `intentMap` + `actionToModule`. ME has the
> handler.

Patch surface:

1. `intentMap.recall_memory = 'recall_memory'`.
2. `actionToModule.recall_memory = 'memory_module'`.
3. Late-binding pass that injects `source_thread_id` (from
   `verify.thread_id`) into the `recall_memory` action's inputs when
   upstream did not supply a structural filter. This guarantees ME's
   `MISSING_REQUIRED_FIELDS` is not tripped on a bare
   `intent='recall_memory'` request and gives a sensible default scope
   ("recall memories anchored to this thread").
4. (Optional) `extractInputsForAction('recall_memory', goalText)`
   passes through `{ limit: 25 }` as a safe default; upstream can
   override via `requested_actions[i].inputs`.

### Why not Option B (alias to `search_memory`)

Option B would map `recall_memory` to `search_memory`. That works but
loses ME's real recall lane (which is the right path for structural
recall queries — e.g. "what do I have anchored to entity X?"). Option A
preserves the contract; Option B would make ME's recall handler
unreachable through PL.

### Why not patch ME

`ME_Route_Memory_Action` already supports `recall_memory`. Adding the
PL mapping is sufficient.

## Patch envelope expected

| Bucket | Value |
|---|---|
| Workflow mutations | 1 (WF-PL-01 jsCode rewrite v2.4 → v2.5) |
| Node delta | 0 |
| Connection delta | 0 |
| Schema mutation | 0 |
| Memory V2 reopen | NO |
| Path 5 | NO |
| Duplicate workflows | 0 |

## Tenant-isolation safety

`ME_Memory_Recall_Prep` reads `tenant_id` from
`env.tenant_id` (request envelope), not from `inputs`. ME's DB SELECT
filters `WHERE tenant_id = $1::uuid` first. So a tenant-B `recall_memory`
request cannot read tenant-A rows even if `source_thread_id` is
manipulated in inputs. **Cross-tenant probe is safe by construction.**
