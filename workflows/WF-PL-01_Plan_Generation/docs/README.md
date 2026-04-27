# docs/

## Purpose

Prose and topology for WF-PL-01 Plan Generation.

## Contents

- `WF-PL-01_CONNECTION_MAP.md` — node-to-node connection mapping.
- `WF-PL-01_NODE_MAP.md` — node-by-node map.
- `WF-PL-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `07_STAGE_WF-PL-01.md` — stage-7 reference.
- `desktop.ini` — foreign OS metadata; excluded from packaging; delete gated.

## Canonicality

- Connection/node maps are supporting views; the `connections` block of `../workflow/WF-PL-01_Plan_Generation.json` is authoritative.

## Not source of truth

- Implementation (`../workflow/WF-PL-01_Plan_Generation.json`).
- Status (`../state/STATE__WF-PL-01.json`).

## Missing (tracked gaps)

- `WF-PL-01_CONTRACTS.md` — no contract file on disk.
- `WF-PL-01_TEST_MATRIX.md` — no formal test matrix on disk.
