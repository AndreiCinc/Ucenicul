# 11_DB_AND_CONTRACT_POLICY

## When DB is in scope
Verifică:
- reads vs writes
- query semantics
- side effects
- idempotency assumptions
- contract implications
- migration or patch notes if behavior changed

## Contract update rule
Actualizezi contracts și test matrix doar dacă:
- input/output behavior changed
- errors changed
- DB side effects changed
- routing/public behavior changed

Micro-fixuri interne nu rescriu contractele.
