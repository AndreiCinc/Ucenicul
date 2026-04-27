# Active Stage Lock

## Purpose

Defines the hard execution boundary for the currently active stage.

Prevents:
- cross-stage drift
- unintended mutations
- opportunistic redesign
- silent broadening of scope

## Current active stage

- Stage id: `WF-OR-01`
- Stage name: `Orchestrator Input Handoff`
- Canonical workflow shell: `WF-OR-01`
- Canonical primary table: `execution_contexts` (read path)
- Fallback table if needed: `execution_contexts_claude_mcp`
- Canonical stage file: `06_STAGE_WF-OR-01.md`
- Machine state pointer: `STATE.json`
- Human state pointer: `CURRENT_STAGE.md`
- Current reports:
  - `BUILD_REPORT.md`
  - `AUDIT_REPORT.md`
  - `FIX_LOG.md`
  - `CLOSURE_REPORT.md`

## Upstream dependency

- `WF-EC-01` is closed
- its output must be reused as carry-forward evidence where possible
- its canonical implementation is not to be modified during this stage

## Downstream dependency

- `WF-PL-01` is planning only
- it may not be implemented or activated while this lock is active

## Allowed workflow mutations

- replace placeholder internals inside the existing `WF-OR-01` shell
- remove placeholder internals
- reconnect and restructure nodes inside `WF-OR-01`
- add the stage-required nodes:
  - `OR_Trigger`
  - `OR_Validate_EC_Result`
  - `OR_Extract_Handoff_Input`
  - `OR_Load_Execution_Context` if needed
  - `OR_Verify_Context_Match`
  - `OR_Build_Handoff_Payload`
  - `OR_Return_Result`
  - `OR_Return_Error`
- add minimal helper nodes required by the stage contract

## Allowed DB mutations

- read from execution-context structures
- create stage-marked fixtures
- create `execution_contexts_claude_mcp` only if direct work on canonical structures is blocked or risky
- perform audit-only writes only if they are explicitly stage-safe and reversible

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
- do not delete `WF-OR-01`
- do not leave it blank
- do not modify `WF-EC-01`
- do not modify future-stage workflows
- do not treat write success as proof without live re-read

### Database
- no domain writes outside execution-context or stage-safe audit structures
- no task writes
- no reminder writes
- no memory writes
- no destructive mutation of carry-forward EC evidence
- no unmarked ad hoc rows as proof
- no cleanup of ambiguous legacy rows

### Stage behavior
- do not start `WF-PL-01`
- do not reopen closed stages
- do not redesign the runtime beyond current contract
- do not drift into SDK/tool research as substitute for stage shipping
- do not turn handoff-stage logic into planning-stage logic

## Destructive operation policy

Destructive action is allowed only for clearly marked current-stage fixtures when all are true:
- target is explicitly marked with active stage marker
- target is not needed for closure evidence
- target is not needed for next-stage handoff
- target is reversible or trivially recreatable
- current workflow before-snapshot exists when workflow-adjacent risk exists

## Stage-local source of truth

1. latest verified live workflow state for `WF-OR-01`
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
- Current stage posture: `ACTIVE`
- Current next executable path: `read live WF-OR-01 shell -> verify DB reality -> build minimum handoff delta`
