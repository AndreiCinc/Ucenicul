# Scorecard and Gates

Each stage is scored from 1 to 10.  
Closure requires **10/10**.

## Scoring dimensions

1. Architectural correctness
2. Workflow correctness
3. Node-level correctness
4. Database correctness
5. Workflow-to-DB alignment
6. Documentation completeness
7. Testability
8. Migration safety
9. Anti-hallucination precision
10. Readiness for unattended handoff

## Scoring rule

A stage cannot receive 10/10 unless all are true:
- no known blocker remains
- all mandatory tests passed
- all claims tied to live evidence
- no unresolved audit item remains
- no “temporary fix” remains undocumented

## Minimum gate per loop

### Build gate
Required before audit:
- implementation exists
- workflow or DB delta exists
- no shell-loss occurred

### Audit gate
Required before runtime:
- build report updated
- audit findings listed
- unresolved critical items either fixed or explicitly deferred by stage contract

### Runtime gate
Required before closure:
- happy path passed
- invalid path passed if applicable
- idempotency path passed if applicable
- post-test DB check passed

### Closure gate
Required before next stage:
- score 10/10
- closure report written
- STATE advanced

## Failure handling

If score < 10:
- do not advance
- enter fix loop
- update `FIX_LOG.md`
- rerun the minimum affected tests

## Current target quality

For this pipeline, “good enough” is not enough.
The standard is:
- live
- proven
- documented
- repeatable
- non-fragile

Runtime Alignment Score (mandatory)
Does this stage move the system toward canonical runtime?
