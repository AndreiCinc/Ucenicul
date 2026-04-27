# 08_WORKFLOW_STANDARD_AND_TIERS

## Tiers
- `SMALL`
- `STANDARD`
- `CRITICAL`

## SMALL required
- root `README.md`
- `workflow/README.md`
- canonical workflow JSON
- `docs/README.md`
- `CONTRACTS`
- `TEST_MATRIX`
- `state/README.md` if state folder exists
- `STATE__<WF>.json` if state exists

## STANDARD required
- everything from SMALL
- import/patch plan if patchable
- reports README
- closure report

## CRITICAL required
- everything from STANDARD
- blueprint
- node map if justified
- connection map if justified
- audit report
- build report
- verifier delivery or equivalent
- live execution proof if available
- patch folder README if patches exist

## Anti-bureaucracy rule
Nu crea artefacte enterprise doar ca să bifezi listă.
Fiecare fișier trebuie să servească un scop clar.
