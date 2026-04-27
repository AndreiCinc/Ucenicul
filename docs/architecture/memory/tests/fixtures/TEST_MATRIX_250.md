# TEST_MATRIX_250.md

This file summarizes the 250 planned tests (50 per action) for `memory_module`.

## store_memory — 50 cases

| Range | Family | Expected status |
|---|---|---|
| STO-001..STO-005 | happy_minimal | success |
| STO-006..STO-010 | happy_rich | success |
| STO-011..STO-015 | idempotency_replay | success |
| STO-016..STO-020 | subjective_refusal | success |
| STO-021..STO-025 | validation_failure | success |
| STO-026..STO-030 | search_seed | success |
| STO-031..STO-035 | status_override | success |
| STO-036..STO-040 | durability_defaults | mixed (success..failed) |
| STO-041..STO-045 | thread_required | failed |
| STO-046..STO-050 | embedding_path | success |

## search_memory — 50 cases

| Range | Family | Expected status |
|---|---|---|
| SEA-001..SEA-005 | happy_semantic | success |
| SEA-006..SEA-010 | status_default_active | success |
| SEA-011..SEA-015 | status_override | success |
| SEA-016..SEA-020 | filter_intersection | success |
| SEA-021..SEA-025 | empty_result | success |
| SEA-026..SEA-030 | limit_behavior | success |
| SEA-031..SEA-035 | invalid_input | success |
| SEA-036..SEA-040 | ranking_stability | success |
| SEA-041..SEA-045 | cross_thread_guard | partial |
| SEA-046..SEA-050 | cross_status_guard | success |

## recall_memory — 50 cases

| Range | Family | Expected status |
|---|---|---|
| REC-001..REC-005 | happy_entity | success |
| REC-006..REC-010 | happy_thread | success |
| REC-011..REC-015 | happy_category | success |
| REC-016..REC-020 | happy_type | success |
| REC-021..REC-025 | strict_intersection | success |
| REC-026..REC-030 | ordering_desc | success |
| REC-031..REC-035 | empty_result | success |
| REC-036..REC-040 | invalid_input | success |
| REC-041..REC-045 | status_scope | partial |
| REC-046..REC-050 | mixed_filter_guard | success |

## promote_memory — 50 cases

| Range | Family | Expected status |
|---|---|---|
| PRO-001..PRO-005 | happy_corroboration | success |
| PRO-006..PRO-010 | happy_user_confirmed | success |
| PRO-011..PRO-015 | happy_evidence_validated | success |
| PRO-016..PRO-020 | promotion_denied | success |
| PRO-021..PRO-025 | invalid_target | success |
| PRO-026..PRO-030 | already_long_term | partial |
| PRO-031..PRO-035 | status_guard | partial |
| PRO-036..PRO-040 | evidence_merge | partial |
| PRO-041..PRO-045 | counter_update | failed |
| PRO-046..PRO-050 | missing_memory | success |

## supersede_memory — 50 cases

| Range | Family | Expected status |
|---|---|---|
| SUP-001..SUP-005 | happy_basic | success |
| SUP-006..SUP-010 | happy_with_evidence | success |
| SUP-011..SUP-015 | invalid_old_missing | success |
| SUP-016..SUP-020 | invalid_old_superseded | success |
| SUP-021..SUP-025 | transactional_integrity | success |
| SUP-026..SUP-030 | idempotency_replay | success |
| SUP-031..SUP-035 | store_contract_reuse | success |
| SUP-036..SUP-040 | subjective_guard | failed |
| SUP-041..SUP-045 | linkage_integrity | mixed (failed..success) |
| SUP-046..SUP-050 | status_scope | success |
