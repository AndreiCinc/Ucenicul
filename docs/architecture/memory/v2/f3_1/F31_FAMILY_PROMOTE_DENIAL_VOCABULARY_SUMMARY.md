# F3.1 family summary — promote_denial_vocabulary

- target: 25
- executed: 25
- PASS: 24
- FAIL: 1
- BLOCKED: 0
- not yet executed: 0

## Verdicts

| case_id | verdict | bucket | reason |
|---|---|---|---|
| f31-promote-001 | PASS | — | promote oracle all checks pass (den-cm-none corr=none cuc=false cev=false rpuc=false tier=recent replay=false) |
| f31-promote-002 | PASS | — | promote oracle all checks pass (den-cm-one corr=one_only cuc=false cev=false rpuc=false tier=recent replay=false) |
| f31-promote-003 | PASS | — | promote oracle all checks pass (den-cm-already-lt corr=already_long_term cuc=false cev=false rpuc=false tier=long_term replay=false) |
| f31-promote-004 | PASS | — | promote oracle all checks pass (den-cuc-true-but-lt corr=none cuc=true cev=false rpuc=false tier=long_term replay=false) |
| f31-promote-005 | PASS | — | promote oracle all checks pass (den-cev-true-but-lt corr=none cuc=false cev=true rpuc=false tier=long_term replay=false) |
| f31-promote-006 | PASS | — | promote oracle all checks pass (den-row-uc-but-lt corr=none cuc=false cev=false rpuc=true tier=long_term replay=false) |
| f31-promote-007 | PASS | — | promote oracle all checks pass (den-corr2plus-but-lt corr=two_plus cuc=false cev=false rpuc=false tier=long_term replay=false) |
| f31-promote-008 | PASS | — | promote oracle all checks pass (den-all-false-recent corr=none cuc=false cev=false rpuc=false tier=recent replay=false) |
| f31-promote-009 | PASS | — | promote oracle all checks pass (den-cm-one-row-uc-false corr=one_only cuc=false cev=false rpuc=false tier=recent replay=false) |
| f31-promote-010 | PASS | — | promote oracle all checks pass (den-replay-after-deny corr=none cuc=false cev=false rpuc=false tier=recent replay=true) |
| f31-promote-011 | PASS | — | promote oracle all checks pass (acc-cuc-caller-true corr=none cuc=true cev=false rpuc=false tier=recent replay=false) |
| f31-promote-012 | FAIL | BAD_TEST_DEFINITION | V2-014 (row-persisted user_confirmed OR caller) is DEFERRED; runtime correctly denies per current SQL. Matrix expectation premature. (acc-cuc-row-true corr=none cuc=false cev=false rpuc=true tier=recent replay=false) |
| f31-promote-013 | PASS | — | promote oracle all checks pass (acc-cuc-caller-and-row corr=none cuc=true cev=false rpuc=true tier=recent replay=false) |
| f31-promote-014 | PASS | — | promote oracle all checks pass (acc-cev-caller-true corr=none cuc=false cev=true rpuc=false tier=recent replay=false) |
| f31-promote-015 | PASS | — | promote oracle all checks pass (acc-cev-caller-true-uc-ign corr=one_only cuc=false cev=true rpuc=false tier=recent replay=false) |
| f31-promote-016 | PASS | — | promote oracle all checks pass (acc-corr2plus-only corr=two_plus cuc=false cev=false rpuc=false tier=recent replay=false) |
| f31-promote-017 | PASS | — | promote oracle all checks pass (acc-corr2plus-with-uc-false corr=two_plus cuc=false cev=false rpuc=false tier=recent replay=false) |
| f31-promote-018 | PASS | — | promote oracle all checks pass (acc-corr2plus-with-cev-false corr=two_plus cuc=false cev=false rpuc=false tier=recent replay=false) |
| f31-promote-019 | PASS | — | promote oracle all checks pass (acc-multi-cuc-cev corr=none cuc=true cev=true rpuc=false tier=recent replay=false) |
| f31-promote-020 | PASS | — | promote oracle all checks pass (acc-multi-cuc-corr corr=two_plus cuc=true cev=false rpuc=false tier=recent replay=false) |
| f31-promote-021 | PASS | — | promote oracle all checks pass (acc-multi-cev-corr corr=two_plus cuc=false cev=true rpuc=false tier=recent replay=false) |
| f31-promote-022 | PASS | — | promote oracle all checks pass (acc-cuc-then-replay corr=none cuc=true cev=false rpuc=false tier=recent replay=true) |
| f31-promote-023 | PASS | — | promote oracle all checks pass (acc-cev-then-replay corr=none cuc=false cev=true rpuc=false tier=recent replay=true) |
| f31-promote-024 | PASS | — | promote oracle all checks pass (den-empty-evidence-refs corr=none cuc=false cev=false rpuc=false tier=recent replay=false) |
| f31-promote-025 | PASS | — | promote oracle all checks pass (acc-cev-empty-evidence corr=none cuc=false cev=true rpuc=false tier=recent replay=false) |
