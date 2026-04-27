# Autonomous Stop and Recovery

This file defines when Claude must keep going, when Claude must stop a path, and how Claude must recover without human input when possible.

The goal is to reduce human dependency while preventing uncontrolled drift and repeated no-progress loops.

## 0. Core principle

Claude should continue autonomously by default.
Stopping is allowed only when:
- progress cannot continue safely
- no valid fallback remains
- evidence is insufficient to proceed without inventing

If a risk can be reduced through a reversible, non-destructive action, Claude must reduce it and continue.

## 1. Continue vs stop rule

### Continue automatically when:
- a safe fallback exists
- a parallel DB structure can be created
- the workflow shell can be preserved
- the blocker is procedural rather than architectural
- the next action can produce live evidence

### Stop the current path when:
- the same path produced no new evidence twice
- the current write strategy risks blanking or deleting the workflow shell
- schema truth cannot be verified
- runtime proof cannot be obtained through the current path

Stopping the current path does not mean stopping the whole stage.
It means switching to recovery mode.

## 2. Recovery mode

When a path is stopped:
1. preserve current evidence
2. classify blocker type
3. choose the smallest safe fallback
4. update reports and `STATE.json`
5. continue on the fallback path

Do not restart the failed path unless new evidence justifies it.

## 3. Autonomous recovery priorities

When recovering, choose in this order:
1. preserve live shell and current stage assets
2. preserve canonical source-of-truth boundaries
3. create safe fallback DB structures if needed
4. produce runtime evidence on the fallback path
5. leave clear merge-back notes for later human review

### Stage-completion fallback hierarchy

When a stage cannot complete on the canonical path, select the first
viable option in this strict order:

1. canonical path with unchanged stage contract
2. canonical path with reduced scope that still satisfies the stage
   contract
3. parallel structure with `_claude_mcp` suffix (DB) or minimal
   in-place shell patch (n8n) preserving identity
4. reduced-scope closure with explicitly deferred items listed in
   `CLOSURE_REPORT.md`
5. `BLOCKED_WITH_EVIDENCE` including a next executable path
6. `HUMAN_DECISION_REQUIRED` only if no option 1–5 is reachable

Skipping a level requires recorded justification in `FIX_LOG.md` and
`AUDIT_REPORT.md`. Jumping directly to option 5 or 6 without a logged
attempt at options 1–4 is not permitted.

## 4. Hard stop conditions

Claude must emit `HUMAN_DECISION_REQUIRED` only if at least one is true:
- a real business/product decision is required and no source resolves it
- no live DB read path exists and schema cannot be verified
- no live workflow read path exists and workflow truth cannot be verified
- every available fallback would require guessing the contract
- continuing would knowingly destroy canonical state

Do not use `HUMAN_DECISION_REQUIRED` for inconvenience, tool frustration, or ordinary ownership blockers.

## 5. Blocked-with-evidence condition

If the stage cannot continue but no human decision is actually required, emit:
- `BLOCKED_WITH_EVIDENCE`

This means:
- current path is blocked
- all safe fallbacks were attempted or disproven
- evidence is preserved
- the stage is paused in a recoverable state

This is preferred over vague “not sure” reporting.

## 6. Required recovery outputs

When entering recovery mode, Claude must update:
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `STATE.json`
- `CLOSURE_REPORT.md` if the stage must pause

The update must include:
- blocker class
- failed path
- fallback chosen
- reason fallback is safe
- next autonomous action

## 7. STATE.json recovery fields

If recovery mode is active, `STATE.json` should reflect:
- current stage
- current phase
- current score
- fallback mode active: true/false
- failed path label
- next path label
- retry count
- hard blockers
- soft blockers
- latest evidence level
- advance allowed: false until closure

## 8. Resume rule

If a fallback path succeeds:
- exit recovery mode
- continue normal execution loop
- do not return to the failed path unless required and justified by new evidence

## 9. End-of-run safety rule

At the end of an unattended run, Claude must leave one of these states only:
- `stage_closed`
- `stage_active_with_next_action`
- `blocked_with_evidence`
- `human_decision_required`

Do not leave the system in an ambiguous state.
