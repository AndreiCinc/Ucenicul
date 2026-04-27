# Stage Template

Use this template only after the current stage is fully closed.

Do not create a new active stage file before the current stage reaches 10/10 closure.

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

You may not:
- delete the workflow record itself
- leave it blank after an update
- treat write success as proof without live re-read
- redesign downstream stages inside this stage

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

## If direct DB change is blocked

If canonical DB change is blocked or risky:
- create a parallel structure with suffix `_claude_mcp`
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

1. `[Stage]_Trigger`
2. `[Stage]_Validate_Input`
3. `[Stage]_Build_Payload`
4. `[Stage]_Main_DB_or_Action_Node`
5. `[Stage]_Return_Result`
6. `[Stage]_Return_Error`

Add helper nodes only if minimal and readable.

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
- required side effect occurs
- required fields populated
- output contract matches

### V4 — replay / idempotency
- replay behavior matches stage contract
- duplicate side effects do not occur unless explicitly intended

### V5 — cross-tenant / isolation behavior
- isolation remains correct for tenant-scoped data

### V6 — upstream smoke handoff
- use a real or realistic result from the previous stage
- confirm handoff works

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

---

## Authoring checklist

Before using this template as a real stage file, replace every placeholder with:
- real stage code
- real shell name
- exact stage objective
- exact contracts
- exact DB side effects
- exact validation matrix
- exact blocker behavior for this stage
- exact next executable path for blocked-state handoff
