# AUTONOMY_RISK_REGISTER

## High risk
- live patch fără verify
- shared file collisions
- wrong canonical promotion
- secret leakage in package
- archive mistaken for truth

## Medium risk
- over-documentation on small workflows
- stale manifests not reconciled
- mixed workflow folders

## Control response
Toate sunt acoperite în v4 prin:
- patch gates
- write boundaries
- queue discipline
- quarantine
- explicit package exclusions
