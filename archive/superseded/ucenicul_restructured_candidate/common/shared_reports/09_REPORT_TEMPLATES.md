# Report Templates

Use these templates exactly unless a stage file explicitly requires more stage-local detail.

The templates below are the minimum reporting contract.
Additional stage-local fields may be appended, but none of the required sections may be removed.

---

## BUILD_REPORT.md

```md
# Build Report

## Stage
WF-XXXX

## Attempt identity
- attempt_date:
- phase:
- strategy_label:
- strategy_retry_count:
- reversible: yes/no

## Objective
[what this stage is trying to build]

## Live starting state
- workflow:
- db:
- shell identity:
- known blockers:
- active write surface:
- snapshot_before_id:

## Changes made
1.
2.
3.

## Artifacts changed
- workflow:
- db:
- docs:
- state:

## Fixture ledger
- fixture_label:
  - scope_class:
  - tables_touched:
  - replay_expected:
  - cleanup_classification:

## Tooling notes
- tool path used:
- tool result label: healthy / degraded / unsafe_for_current_stage / blocked
- failure class if any:
- preset used if any:

## Verification after build
- verified by live workflow read:
- verified by DB query:
- inferred but not yet executed:
- unknown:

## Notes
- 

## Next executable action
[specific command, API action, file path, workflow id, or stage step]
```

---

## AUDIT_REPORT.md

```md
# Audit Report

## Stage
WF-XXXX

## Audit summary
- status:
- current score:
- runtime alignment verdict:
- blocker posture:

## Runtime impact
- what changed:
- what is now possible:
- what remains blocked:

## Evidence classification
### Verified by live workflow read
-
### Verified by DB query
-
### Verified by runtime execution
-
### Inferred but not yet executed
-
### Unknown
-

## Findings
1.
2.
3.

## Required fixes
1.
2.
3.

## Conflict log
- source-of-truth conflict:
- decision taken:
- why:

## Recovery status
- fallback_mode_active:
- failed_path_label:
- next_path_label:
- banned_strategy_labels:

## Next executable action
[specific command, API action, file path, workflow id, or stage step]
```

---

## FIX_LOG.md

```md
# Fix Log

## Stage
WF-XXXX

## Fix cycle
1

## Problem
[exact problem]

## Root cause
[exact cause]

## Failure classification
- tool:
- failure_class:
- degraded_label:
- preset_used:
- strategy_banned_now: yes/no

## Fix applied
[exact fix]

## Verification
- live re-read:
- db check:
- runtime check:
- snapshot_before_id:
- snapshot_after_id:
- rollback_source_if_any:

## Outcome
PASS / FAIL / PARTIAL

## Next executable action
[specific command, API action, file path, workflow id, or stage step]
```

---

## CLOSURE_REPORT.md

```md
# Closure Report

## Stage
WF-XXXX

## Verdict
CLOSED / BLOCKED_WITH_EVIDENCE / PARTIAL / HUMAN_DECISION_REQUIRED

## What is live
-
## What was runtime-tested
-
## DB state after testing
-
## Remaining non-blocking notes
-
## Remaining blocking notes
-
## Next stage readiness
READY / BLOCKED

## Final score
X/10

## State transition
- previous_state:
- new_state:
- advance_allowed:

## Next executable action
[specific command, API action, file path, workflow id, or stage step]
```
