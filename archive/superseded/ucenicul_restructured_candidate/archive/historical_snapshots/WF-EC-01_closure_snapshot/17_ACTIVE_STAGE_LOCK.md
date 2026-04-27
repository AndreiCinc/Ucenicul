# Active Stage Lock

## Purpose

Defines the hard execution boundary for the currently active stage.

Prevents:
- cross-stage drift
- unintended mutations
- opportunistic redesign
- silent broadening of scope

## Current active stage

- Stage id: `WF-EC-01`
- Stage name: `Execution Context Init`
- Canonical workflow shell: `WF-EC-01`
- Canonical primary table: `execution_contexts`
- Fallback table if needed: `execution_contexts_claude_mcp`
- Canonical stage file: `06_STAGE_WF-EC-01.md`
- Machine state pointer: `STATE.json`
- Human state pointer: `CURRENT_STAGE.md`
- Current reports:
  - `BUILD_REPORT.md`
  - `AUDIT_REPORT.md`
  - `FIX_LOG.md`
  - `CLOSURE_REPORT.md`

## Upstream dependency

- `WF-TR-01` is closed
- its output may be reused as carry-forward evidence
- its canonical implementation is not to be modified during this stage

## Downstream dependency

- `WF-OR-01` is planning only
- it may not be implemented or activated while this lock is active

## Allowed workflow mutations

- replace placeholder internals inside the existing `WF-EC-01` shell
- remove placeholder internals
- reconnect and restructure nodes inside `WF-EC-01`
- add the stage-required nodes:
  - `EC_Trigger`
  - `EC_Validate_Input`
  - `EC_Route_Valid`
  - `EC_Build_Init_Payload`
  - `EC_Upsert_Context`
  - `EC_Load_Existing_Context` if needed
  - `EC_Return_Result`
  - `EC_Return_Error`
- add minimal helper nodes required by the stage contract

## Allowed DB mutations

- insert one execution context row per valid input
- preserve deterministic idempotent behavior
- create `execution_contexts_claude_mcp` only if direct work on `execution_contexts` is blocked or risky
- create stage-marked fixtures
- clean current-stage fixtures only when cleanup rules allow it

## Allowed documentation mutations

- update:
  - `BUILD_REPORT.md`
  - `AUDIT_REPORT.md`
  - `FIX_LOG.md`
  - `CLOSURE_REPORT.md`
  - `CURRENT_STAGE.md`
  - `STATE.json`

No unrelated pipeline document may be edited during this stage unless the active stage explicitly requires it.

## Forbidden mutations

### Workflow
- do not delete `WF-EC-01`
- do not leave it blank
- do not modify `WF-TR-01`
- do not modify future-stage workflows
- do not treat write success as proof without live re-read

### Database
- no writes outside execution-context structures for this stage
- no destructive mutation of carry-forward Thread Resolver evidence
- no unmarked ad hoc rows as proof
- no cleanup of ambiguous legacy rows

### Stage behavior
- do not start the next stage
- do not reopen closed stages
- do not redesign the runtime beyond current contract
- do not drift into SDK/tool research as substitute for stage shipping

## Destructive operation policy

Destructive action is allowed only for clearly marked current-stage fixtures when all are true:
- target is explicitly marked with active stage marker
- target is not needed for closure evidence
- target is not needed for next-stage handoff
- target is reversible or trivially recreatable
- current workflow before-snapshot exists when workflow-adjacent risk exists

## Stage-local source of truth

1. latest verified live workflow state for `WF-EC-01`
2. latest verified live DB state for `execution_contexts` or fallback structure
3. current stage file
4. current reports and `STATE.json`

## Exit condition

This lock remains active until one of:
- `STAGE_CLOSED`
- `BLOCKED_WITH_EVIDENCE`
- `HUMAN_DECISION_REQUIRED`

## Current lock status

- Lock status: `ACTIVE`
- Current stage posture: `BLOCKED_WITH_EVIDENCE`
- Current failed path: `sdk_update_workflow_code`
- Current next executable path: `use a verified native workflow JSON write surface or keep stage blocked with evidence`
