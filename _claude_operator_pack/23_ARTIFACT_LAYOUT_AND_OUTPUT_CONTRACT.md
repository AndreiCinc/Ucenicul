# 23 — ARTIFACT LAYOUT AND OUTPUT CONTRACT

All testing artifacts must be written to predictable locations.
Do not scatter outputs into ad hoc notes.

## Required folder layout

Create or reuse a root such as:

- `tests/generated/workflows/`
- `tests/generated/chains/`
- `tests/generated/contracts/`
- `tests/generated/db/`
- `tests/generated/reports/`
- `tests/generated/snapshots/`
- `tests/generated/state/`

If the repository already has a stronger canonical test folder, use it and record the choice once.

## Required workflow-local artifacts

For each workflow `WF-XX-YY`, produce:
- `tests/generated/contracts/WF-XX-YY_COMPACT_CONTRACT.md`
- `tests/generated/workflows/WF-XX-YY/SYNTHETIC_CASESET_MANIFEST.md`
- `tests/generated/workflows/WF-XX-YY/cases/*.json`
- `tests/generated/workflows/WF-XX-YY/WORKFLOW_TEST_RUN_RECORD.md`
- `tests/generated/workflows/WF-XX-YY/TEST_REPAIR_LOG.md` when needed
- `tests/generated/db/WF-XX-YY_DB_ASSERTIONS.md` when needed

## Required edge artifacts

For each canonical edge `WF-AA-BB__TO__WF-CC-DD`, produce:
- `tests/generated/chains/WF-AA-BB__TO__WF-CC-DD/CHAIN_MAPPING.md`
- `tests/generated/chains/WF-AA-BB__TO__WF-CC-DD/SYNTHETIC_CASESET_MANIFEST.md`
- `tests/generated/chains/WF-AA-BB__TO__WF-CC-DD/cases/*.json`
- `tests/generated/chains/WF-AA-BB__TO__WF-CC-DD/CHAIN_E2E_RUN_RECORD.md`
- `tests/generated/chains/WF-AA-BB__TO__WF-CC-DD/CONNECTOR_PATCH_RECORD.md` when patched
- `tests/generated/chains/WF-AA-BB__TO__WF-CC-DD/TEST_REPAIR_LOG.md` when needed
- `tests/generated/db/WF-AA-BB__TO__WF-CC-DD_DB_ASSERTIONS.md` when needed

## Required global artifacts

Produce these mission-level files:
- `tests/generated/reports/WORKFLOW_INVENTORY.md`
- `tests/generated/reports/CANONICAL_CHAIN_MAP.md`
- `tests/generated/reports/FINAL_TEST_AND_E2E_SUMMARY.md`
- `tests/generated/state/MISSION_STATE_LEDGER.json`

## Minimum content rule

Each artifact must include:
- scope id,
- evidence sources,
- last updated timestamp or run marker,
- pass/fail status where applicable,
- exact referenced file/workflow ids,
- cleanup state if runtime touched DB.

## Path discipline rule

If the operator must use a different folder tree because the repo already contains a stronger canonical structure:
1. choose it once,
2. document the chosen root,
3. keep all artifacts under that root.
