# tests/

## Purpose

Tests and test results for WF-OR-01 Orchestrator.

## Contents

- `test_families.py` — family-based tests covering orchestrator behavior.
- `results/results.json` — machine-readable last test-run results.
- `results/results.md` — human-readable last test-run summary.

## Canonicality

- `test_families.py` is the canonical authored test suite for this workflow.
- `results/` is point-in-time output of the latest run; not a definition of intended behavior.

## Not source of truth

- Test matrix documentation — no `../docs/WF-OR-01_TEST_MATRIX.md` exists today. Tracked in `../state/STATE__WF-OR-01.json` → `missing`.
