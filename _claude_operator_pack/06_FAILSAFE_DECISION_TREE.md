# 06_FAILSAFE_DECISION_TREE

## Rule
Nu întreba utilizatorul pentru cazurile de mai jos. Alege fallback-ul sigur și continuă.

## Case 1 — README missing
Action:
- create minimal README from strongest available sources
- mark uncertain fields explicitly

## Case 2 — multiple workflow JSON candidates
Action:
- run canonicality resolver
- if no dominant truth, mark candidates and quarantine workflow
- do not patch live

## Case 3 — contracts missing
Action:
- derive semantic contracts from canonical JSON + tests + reports
- do not invent unsupported guarantees

## Case 4 — state and closure disagree
Action:
- prefer stronger evidence
- emit reconciliation note
- update only the weaker layer
- if dominance unclear, quarantine

## Case 5 — live n8n unavailable
Action:
- downgrade to repo-only audit
- do not patch
- mark live verification gap explicitly

## Case 6 — live patch needed but no rollback path
Action:
- do not patch
- emit patch-blocked note
- continue with docs alignment only

## Case 7 — patch applied but re-read mismatches
Action:
- treat write as failed
- restore/re-patch if safe
- mark degraded tool path
- quarantine if invariants cannot be recovered

## Case 8 — folder contains mixed workflow evidence
Action:
- classify foreign files
- create relocation/exclusion plan
- only move if boundaries allow; otherwise exclude in package

## Case 9 — sensitive file discovered
Action:
- classify as sensitive
- exclude from package
- avoid copying its content into reports

## Case 10 — macro manifest is stale
Action:
- prefer workflow-specific newer truth
- update macro manifest only after workflow truth is stable
- never flatten contradiction silently

## Case 11 — after 3 passes the workflow still fails
Action:
- quarantine with exact blockers
- continue queue

## Case 12 — a task needs user judgment but policy already defines a safer default
Action:
- choose safer default, document it, continue
