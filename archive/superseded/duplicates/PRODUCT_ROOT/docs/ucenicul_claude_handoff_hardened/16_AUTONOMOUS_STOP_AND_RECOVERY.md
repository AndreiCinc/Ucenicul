# Autonomous Stop and Recovery

This file defines when Claude must keep going, when Claude must stop a path, and how Claude must recover without human input when possible.

## Core principle

Continue autonomously by default.

Stopping is allowed only when:
- progress cannot continue safely
- no valid fallback remains
- evidence is insufficient to proceed without guessing

If risk can be reduced through a reversible non-destructive action, reduce it and continue.

## Continue automatically when

- a safe fallback exists
- a parallel DB structure can be created
- the workflow shell can be preserved
- the blocker is procedural rather than architectural
- the next action can produce new live evidence

## Stop the current path when

- the same path produced no new evidence twice
- the current write strategy risks blanking the shell
- schema truth cannot be verified
- workflow truth cannot be verified
- runtime proof cannot be obtained through the current path
- the path depends on unavailable tooling that is not stage-essential

Stopping the path does not mean stopping the stage.
It means entering recovery mode.

## Recovery mode

When a path is stopped:
1. preserve current evidence
2. classify blocker type
3. choose the smallest safe fallback
4. update reports and `STATE.json`
5. continue on the fallback path if one exists

Do not restart the failed path unless new evidence justifies it.

## Recovery priorities

1. preserve live shell and current stage assets
2. preserve canonical source-of-truth boundaries
3. create safe fallback DB structures if needed
4. produce runtime evidence on the fallback path if possible
5. leave clear merge-back notes for later human review

## Stage-completion fallback hierarchy

When a stage cannot complete on the canonical path, choose the first viable option:

1. canonical path with unchanged contract
2. canonical path with reduced scope that still satisfies the stage contract
3. safe fallback path preserving shell identity and source of truth
4. blocked evidence capture with concrete next executable action
5. `BLOCKED_WITH_EVIDENCE`
6. `HUMAN_DECISION_REQUIRED`

Skipping a level requires justification in `AUDIT_REPORT.md` and `FIX_LOG.md`.

## Hard stop conditions for `HUMAN_DECISION_REQUIRED`

Use `HUMAN_DECISION_REQUIRED` only if at least one is true:
- a real business/product decision is required
- no live DB read path exists
- no live workflow read path exists
- every fallback would require guessing the contract
- continuing would knowingly destroy canonical state

Do not use it for:
- ordinary tooling frustration
- browser extension absence
- SDK mismatch
- ownership blockers when `_claude_mcp` fallback exists

## `BLOCKED_WITH_EVIDENCE` rule

Use `BLOCKED_WITH_EVIDENCE` when:
- current path is blocked
- safe fallbacks were attempted or disproven
- evidence is preserved
- next executable action is known
- no human decision is actually required yet

This is preferred over vague uncertainty.

## Required recovery outputs

When recovery mode is active, update:
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `STATE.json`
- `CLOSURE_REPORT.md` if the stage must pause

Include:
- blocker class
- failed path label
- fallback chosen or unavailable
- reason fallback is safe
- banned strategy labels
- next executable action

## Required `STATE.json` recovery fields

Recovery-aware state must include:
- current stage
- current phase
- status
- current score
- fallback_mode_active
- failed_path_label
- next_path_label
- retry_count
- hard_blockers
- soft_blockers
- latest_evidence_level
- advance_allowed

## Resume rule

If a fallback path succeeds:
- exit recovery mode
- continue normal execution loop
- do not return to the failed path unless new evidence justifies it

## End-of-run safety rule

At the end of an unattended run, leave only one of these:
- `stage_closed`
- `stage_active_with_next_action`
- `blocked_with_evidence`
- `human_decision_required`

No ambiguous end state is allowed.
