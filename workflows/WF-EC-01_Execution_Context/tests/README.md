# tests/

## Purpose

Tests and test results for WF-EC-01 Execution Context.

## Contents

- `test_families.py` — family-based tests covering the execution-context behavior.
- `results/results.json` — machine-readable last test-run results.
- `results/results.md` — human-readable last test-run summary.

## Canonicality

- `test_families.py` is the canonical authored test suite for this workflow.
- `results/` is point-in-time output of the latest run; it is not canonical definition of what should pass — the test source is.

## Not source of truth

- Test matrix documentation — no `../docs/WF-EC-01_TEST_MATRIX.md` exists today. Tracked as gap in `../state/STATE__WF-EC-01.json` → `missing`.
