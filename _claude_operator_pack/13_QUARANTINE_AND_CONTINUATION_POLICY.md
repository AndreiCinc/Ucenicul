# 13_QUARANTINE_AND_CONTINUATION_POLICY

## Purpose
Definește cum continui lotul când un workflow nu poate fi rezolvat sigur.

## Quarantine triggers
- no dominant canonical source
- live patch required but impossible to verify
- contradictory proof with no safe dominance
- repeated remediation failure after max passes
- unresolved sensitive exposure risk

## Required quarantine outputs
- `QUARANTINE_NOTE__<WF>.md`
- blocker list
- evidence summary
- safe next step
- exact reason the workflow was not closed

## Continuation rule
După quarantine:
- update queue status
- continue next workflow
- do not reopen quarantined workflow in same run unless a newly produced artifact removes the blocker
