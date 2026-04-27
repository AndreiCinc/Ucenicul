# PL_BRIEFING_INTENT_MAPPING_FOLLOWUP · Discovery

## Live failure (D1)

Reproduced live in FULL_240_RUN as TR exec 9994 (case `C1-L1-V1`, post-seed):

```
hops_str: TR:9994 → EC:9995 → OR:9996 → PL:9997
PL last_node: PL_Return_Error
PL last_node_json:
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "plan_generation",
  "error": {
    "code": "INSUFFICIENT_PLANNING_CONTEXT",
    "message": "No requested actions or mappable primary intent are available.",
    "missing_fields": [
      "planner_context.requested_actions or planner_context.primary_intent"
    ]
  }
}
```

Upstream OR handoff:
```
"planner_context": {
  "user_message_text": "Care este diferența dintre obiectiv și sarcină?",
  "primary_intent": "briefing"
}
```

The OR handoff is correct. PL is the bail point.

## Root cause

`PL_Build_Planner_Input` v2.3 logic:

```js
if (!requestedActions.length && primaryIntent && intentMap[primaryIntent]) {
  const action = intentMap[primaryIntent];
  ...
  requestedActions = [{ action, module_name: actionToModule[action], ... }];
}
...
if (!requestedActions.length) {
  return [{ json: { _context_ready: 'false', error_code: 'INSUFFICIENT_PLANNING_CONTEXT', ... }}];
}
```

`intentMap` v2.3 covers task / reminder / memory / improvement intents but **not** `briefing`. So `intentMap['briefing']` is `undefined`, the synthetic action is not built, `requestedActions` stays empty, and PL falls through to the error branch.

This affects all messages with `intent='briefing'` — which the harness uses for response-only / social / clarification / no-action corridors:

- C1 (default `briefing` per `intent_mapping.mjs`)
- C5 (default `briefing`)
- C7 (default `briefing` — ambiguous → clarification expected)
- C8 (default `briefing` — followup negative-control variant)
- C9 thread_B_operational_continue_negative + thread_C_ambiguous_reference (override `briefing`)

Approximately 80 of 240 cases route through `briefing` and would all bail at PL.

## Affected downstream

- DI / ME / RA / SU / RC / MO are never reached for briefing. PL emits `module_name='plan_generation', result_type='error'` envelope; the executeWorkflow node returns to OR with the failed payload but OR has already returned (it dispatched to PL synchronously). The user receives no natural response because RC never composes one.

## Why not a P0 leak

- 0 domain rows written (chain bails before DI).
- 0 cross-tenant exposure.
- 0 raw JSON leaked to user (no MO send).
- Behavior is **fail-closed**, not fail-open.

## DI gating constraint

`WF-DI-01.DI_Load_Module_Registry` (live snapshot 2026-04-26):

```js
return [{ json: { module_registry: [
  { module_name: 'task_module', module_type: 'executor', capabilities: ['create_task','list_tasks','update_task','complete_task','delete_task'] },
  { module_name: 'reminder_module', ..., capabilities: ['create_reminder','list_reminders','update_reminder','cancel_reminder'] },
  { module_name: 'memory_module', ..., capabilities: ['store_memory','search_memory'] },
  { module_name: 'improvement_module', ..., capabilities: ['capture_feedback'] },
  { module_name: 'watcher_module_basic', module_type: 'observer', capabilities: ['produce_observation'] }
] } }];
```

`DI_Build_Ready_Steps` rejects any step whose `module_name` is not present in the registry: `error_code: 'UNKNOWN_MODULE'`. **Adding `response_module` requires adding a registry entry.**

## ME route-switch constraint

`WF-ME-01.ME_Route_Module_Name` switch has 5 module_name rules + extra→`ME_Return_Error`. To keep the chain integrity, a `response_module` rule must be added that routes to a new (or existing) lane. The closest no-write reference is `ME_Watcher_Observe_Result`. Watcher's emitted shape is the canonical no-write module_result template.

## Module Registry consideration

The architecture-spec module registry (`docs/architecture/Module_Registry_Ucenicul.md`) governs the "official" module ownership. Adding `response_module` is a **new canonical capability**. Per the mission spec, this should be recorded in the Module Registry only if the capability becomes canonical. Confirmed: this mission introduces `response_module.respond_only` as a canonical no-write response-composition capability. Module Registry update will be applied alongside the workflow patches.
