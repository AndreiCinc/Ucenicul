# PACK_V3_TO_V4_UPGRADE_AUDIT

## Why v3 was good but not enough
v3 avea guvernanță bună, dar nu închidea complet autonomia pe run-uri lungi deoarece:
- nu definea clar mission contract per run
- nu avea write boundaries suficient de stricte
- nu avea decision tree exhaustiv pentru cazuri comune
- nu forța un loop complet audit → remediation → re-audit
- nu explica suficient paralelizarea sigură
- nu trata explicit quarantine ca mecanism de continuitate

## What v4 fixes
- adaugă mission contract și queue
- adaugă remediation loop cu maximum passes
- adaugă quarantine și continuation
- adaugă subprocess policy
- adaugă done gates per mode
- întărește regula că nimic nu rămâne parțial fără verdict
