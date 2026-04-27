# RUN_SCOPE_QUEUE

## Queue Construction Policy
This queue must be built only after discovery.

### Step 1
Discover all workflow folders physically present in `workflows/`.

### Step 2
Map discovered folders to expected workflow targets.

### Step 3
Build the execution queue using only:
- PRESENT_IN_REPO
- PRESENT_BUT_NONSTANDARD_NAME
- ARCHIVED_ONLY if directly required

### Step 4
Record non-present expected workflows as:
- MISSING_FROM_REPO

## Execution Policy
- Process present workflows in deterministic order.
- Do not skip silently.
- A blocked workflow becomes `QUARANTINED`, then continue.
- A globally missing workflow is `MISSING_FROM_REPO`, not `QUARANTINED`.
- A global environment blocker stops the run before per-workflow processing.

## Per-Workflow Mandatory Loop
1. inspect
2. inventory
3. classify
4. canonicality decision
5. missing artifact detection
6. minimal remediation
7. re-audit
8. second remediation only if justified
9. final verdict

## Final Verdicts
- PASS
- PASS_WITH_EXPLICIT_GAPS
- QUARANTINED
- OUT_OF_SCOPE
- MISSING_FROM_REPO