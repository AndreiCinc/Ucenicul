# Active Stage Lock

## Purpose

Defines the hard execution boundary for the currently prepared stage candidate.

Prevents:
- cross-stage drift
- unintended mutations
- opportunistic redesign
- silent broadening of scope

## Current active stage candidate

- Stage id: `WF-PL-01`
- Stage name: `Plan Generation`
- Canonical workflow shell: `WF-PL-01`
- Canonical primary table: `execution_contexts`
- Fallback table if needed: `execution_contexts_claude_mcp`
- Canonical stage file: `07_STAGE_WF-PL-01.md`
- Machine state pointer: `STATE.json`
- Human state pointer: `CURRENT_STAGE.md`
- Current reports:
  - `BUILD_REPORT.md`
  - `AUDIT_REPORT.md`
  - `FIX_LOG.md`
  - `CLOSURE_REPORT.md`

## Upstream dependency

- `WF-OR-01` is closed
- its output may be reused as carry-forward evidence
- its canonical implementation is not to be modified during this stage candidate preparation

## Downstream dependency

- `WF-DI-01` is planning only
- it may not be implemented or activated while this lock is active

## Allowed workflow mutations

- replace placeholder internals inside the existing `WF-PL-01` shell
- remove placeholder internals
- reconnect and restructure nodes inside `WF-PL-01`
- add the stage-required nodes:
  - `PL_Trigger`
  - `PL_Validate_OR_Handoff`
  - `PL_Route_Valid`
  - `PL_Extract_Planning_Input`
  - `PL_Load_Execution_Context`
  - `PL_Verify_Context_Match`
  - `PL_Load_Module_Registry`
  - `PL_Build_Planner_Input`
  - `PL_Route_Context_Ready`
  - `PL_Generate_Plan`
  - `PL_Return_Result`
  - `PL_Return_Error`
- add minimal helper nodes required by the stage contract

## Allowed DB mutations

- none required for stage proof by default
- read-only verification against `execution_contexts`
- create `execution_contexts_claude_mcp` only if direct work on `execution_contexts` becomes blocked or risky
- create stage-marked fixtures only if live runtime requires them
- clean current-stage fixtures only when cleanup rules allow it

## Allowed documentation mutations

- update:
  - `BUILD_REPORT.md`
  - `AUDIT_REPORT.md`
  - `FIX_LOG.md`
  - `CLOSURE_REPORT.md`
  - `CURRENT_STAGE.md`
  - `STATE.json`

No unrelated pipeline document may be edited during this stage candidate unless the active stage explicitly requires it.

## Forbidden mutations

### Workflow
- do not delete `WF-PL-01`
- do not leave it blank
- do not modify `WF-OR-01`
- do not modify future-stage workflows
- do not treat write success as proof without live re-read

### Database
- no writes outside execution-context structures for this stage
- no destructive mutation of carry-forward OR evidence
- no unmarked ad hoc rows as proof
- no cleanup of ambiguous legacy rows

### Stage behavior
- do not start `WF-DI-01`
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

1. latest verified live workflow state for `WF-PL-01` when available
2. latest verified live DB state for `execution_contexts` or fallback structure
3. current stage file
4. current reports and `STATE.json`

## Exit condition

This lock remains active until one of:
- `STAGE_CLOSED`
- `BLOCKED_WITH_EVIDENCE`
- `HUMAN_DECISION_REQUIRED`

## Current lock status

- Lock status: `CANDIDATE_ACTIVE`
- Current stage posture: `ACTIVE_WITH_NEXT_ACTION`
- Current next executable path: `user imports the WF-PL-01 blueprint into the live shell, then Claude runs V1–V6 and post-test DB drift verification`
