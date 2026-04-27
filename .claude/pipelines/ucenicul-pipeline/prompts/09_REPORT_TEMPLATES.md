# Report Templates

Use these templates exactly.

---

## BUILD_REPORT.md

```md
# Build Report

## Stage
WF-XXXX

## Objective
[what this stage is building]

## Live starting state
- workflow:
- db:
- blockers already known:

## Changes made
1.
2.
3.

## Artifacts changed
- workflow:
- sql:
- docs:

## Test data created
- [ids / prefixes / rows]

## Notes
- 
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

## Runtime Impact
What changed in runtime behavior?
What becomes possible after this stage?
What remains blocked?

## Verified by live workflow read
-
## Verified by DB query
-
## Verified by runtime execution
-
## Inferred but not yet executed
-
## Unknown
-

## Findings
1.
2.
3.

## Required fixes
1.
2.
3.
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

## Fix applied
[exact fix]

## Verification
- live re-read:
- db check:
- runtime check:

## Outcome
PASS / FAIL / PARTIAL
```

---

## CLOSURE_REPORT.md

```md
# Closure Report

## Stage
WF-XXXX

## Verdict
CLOSED / BLOCKED / PARTIAL

## What is live
-
## What was runtime-tested
-
## DB state after testing
-
## Remaining non-blocking notes
-
## Next stage readiness
READY / BLOCKED

## Final score
X/10
```
