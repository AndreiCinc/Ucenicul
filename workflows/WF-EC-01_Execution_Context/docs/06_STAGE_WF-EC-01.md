# Stage File — WF-EC-01 Execution Context Init

## Stage identity

- Stage code: `WF-EC-01`
- Workflow shell name: `WF-EC-01`
- Current objective: build and validate **Execution Context Init**
- Upstream dependency: `WF-TR-01` thread layer already closed
- Working mode: contract-first, shell-preserving, live-runtime verified

## Why this stage exists

Execution Context Init is the immediate next canonical step after Thread Resolver.  
It must create the temporary execution state that later stages will use for planning, dispatch, aggregation, and completion.

## Workflow shell policy

The existing `WF-EC-01` workflow created by the user is a placeholder shell.
You may:
- replace its nodes
- remove its placeholder internals
- reconnect and restructure it completely

You may NOT:
- delete the workflow record itself
- leave it blank after an update
- treat MCP save success as proof without re-reading the live workflow

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

1. insert one execution context row
2. use deterministic idempotency behavior
3. on replay, return the same logical row / existing context
4. no writes outside the execution-context structure for this stage

## If direct table creation is blocked

If `execution_contexts` cannot be created or modified safely:
- create `execution_contexts_claude_mcp`
- continue implementation against it
- document exact merge SQL for later migration

## Recommended node layout

1. `EC_Trigger`
2. `EC_Validate_Input`
3. `EC_Build_Init_Payload`
4. `EC_Upsert_Context`
5. `EC_Load_Existing_Context` (if needed for replay path)
6. `EC_Return_Result`
7. `EC_Return_Error`

You may add helper nodes if needed, but keep the layout minimal and readable.

## Required validations

### V1 — shell integrity
- workflow still exists
- node count is sane
- connections are present
- active/draft state understood

### V2 — input validation
- missing required field fails cleanly
- malformed input fails cleanly

### V3 — happy path
- row inserted
- required fields populated
- status initialized
- output contract matches

### V4 — idempotency
- replay does not create duplicate rows
- existing row is returned / preserved correctly

### V5 — cross-tenant behavior
- same trigger under different tenant creates distinct context if the contract allows it

### V6 — TR -> EC smoke
- use a real or realistic Thread Resolver result
- confirm handoff works

## Required reports for this stage

- `BUILD_REPORT.md`
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `CLOSURE_REPORT.md`

## Completion criteria

This stage is CLOSED only when:
- live workflow exists and is correct
- live DB/table path exists and is correct
- happy path passes
- replay/idempotency passes
- invalid input path passes
- TR -> EC smoke passes
- post-test DB state verified
- audit score is 10/10

## Forbidden behaviors

- no workflow SDK rabbit hole
- no unexplained redesign beyond stage scope
- no destructive deletion of the workflow shell
- no “done” claim before runtime proof
