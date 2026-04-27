# Stage File — WF-EC-01 Execution Context Init

## Stage identity

- Stage code: `WF-EC-01`
- Workflow shell name: `WF-EC-01`
- Current objective: build and validate Execution Context Init
- Upstream dependency: `WF-TR-01` closed
- Working mode: contract-first, shell-preserving, live-runtime verified

## Why this stage exists

Execution Context Init is the first state-bearing layer after Thread Resolver.

It must create the temporary execution state that later stages use for:
- orchestrator handoff
- plan generation
- dispatch
- aggregation
- retry
- recovery

## Workflow shell policy

The existing `WF-EC-01` workflow created by the user is a placeholder shell.

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
  "tenant_id": "uuid",
  "thread_id": "uuid",
  "trigger_message_id": "uuid",
  "resolution_method": "string",
  "resolved_at": "ISO 8601",
  "idempotency_key": "string"
}
```

### Output contract
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "thread_id": "uuid",
  "trigger_message_id": "uuid",
  "status": "initialized",
  "current_goal": null,
  "current_plan_ref": null,
  "pending_steps": [],
  "completed_steps": [],
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

## Required DB side effects

1. insert exactly one execution-context row for a valid new request
2. preserve deterministic idempotency behavior
3. on replay, return the same logical row / existing context
4. no writes outside the execution-context structure in this stage

## Live-schema status note

If live DB introspection confirms a status set different from the long-term canonical target:
- use the live schema status set for this stage
- keep output mapping explicit
- do not guess future status values into current writes

## If direct table creation or change is blocked

If `execution_contexts` cannot be created or modified safely:
- create `execution_contexts_claude_mcp`
- continue only if the stage contract remains provable
- document exact merge-back SQL and divergence notes

## If workflow write surface is unavailable

If no verified native write surface exists for the `WF-EC-01` shell:
- do not continue SDK probing
- produce:
  - target node layout
  - target native workflow JSON blueprint
  - exact patch plan
  - blocker classification
  - next executable path
- classify stage as `BLOCKED_WITH_EVIDENCE`
- do not claim runtime completion

This is an allowed blocked outcome for this stage.
It is not closure.

## Recommended node layout

1. `EC_Trigger`
2. `EC_Validate_Input`
3. `EC_Route_Valid`
4. `EC_Build_Init_Payload`
5. `EC_Upsert_Context`
6. `EC_Load_Existing_Context` if required for replay path
7. `EC_Return_Result`
8. `EC_Return_Error`

Helper nodes are allowed only if they are minimal and readable.

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
- row inserted
- required fields populated
- status is correct for the live schema
- output contract matches

### V4 — idempotency
- replay does not create duplicate rows
- existing row is returned or preserved correctly

### V5 — cross-tenant behavior
- same trigger under different tenants behaves correctly for tenant-scoped data

### V6 — TR -> EC smoke
- use a real or realistic Thread Resolver result
- confirm handoff works

## Required reports for this stage

- `BUILD_REPORT.md`
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `CLOSURE_REPORT.md`
- `STATE.json`

## Completion criteria

This stage is closed only when:
- live workflow exists and is correct
- live DB path exists and is correct
- happy path passes
- replay/idempotency passes
- invalid input path passes
- TR -> EC smoke passes
- post-test DB state is verified
- final audit score is 10/10

## Forbidden behaviors

- no workflow SDK rabbit hole
- no unexplained redesign beyond stage scope
- no destructive deletion of the workflow shell
- no “done” claim before runtime proof
- no advancement to `WF-OR-01` while this stage is active
