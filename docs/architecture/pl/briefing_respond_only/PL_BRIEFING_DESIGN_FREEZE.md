# PL_BRIEFING_INTENT_MAPPING_FOLLOWUP · Design Freeze

Frozen: 2026-04-26.
Apply channel: V2-028 canonical local CLI (`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`).

## Lane name

`response_module.respond_only`

Rationale:
- Mission spec preferred name.
- No existing `response_module` lane in the registry → no semantic collision.
- Closest pattern is `watcher_module_basic.observe` (no-write observer).
- Avoids overloading `briefing_module` (which doesn't exist) or hijacking `watcher_module_basic` (which is reserved for passive observation, has different semantics — `response_generation_allowed:false`).

## PL_Build_Planner_Input v2.3 → v2.4

Surface:
- Add `intentMap.briefing = 'respond_only'`
- Add `actionToModule.respond_only = 'response_module'`
- Add `extractInputsForAction('respond_only', goalText)` clause emitting:
  ```js
  { action: 'respond_only', user_message: g, response_intent: 'briefing', no_domain_write: true }
  ```
  (The `action` field is preserved because PL's downstream wraps with `requestedActions[i].action`. The PL `inputs` object on the requested action will carry `user_message`, `response_intent`, `no_domain_write`. ME extracts via `step.inputs`.)

All other paths (task / reminder / memory / improvement / supersede / store / search) remain byte-identical to v2.3.

The PL plan step shape passed downstream:

```json
{
  "step_id": "step_01_respond_only",
  "module_name": "response_module",
  "purpose": "Handle intent briefing",
  "inputs": {
    "user_message": "<goal>",
    "response_intent": "briefing",
    "no_domain_write": true
  },
  "depends_on": [],
  "execution_mode": "sync",
  "failure_policy": "surface_error_to_response_composer"
}
```

(Note: PL's existing wrapper code already shapes `step_id` from the action and computes `depends_on=[]`. The `requestedActions` shape from PL stays consistent — only the `action`/`module_name`/`inputs` fields are new.)

## DI_Load_Module_Registry — add response_module

```js
{ module_name: 'response_module', module_type: 'composer', capabilities: ['respond_only'] }
```

Type `composer` chosen vs `executor`/`observer` — `response_module` does not execute domain side-effects nor observe; it composes a no-write response surface for RC.

## WF-ME-01 — new lane

### Switch update — `ME_Route_Module_Name`

Add a 6th rule **before** the extra/fallback:

```js
{
  outputKey: "response_module",
  conditions: { ...standard string equals on $('ME_Validate_Dispatcher_Result').first().json.step.module_name === 'response_module' },
  renameOutput: true
}
```

### New node — `ME_Response_Respond_Only_Result`

Type: `n8n-nodes-base.code`, typeVersion 2.

```js
// ME_Response_Respond_Only_Result — v1.0 (PL_BRIEFING_INTENT_MAPPING_FOLLOWUP)
// No-write response-only lane. Mirrors ME_Watcher_Observe_Result shape but emits
// a `respond_only` action and `response_generation_allowed:true` so RC composes
// a natural response from the user message. Strictly no DB writes, no module
// side effects.
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const userMessage = String(inputs.user_message || '').slice(0, 4000);
const responseIntent = String(inputs.response_intent || 'briefing');
const safeSummary = `Response-only briefing acknowledged for intent='${responseIntent}'.`;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'response_module',
    step_id: step.step_id,
    result_type: 'response',
    status: 'success',
    summary: safeSummary,
    actions_executed: [{
      action: 'respond_only',
      status: 'success',
      details: {
        user_message: userMessage,
        response_intent: responseIntent
      }
    }],
    artifacts: [],
    observations: [],
    proposals: [],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: true
}}];
```

### Connections

- `ME_Route_Module_Name.main[5]` → `ME_Response_Respond_Only_Result` (new connection — `[5]` is the new 6th output index, **before** the extra/fallback shifts to `[6]`).
- `ME_Response_Respond_Only_Result.main[0]` → `ME_Return_Result` (mirrors `ME_Watcher_Observe_Result.main[0]`).

Switch outputs after patch:
- 0: task_module → ME_Load_Task_Candidates
- 1: reminder_module → ME_Route_Reminder_Action
- 2: memory_module → ME_Route_Memory_Action
- 3: improvement_module → ME_Improvement_Capture_Prep
- 4: watcher_module_basic → ME_Watcher_Observe_Result
- 5: response_module → ME_Response_Respond_Only_Result *(NEW)*
- 6 (extra): ME_Return_Error

ME node count: 61 → **62**. ME connection count: 79 → **81**.

## Module Registry update

`docs/architecture/Module_Registry_Ucenicul.md`: add canonical entry for `response_module` with capability `respond_only` (no-write response composer; mission `PL_BRIEFING_INTENT_MAPPING_FOLLOWUP`).

## Rollback plan

| Change | Rollback |
|---|---|
| WF-PL-01 `PL_Build_Planner_Input` jsCode v2.3 → v2.4 | revert to v2.3 jsCode (snapshot retained by n8n-patch CLI) |
| WF-DI-01 `DI_Load_Module_Registry` jsCode | revert to pre-patch jsCode (snapshot retained) |
| WF-ME-01 `ME_Route_Module_Name` switch params | revert to pre-patch params (snapshot retained) |
| WF-ME-01 add new node + 2 connections | full WF-ME-01 PUT replacement using pre-patch snapshot (deletes the new node and reverts connections; snapshot retained) |

The CLI's audit log captures every snapshot pair under `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/snapshots/`.

## Probes (sequential, post-patch)

### Primary briefing probes
1. **B-1 RO C1**: `messages.intent='briefing'`, RO content `"Care este diferența dintre obiectiv și sarcină?"`. Expect TR→…→MO. RC composes RO answer. 0 domain writes.
2. **B-2 EN C1**: EN locale briefing question. Expect TR→…→MO with RO/EN answer. 0 domain writes.
3. **B-3 RO C5**: social filler `"Mulțumesc!"`. Expect short RO ack. 0 domain writes.
4. **B-4 RO C7-briefing**: ambiguous "Fă chestia aia." with intent=briefing. Expect clarification or safe response. 0 domain writes.
5. **B-5 RO C9-V3**: `"Ce știi despre Andrei?"` with intent=briefing (operational-continue negative). Expect non-write response. 0 domain writes.

### Regression probes
1. R-1 `store_memory` writes memory_items.
2. R-2 `search_memory` read-only.
3. R-3 `supersede_memory` positive (with `metadata.memory_id`).
4. R-4 `create_task` writes task.
5. R-5 `create_reminder` → `create_task` writes task, not reminder.
6. R-6 `capture_feedback` writes improvement.
7. R-7 ambiguous task no-write (existing ACG guard).
8. R-8 ambiguous memory no-write (existing ACG guard).
9. R-9 `public.reminders` count=1 unchanged end-to-end.

## Stop conditions

If any of the briefing probes triggers:
- a domain row in `tasks` / `memory_items` / `improvement_requests` / `reminders` → **STOP** (P0).
- raw JSON in user-facing output → **STOP** (P0).
- chain not reaching MO (RC OK is acceptable if MO returns `MISSING_DELIVERY_TARGET`) → **STOP** (P0 product gap).
- regression failure on any of R-1..R-9 → **STOP** (regression of prior closeouts).

If safe-fix repair is possible inside the V2-028 envelope, apply it. Otherwise stop with explicit blocker.
