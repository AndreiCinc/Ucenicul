# Stage File — WF-DI-01 Dispatcher

## Stage identity

- Stage code: `WF-DI-01`
- Workflow shell name: `WF-DI-01`
- Current objective: Build and verify the dispatcher that consumes canonical plan envelopes from `WF-PL-01` and emits deterministic dispatch payloads without executing modules.
- Upstream dependency: `WF-PL-01` closed at 10/10
- Working mode: contract-first, shell-preserving, live-runtime verified only after import

## Why this stage exists

`WF-DI-01` converts a validated plan into dispatchable module requests while preserving dependency ordering, replay discipline, and module-boundary rules. It is the bridge between planning and module execution.

## Workflow shell policy

The existing `WF-DI-01` workflow created by the user is a placeholder shell.

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
```json
{
  "status_kind": "success",
  "result_type": "plan",
  "module_name": "plan_generation",
  "payload": {
    "tenant_id": "uuid",
    "thread_id": "uuid",
    "execution_id": "uuid",
    "trigger_message_id": "uuid",
    "idempotency_key": "string",
    "plan_id": "string",
    "goal": "string",
    "primary_intent": "string",
    "steps": [
      {
        "step_id": "string",
        "module_name": "string",
        "purpose": "string",
        "inputs": {},
        "depends_on": [],
        "execution_mode": "sequential|parallel",
        "expected_outputs": [],
        "replan_if": [],
        "failure_policy": "string",
        "status": "pending"
      }
    ],
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

### Output contract
```json
{
  "status_kind": "success",
  "result_type": "dispatch",
  "module_name": "dispatcher",
  "payload": {
    "tenant_id": "uuid",
    "thread_id": "uuid",
    "execution_id": "uuid",
    "plan_id": "string",
    "dispatch_id": "string",
    "allowed_next_stage": "WF-ME-01",
    "ready_groups": [
      {
        "group_id": "group:001",
        "execution_mode": "sequential|parallel",
        "step_ids": ["step_1"],
        "module_requests": [
          {
            "execution_context_id": "uuid",
            "thread_id": "uuid",
            "step_id": "step_1",
            "module_name": "task_module",
            "purpose": "string",
            "inputs": {},
            "idempotency_key": "string"
          }
        ]
      }
    ],
    "dispatch_guard": {
      "dispatch_allowed": true,
      "module_execution_started": false,
      "response_generation_allowed": false,
      "domain_writes_performed": false
    },
    "warnings": []
  }
}
```

## Required DB side effects

1. Read-only verification of the canonical `execution_contexts` row.
2. Read-only loading of any dispatcher-side registry or static module mapping.
3. No domain writes. No `tasks`, `reminders`, `rag_memories`, `messages`, or `public.execution_contexts` writes.

## If direct DB change is blocked

If canonical DB change is blocked or risky:
- do not create fallback writable structures for this stage
- keep the stage read-only
- document exact live-read blocker evidence

## If workflow write surface is blocked

If no verified native workflow write surface exists:
- do not enter SDK reverse-engineering
- capture blocker evidence
- produce target blueprint and patch plan
- emit `BLOCKED_WITH_EVIDENCE`
- leave a next executable action

## Recommended node layout

1. `DI_Trigger`
2. `DI_Validate_Plan_Result`
3. `DI_Extract_Dispatch_Input`
4. `DI_Load_Execution_Context`
5. `DI_Verify_Context_Match`
6. `DI_Load_Module_Registry`
7. `DI_Build_Ready_Steps`
8. `DI_Build_Dispatch_Payload`
9. `DI_Return_Result`
10. `DI_Return_Error`

Helper switches are allowed only for validity / readiness routing.

## Required validations

### V1 — shell integrity
- workflow still exists
- node count is sane
- connections are present
- draft/active state understood

### V2 — input validation
- missing required fields fail cleanly
- malformed steps fail cleanly

### V3 — happy path
- canonical plan result yields a canonical dispatch result
- dependency-free steps are grouped correctly
- output contract matches exactly

### V4 — replay / idempotency
- same plan envelope yields byte-identical dispatch output
- no side effects occur

### V5 — cross-tenant / isolation behavior
- execution context tenant mismatch fails closed
- missing execution row fails closed

### V6 — upstream smoke handoff
- use a real or realistic `WF-PL-01` result
- confirm dispatcher consumes the exact plan contract emitted by `WF-PL-01`

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
