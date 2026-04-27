# docs/

## Purpose

Prose, topology, and test-matrix for WF-ME-01 Module Execution.

## Contents

- `WF-ME-01_CONNECTION_MAP.md` — node-to-node connection mapping.
- `WF-ME-01_NODE_MAP.md` — node-by-node map.
- `WF-ME-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `WF-ME-01_TEST_MATRIX.md` — **canonical test matrix** (only workflow in the repo to ship a test-matrix on disk).
- `00_ROUTE_MAP__WF-ME-01.md` — route map.
- `09_STAGE_WF-ME-01.md` — stage-9 reference.
- `17_STAGE_LOCK__WF-ME-01.md` — stage-lock marker.
- `desktop.ini` — foreign OS metadata; excluded from packaging; delete gated.

## Canonicality

- `WF-ME-01_TEST_MATRIX.md` is canonical for WF-ME-01's test coverage definition.
- Route/connection/node maps are supporting views; the `connections` block of `../workflow/WF-ME-01_Module_Execution.json` is authoritative.

## Not source of truth

- Implementation (`../workflow/WF-ME-01_Module_Execution.json`).
- Status (`../state/STATE__WF-ME-01.json`).

## Missing (tracked gaps)

- `WF-ME-01_CONTRACTS.md` — no contract file on disk.
