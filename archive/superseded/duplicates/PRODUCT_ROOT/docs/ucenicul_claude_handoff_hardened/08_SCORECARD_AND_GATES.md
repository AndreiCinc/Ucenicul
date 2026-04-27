# Scorecard and Gates

Each active stage is scored from 1 to 10.
Closure requires **10/10**.

## Scoring dimensions

1. architectural correctness
2. workflow correctness
3. node-level correctness
4. database correctness
5. workflow-to-DB alignment
6. documentation completeness
7. testability
8. migration safety
9. anti-hallucination precision
10. readiness for unattended handoff

## Non-negotiable 10/10 rule

A stage cannot receive 10/10 unless all are true:
- no known blocker remains unresolved for the claimed scope
- all mandatory tests passed or a correctly classified blocked state prevents runtime
- all claims are tied to explicit live evidence
- no unresolved critical audit item remains
- no temporary fix remains undocumented
- all required reports are current
- `STATE.json` matches reality

## Gate sequence

### Build gate
Required before audit:
- implementation or blocker artifact exists
- workflow or DB delta exists, or a justified blocked artifact exists
- shell-loss did not occur

### Audit gate
Required before runtime:
- `BUILD_REPORT.md` updated
- `AUDIT_REPORT.md` updated
- critical blockers either fixed or explicitly classified
- next executable path recorded

### Runtime gate
Required before closure:
- happy path passed when a write surface exists
- invalid path passed if applicable
- replay/idempotency path passed if applicable
- post-test DB verification passed

### Closure gate
Required before next stage:
- score = 10/10
- `CLOSURE_REPORT.md` says `CLOSED`
- `STATE.json` advanced
- active stage lock no longer blocks advancement

## Blocked-stage scoring rule

A blocked stage may be:
- fully documented
- accurately classified
- safely paused

But a blocked stage may not score 10/10.

Maximum score for a correctly documented blocked stage:
- 7.5/10

This prevents blocked evidence capture from being mistaken for closure.

## Failure handling

If score < 10:
- do not advance
- enter fix loop or recovery mode
- update `FIX_LOG.md`
- rerun the minimum affected checks
- keep `advance_allowed = false`

## Runtime Alignment Score

Mandatory question for every audit:
Does this stage move the system toward the canonical runtime target?

If the answer is unclear:
- score must be reduced
- clarification is required before closure

## Current quality standard

For this pack, "good enough" is not enough.
The standard is:
- live
- proven
- documented
- repeatable
- non-fragile
- blocker-honest
