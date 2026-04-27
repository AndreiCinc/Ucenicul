# tests/memory/fixtures

This folder holds the TDD fixtures for the new `memory_module`.

## Frozen rule

The fixture set is **250 cases total**:
- 50 for `store_memory`
- 50 for `search_memory`
- 50 for `recall_memory`
- 50 for `promote_memory`
- 50 for `supersede_memory`

Machine-readable source of truth:
- `fixture_manifest.json`

Human summary:
- `TEST_MATRIX_250.md`

## Naming convention

If Claude later expands these into individual fixture files, use:
- `store/store_001.json` ... `store/store_050.json`
- `search/search_001.json` ... `search/search_050.json`
- `recall/recall_001.json` ... `recall/recall_050.json`
- `promote/promote_001.json` ... `promote/promote_050.json`
- `supersede/supersede_001.json` ... `supersede/supersede_050.json`

## Multi-workflow reminder

If implementation splits logic into multiple workflows, fixture execution must also verify the connector nodes between workflows.
