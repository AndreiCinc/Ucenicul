# docs/

## Purpose

Prose, topology, and test-matrix for WF-RA-01 Result Aggregator.

## Contents

- `WF-RA-01_CONNECTION_MAP.md` — connection mapping.
- `WF-RA-01_NODE_MAP.md` — node-by-node map.
- `WF-RA-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `WF-RA-01_TEST_MATRIX.md` — canonical test matrix.
- `00_ROUTE_MAP__WF-RA-01_ACTIVATED.md` — route map.
- `10_STAGE_WF-RA-01.md` — stage-10 reference.
- `17_ACTIVE_STAGE_LOCK__WF-RA-01.md` — active stage lock.
- `desktop.ini` — foreign OS metadata; excluded from packaging; delete gated.

## Canonicality

- `WF-RA-01_TEST_MATRIX.md` is canonical for WF-RA-01 test coverage definition.
- Route/connection/node maps are supporting views; the `connections` block of `../workflow/WF-RA-01_Result_Aggregator_LIVE.json` is authoritative.

## Not source of truth

- Implementation (`../workflow/WF-RA-01_Result_Aggregator_LIVE.json`).
- Status (`../state/STATE__WF-RA-01.json`).

## Missing (tracked gaps)

- `WF-RA-01_CONTRACTS.md` — no contract file on disk.
