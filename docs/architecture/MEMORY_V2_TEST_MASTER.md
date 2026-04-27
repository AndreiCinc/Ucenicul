# MEMORY_V2_TEST_MASTER.md

## Scope
Acest pachet definește testarea pentru `memory_module v2` în două straturi:
1. runtime smoke live prin workflow-ul `WF-ME-01`
2. family-expanded tests prin fixture-uri generate și rulate scriptic

## Obiective
- verifică execuția live a celor 5 acțiuni canonice;
- verifică forma `module_result`;
- verifică efectele în DB;
- separă shape verification / runtime verification / DB verification.

## Structură
- `tests/memory/v2/fixtures/runtime_smoke_cases.json`
- `tests/memory/v2/fixtures/family_cases_seed.json`
- `tests/memory/v2/scripts/generate_family_cases.mjs`
- `tests/memory/v2/scripts/run_runtime_smoke.mjs`
- `tests/memory/v2/scripts/summarize_results.mjs`
- `docs/architecture/memory/v2/tests/TEST_MATRIX_V2.md`

## Reguli
- fiecare test are `case_id`
- fiecare test are `expected_runtime_status`
- fiecare test are `expected_db_effect`
- toate rezultatele se salvează în `tests/memory/v2/results/`

## Runtime families
- F1 = live smoke per action
- F2 = search semantic/lexical fallback
- F3 = family-expanded search/recall
- F4 = promote denial vocabulary
- F5 = supersede lineage and idempotency
