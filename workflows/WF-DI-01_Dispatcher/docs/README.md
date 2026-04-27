# docs/

## Purpose

Prose and topology for WF-DI-01 Dispatcher.

## Contents

- `WF-DI-01_CONNECTION_MAP.md` — node-to-node connection mapping.
- `WF-DI-01_NODE_MAP.md` — node-by-node map.
- `WF-DI-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `00_ROUTE_MAP__WF-DI-01.md` — route map reference.
- `08_STAGE_WF-DI-01.md` — stage-8 reference.
- `17_STAGE_LOCK__WF-DI-01.md` — stage-lock marker.
- `desktop.ini` — foreign OS metadata; excluded from packaging; delete gated.

## Canonicality

- Route/connection/node maps are supporting views; the `connections` block of `../workflow/WF-DI-01_Dispatcher.json` is authoritative.

## Not source of truth

- Implementation (`../workflow/WF-DI-01_Dispatcher.json`).
- Status (`../state/STATE__WF-DI-01.json`).

## Missing (tracked gaps)

- `WF-DI-01_CONTRACTS.md` — no contract file on disk.
- `WF-DI-01_TEST_MATRIX.md` — no formal test matrix on disk.
