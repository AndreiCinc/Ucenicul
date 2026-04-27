# Stage File — WF-PL-01 Plan Generation

## Stage identity

- Stage code: `WF-PL-01`
- Workflow shell name: `WF-PL-01`
- Current objective: build and validate the bounded plan-generation layer that converts a verified `WF-OR-01` handoff into a dispatcher-ready execution plan without dispatching modules, mutating domain state, or composing user-facing output
- Upstream dependency: `WF-OR-01` closed at 10/10
- Working mode: contract-first, shell-preserving, pre-live source-pack ready

## Why this stage exists

This stage exists to create the first real execution plan after the bounded orchestrator handoff.

It must:
- accept a valid handoff envelope from `WF-OR-01`
- verify that planning is allowed for the referenced execution context
- load the active capability/module registry for planning
- build a bounded planner input
- generate a deterministic execution plan envelope
- stop safely when planning context is missing or inconsistent

It must not:
- dispatch modules
- execute modules
- persist domain writes
- compose final user-facing output

## Stage-scope decision

For this stage, the chosen scope is:

`OR handoff -> bounded plan generation only`

It does **not** include:
- dispatcher execution
- module side effects
- result aggregation
- response composition

Those responsibilities begin in downstream stages:
- `WF-DI-01`
- `WF-RA-01`
- `WF-RC-01`

## Workflow shell policy

The existing `WF-PL-01` workflow created by the user is a placeholder shell.

You may:
- replace its nodes
- remove placeholder internals
- reconnect and restructure it completely

You may not:
- delete the workflow record itself
- leave it blank after an update
- treat write success as proof without live re-read
- redesign downstream stages inside this stage

## Contract to implement

### Input contract

Expected upstream source:
- `WF-OR-01`
- canonical upstream success shape only

```json
{
  "status_kind": "success",
  "result_type": "handoff",
  "module_name": "orchestrator_input_handoff",
  "payload": {
    "tenant_id": "uuid|string",
    "thread_id": "uuid|string",
    "execution_id": "uuid|string",
    "trigger_message_id": "uuid|string",
    "idempotency_key": "string",
    "execution_status": "initialized",
    "planning_allowed": true,
    "allowed_next_stage": "WF-PL-01",
    "orchestrator_input": {
      "planning_mode": "plan_only",
      "module_execution_allowed": false,
      "response_generation_allowed": false,
      "domain_writes_allowed": false
    },
    "planner_context": {
      "goal": "string",
      "user_message_text": "string",
      "primary_intent": "string",
      "requested_actions": [
        {
          "action": "create_task",
          "module_name": "task_module",
          "purpose": "string",
          "inputs": {}
        }
      ]
    },
    "warnings": []
  }
}
```

`planner_context` may be omitted by upstream in early integration tests, but this stage must then fail safely with `INSUFFICIENT_PLANNING_CONTEXT`.

### Output contract

The output of this stage is a **plan envelope**, not a dispatch result.

```json
{
  "status_kind": "success",
  "result_type": "plan",
  "module_name": "plan_generation",
  "payload": {
    "plan_id": "string",
    "execution_id": "uuid|string",
    "thread_id": "uuid|string",
    "goal": "string",
    "primary_intent": "string",
    "reasoning_summary": "string",
    "steps": [
      {
        "step_id": "string",
        "module_name": "task_module",
        "purpose": "string",
        "inputs": {},
        "depends_on": [],
        "execution_mode": "sequential",
        "expected_outputs": [],
        "replan_if": ["failed"],
        "failure_policy": "continue_with_notice",
        "status": "pending"
      }
    ],
    "allowed_next_stage": "WF-DI-01",
    "dispatcher_input": {
      "dispatch_allowed": true,
      "module_execution_started": false,
      "response_generation_allowed": false,
      "domain_writes_performed": false
    },
    "warnings": []
  }
}
```

### Error contract

```json
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "plan_generation",
  "error": {
    "code": "INVALID_HANDOFF_INPUT|CONTEXT_MISMATCH|INSUFFICIENT_PLANNING_CONTEXT|PLAN_BUILD_FAILED",
    "message": "string",
    "missing_fields": []
  }
}
```

## Required DB side effects

1. no domain write is required to prove this stage
2. replay must remain side-effect-free by default
3. if any audit-only persistence is introduced later, it may touch only:
   - `execution_contexts`
   - or a stage-safe fallback structure with suffix `_claude_mcp`

## Read-only DB expectations

This stage may read:
- `execution_contexts`
- stage-safe fallback structures if needed

This stage must not write:
- `tasks`
- `reminders`
- `rag_memories`
- module-result stores
- response stores
- dispatcher-owned tables

## If direct DB change is blocked

If canonical DB change is blocked or risky:
- do not force schema mutation
- prefer read-only proof
- if audit-only persistence becomes necessary, create a parallel structure with suffix `_claude_mcp`
- continue only if the stage remains provable
- document exact merge-back notes

## If workflow write surface is blocked

If no verified native workflow write surface exists:
- do not enter SDK reverse-engineering
- capture blocker evidence
- produce target blueprint and patch plan
- emit `BLOCKED_WITH_EVIDENCE`
- leave a next executable action

## Recommended node layout

1. `PL_Trigger`
2. `PL_Validate_OR_Handoff`
3. `PL_Route_Valid`
4. `PL_Extract_Planning_Input`
5. `PL_Load_Execution_Context`
6. `PL_Verify_Context_Match`
7. `PL_Load_Module_Registry`
8. `PL_Build_Planner_Input`
9. `PL_Route_Context_Ready`
10. `PL_Generate_Plan`
11. `PL_Return_Result`
12. `PL_Return_Error`

Add helper nodes only if minimal and readable.

## Validation rules

### `PL_Validate_OR_Handoff`
Must reject:
- missing `status_kind`
- missing `result_type`
- missing `payload`
- upstream payloads not marked `planning_allowed`
- malformed or incomplete execution identifiers

### `PL_Verify_Context_Match`
If live DB verification is enabled, the node must confirm:
- `execution_id` exists or maps correctly to the stage-supported identifier
- `tenant_id` matches the canonical context row
- `thread_id` matches the canonical context row
- `execution_status` is still `initialized`
- no tenant leakage is possible

### `PL_Build_Planner_Input`
Must reject or route to error when:
- no planner context is available
- no goal can be derived
- no requested action or mappable primary intent exists

### `PL_Generate_Plan`
Must produce:
- one normalized plan envelope
- one deterministic next-stage pointer
- one bounded dispatcher-ready block
- no module execution
- no user-facing response text

## Required validations

### V1 — shell integrity
- workflow still exists
- node count is sane
- connections are present
- draft/active state understood

### V2 — input validation
- missing required field fails cleanly
- malformed input fails cleanly

### V3 — happy path
- plan envelope generated
- required fields populated
- `allowed_next_stage = WF-DI-01`
- dispatcher guard flags remain bounded

### V4 — replay / idempotency
- replay behavior matches stage contract
- duplicate side effects do not occur

### V5 — cross-tenant / isolation behavior
- mismatched tenant/execution context fails closed
- no domain drift

### V6 — upstream smoke handoff
- use a real or realistic result from `WF-OR-01`
- confirm the handoff shape works without hidden coupling

## Required reports for this stage

- `BUILD_REPORT.md`
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `CLOSURE_REPORT.md`
- `STATE.json`

## Required blocker outputs if not closable

If the stage cannot close, reports must still include:
- exact blocker class
- failed path label
- banned strategy labels
- fallback mode active yes/no
- next executable action

## Completion criteria

This stage is closed only when:
- live workflow exists and is correct
- live DB path exists and is correct
- required runtime proofs pass
- post-test DB state verified
- audit score is 10/10
- closure report written
- `STATE.json` advanced

## Forbidden behaviors

- no SDK rabbit hole
- no unexplained redesign beyond stage scope
- no destructive deletion of workflow shell
- no “done” claim before runtime proof
- no future-stage implementation while this stage is active
