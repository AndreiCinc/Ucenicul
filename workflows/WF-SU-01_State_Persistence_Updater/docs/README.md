# docs/

## Purpose

Prose, topology, and test-matrix for WF-SU-01 State Persistence Updater.

## Contents

- `WF-SU-01_CONNECTION_MAP.md` — connection mapping.
- `WF-SU-01_NODE_MAP.md` — node-by-node map.
- `WF-SU-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `WF-SU-01_TEST_MATRIX.md` — canonical test matrix.
- `desktop.ini` — foreign OS metadata; excluded from packaging; delete gated.

## Canonicality

- `WF-SU-01_TEST_MATRIX.md` is canonical for WF-SU-01 test coverage definition.
- Connection/node maps are supporting views; the `connections` block of `../workflow/WF-SU-01_State_Persistence_Updater.json` is authoritative.

## Not source of truth

- Implementation (`../workflow/WF-SU-01_State_Persistence_Updater.json`).
- Status (`../state/STATE__WF-SU-01.json`).

## Missing (tracked gaps)

- `WF-SU-01_CONTRACTS.md` — no contract file on disk.
