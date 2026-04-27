# SYNTHETIC CASESET MANIFEST — {{SCOPE_ID}}

## Scope
- scope_id: {{SCOPE_ID}}
- scope_type: {{SCOPE_TYPE}}
- generation_model: 10_families_x_5_cases

## Families
1. happy path
2. boundary
3. missing optional
4. missing required
5. malformed
6. route divergence
7. duplicate / idempotency
8. persistence
9. contract drift
10. recovery / fallback

## Case files
- {{CASE_FILE_001}}
- {{CASE_FILE_002}}

## Oracle basis
- explicit_contract_count: {{EXPLICIT_ORACLE_COUNT}}
- inferred_oracle_count: {{INFERRED_ORACLE_COUNT}}
- note: inferred oracles must be marked and revisable
