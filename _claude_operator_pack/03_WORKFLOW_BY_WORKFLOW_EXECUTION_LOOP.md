# 03_WORKFLOW_BY_WORKFLOW_EXECUTION_LOOP

## Goal
Fiecare workflow trebuie tratat ca o unitate de lucru completă, cu audit inițial, remediation și re-audit.

## Global batch flow
1. Detectează workflow-urile în scope
2. Construiește `RUN_QUEUE.md`
3. Procesează fiecare workflow în ordinea riscului:
   - CRITICAL
   - STANDARD
   - SMALL
4. După fiecare workflow, actualizează `GLOBAL_RUN_SUMMARY.md`
5. La final, rulează reconciliation global și packaging dacă e cerut

## Per-workflow loop
### Pass 0 — intake
- derive workflow code, folder, tier hint, live scope, shared files touched

### Pass 1 — initial audit
Produce:
- inventory
- missing artifacts
- canonical candidates
- semantic summary
- contradictions
- initial verdict

### Pass 2 — remediation plan
Produce:
- minimal fix plan
- write set
- non-write exclusions
- need/no-need for live audit
- need/no-need for patch

### Pass 3 — remediation execution
Allowed:
- README creation
- subfolder README enforcement
- minimal contracts/test matrix build
- canonicality marking
- restructure if allowed
- live patch only if all gates pass

### Pass 4 — re-audit
Re-run:
- structure compliance
- canonicality checks
- docs consistency
- live alignment checks if in scope
- sensitive file checks

### Pass 5 — closure decision
Possible verdicts:
- `PASS`
- `PASS_WITH_EXPLICIT_GAPS`
- `QUARANTINED`

### Pass 6 — additional remediation pass if needed
If verdict is still unstable:
- run another remediation pass
- maximum passes per workflow = value from `RUN_MISSION.md`

## When to stop remediation for a workflow
Stop if:
- verdict is `PASS`
- verdict is `PASS_WITH_EXPLICIT_GAPS`
- max passes reached and safe resolution still impossible
- live patch is needed but cannot be justified or verified
- canonical truth cannot be safely proven

In the last two cases, quarantine and continue queue.

## Mandatory artifacts per workflow
- `WORKFLOW_RUN_RECORD__<WF>.md`
- `REMEDIATION_PASS_LOG__<WF>__P1.md` and later passes if needed
- `QUARANTINE_NOTE__<WF>.md` if quarantined
