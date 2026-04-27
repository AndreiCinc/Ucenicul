# tests/

## Purpose

Tests and test results for WF-SU-01 State Persistence Updater.

## Contents

- `su/test_families.py` — family-based tests for WF-SU-01 (nested under `su/` subfolder — a naming drift from the repo-wide `tests/test_families.py` pattern but accepted as-is).
- `su/results/results.json` — machine-readable run results.
- `su/results/results.md` — human-readable run summary.

## Canonicality

- `su/test_families.py` is the canonical authored test suite for WF-SU-01.
- Canonical test-coverage definition lives in `../docs/WF-SU-01_TEST_MATRIX.md`.

## Not source of truth

- `../workflow/WF-SU-01_State_Persistence_Updater.json` (implementation).
