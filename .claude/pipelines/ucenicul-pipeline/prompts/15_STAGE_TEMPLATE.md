# Stage Template

Use this template when creating the next stage file after the current stage is fully closed.

Do not create a new stage file before the current stage reaches 10/10 closure.

---

# Stage File — WF-XXXX Stage Name

## Stage identity

- Stage code: `WF-XXXX`
- Workflow shell name: `WF-XXXX`
- Current objective: [single sentence]
- Upstream dependency: [closed stage or required live prerequisite]
- Working mode: contract-first, shell-preserving, live-runtime verified

## Why this stage exists

[Explain only the direct architectural reason this stage exists.]

## Workflow shell policy

The existing `WF-XXXX` workflow created by the user is a placeholder shell.
You may:
- replace its nodes
- remove placeholder internals
- reconnect and restructure it completely

You may NOT:
- delete the workflow record itself
- leave it blank after an update
- treat write success as proof without live re-read

## Contract to implement

### Input contract
```json
{
  "field": "type"
}
```

### Output contract
```json
{
  "field": "type"
}
```

## Required DB side effects

1. [required write]
2. [required replay/idempotency behavior]
3. [write boundaries]

## If direct table creation is blocked

If canonical DB change is blocked or risky:
- create a parallel structure with suffix `_claude_mcp`
- continue implementation against it
- document exact merge-back notes for later migration

## Recommended node layout

1. `[Stage]_Trigger`
2. `[Stage]_Validate_Input`
3. `[Stage]_Build_Payload`
4. `[Stage]_Main_DB_or_Action_Node`
5. `[Stage]_Return_Result`
6. `[Stage]_Return_Error`

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
- required side effect occurs
- required fields populated
- output contract matches

### V4 — replay / idempotency
- replay behavior matches stage contract
- duplicate side effects do not occur unless explicitly intended

### V5 — cross-tenant / isolation behavior
- isolation remains correct if the stage touches tenant-scoped data

### V6 — upstream smoke handoff
- use a real or realistic result from the previous stage
- confirm handoff works

## Required reports for this stage

- `BUILD_REPORT.md`
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `CLOSURE_REPORT.md`

## Completion criteria

This stage is CLOSED only when:
- live workflow exists and is correct
- live DB path exists and is correct
- happy path passes
- replay/idempotency passes if applicable
- invalid input path passes
- upstream handoff smoke passes
- post-test DB state verified
- audit score is 10/10

## Forbidden behaviors

- no SDK rabbit hole
- no unexplained redesign beyond stage scope
- no destructive deletion of workflow shell
- no “done” claim before runtime proof

---

## Authoring checklist for the new stage file

Before using this template as a real stage file, replace every placeholder with:
- real stage code
- real workflow shell name
- exact stage objective
- exact contracts
- exact DB side effects
- exact validation matrix
- exact stage-specific forbidden behaviors if needed
