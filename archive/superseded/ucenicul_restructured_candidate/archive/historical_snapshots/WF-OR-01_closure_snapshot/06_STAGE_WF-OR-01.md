# Stage File — WF-OR-01 Orchestrator Input Handoff

## Stage identity

- Stage code: `WF-OR-01`
- Workflow shell name: `WF-OR-01`
- Current objective: build and validate the bounded handoff layer that converts a closed `WF-EC-01` result into an orchestrator-ready input envelope without doing planning, module execution, or final response generation
- Upstream dependency: `WF-EC-01` closed at 10/10
- Working mode: contract-first, shell-preserving, live-runtime verified

## Why this stage exists

This stage exists to create a clean runtime boundary between:
- `Execution Context Init`
and
- the actual orchestrator / planner sequence

The stage is intentionally narrow.

It must:
- accept a valid execution-context result from `WF-EC-01`
- validate that the execution envelope is usable
- normalize that envelope into orchestrator-ready input
- stop unsafe or incomplete payloads before they reach planning

It must not:
- generate a plan
- dispatch modules
- write domain state
- compose user-facing output

## Stage-scope decision

For this stage, the chosen scope is:

`EC -> OR adapter / handoff only`

It does **not** include:
- first planner LLM call
- plan generation
- intent expansion beyond the validated handoff envelope
- module execution
- response composition

Those responsibilities begin in downstream stages:
- `WF-PL-01`
- `WF-DI-01`
- `WF-RA-01`
- `WF-RC-01`

## Workflow shell policy

The existing `WF-OR-01` workflow created by the user is a placeholder shell.

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
- `WF-EC-01`
- canonical upstream success shape only

```json
{
  "status_kind": "success",
  "result_type": "state",
  "module_name": "execution_context_init",
  "payload": {
    "tenant_id": "uuid|string",
    "thread_id": "uuid|string",
    "execution_id": "uuid|string",
    "trigger_message_id": "uuid|string",
    "idempotency_key": "string",
    "status": "initialized",
    "ttl_seconds": 900
  }
}
```

Optional fields accepted if upstream provides them:
- `resolution_method`
- `resolved_at`
- `created_at`
- `updated_at`
- `warnings`

### Output contract

The output of this stage is a **handoff envelope**, not a plan.

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
    "warnings": []
  }
}
```

### Error contract

```json
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "orchestrator_input_handoff",
  "error": {
    "code": "INVALID_HANDOFF_INPUT|CONTEXT_MISMATCH|NOT_READY_FOR_PLANNING",
    "message": "string",
    "missing_fields": []
  }
}
```

## Required DB side effects

1. no domain write is required to prove this stage
2. replay must remain side-effect-free by default
3. if any audit-only persistence is introduced, it may touch only:
   - `execution_contexts`
   - or a stage-safe fallback structure with suffix `_claude_mcp`

## Read-only DB expectations

This stage may read:
- `execution_contexts`
- thread-linked metadata only if required to prove input consistency
- stage-safe fallback structures

This stage must not write:
- `tasks`
- `reminders`
- `rag_memories`
- improvement-request storage
- response payload stores
- any downstream plan or module result structure unless the stage file is explicitly revised later

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

1. `OR_Trigger`
2. `OR_Validate_EC_Result`
3. `OR_Extract_Handoff_Input`
4. `OR_Load_Execution_Context` (recommended)
5. `OR_Verify_Context_Match`
6. `OR_Build_Handoff_Payload`
7. `OR_Return_Result`
8. `OR_Return_Error`

Add helper nodes only if minimal and readable.

## Validation rules

### `OR_Validate_EC_Result`
Must reject:
- missing `status_kind`
- missing `result_type`
- missing `payload`
- upstream payloads not marked `initialized`
- malformed or incomplete execution identifiers

### `OR_Verify_Context_Match`
If live DB verification is enabled, the node must confirm:
- `execution_id` exists or maps correctly to the stage-supported identifier
- `tenant_id` matches the canonical context row
- `thread_id` matches the canonical context row
- no tenant leakage is possible

### `OR_Build_Handoff_Payload`
Must produce:
- one normalized handoff envelope
- one deterministic next-stage pointer
- one bounded orchestrator-ready input block
- no plan object
- no module calls
- no user-facing response text

## Required validations

### V1 — shell integrity
- workflow still exists
- node count is sane
- connections are present
- draft/active state understood

### V2 — input validation
- missing required field fails cleanly
- malformed upstream result fails cleanly
- wrong `status_kind` or `result_type` fails cleanly

### V3 — happy path
- valid `WF-EC-01` result is accepted
- handoff envelope is emitted
- output contract matches exactly
- no forbidden side effect occurs

### V4 — replay / idempotency
- replay with the same upstream result returns the same logical handoff shape
- no duplicate domain side effects occur
- if DB reads are used, replay remains stable

### V5 — cross-tenant / isolation behavior
- mismatched tenant/execution context is rejected cleanly
- no cross-tenant handoff is accepted silently

### V6 — upstream smoke handoff
- use a real or realistic `WF-EC-01` success result
- confirm `EC_Return_Result -> WF-OR-01` handoff works
- carry forward known MCP constraints from the previous stage

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

## Carry-forward runtime constraints from WF-EC-01

These constraints remain in force until disproven by new live evidence:

- `mcp__n8n__patch_workflow_nodes` remains unsafe for in-place shell mutation in this environment
- manual-mode workflow execution prefers the webhook-registered trigger
- dual-trigger pinData is the known working pattern when testing manual-trigger intent programmatically
- chat-trigger payloads require an adapter before they can safely drive structured stages

## Completion criteria

This stage is closed only when:
- live workflow exists and is correct
- live DB read path exists and is correct
- invalid input path passes
- happy path passes
- replay/idempotency path passes
- upstream smoke handoff passes
- post-test DB state is verified
- audit score is 10/10
- closure report written
- `STATE.json` advanced

## Forbidden behaviors

- no SDK rabbit hole
- no unexplained redesign beyond stage scope
- no destructive deletion of workflow shell
- no “done” claim before runtime proof
- no future-stage implementation while this stage is active
- no planning inside this stage
- no module execution inside this stage
- no final response generation inside this stage
