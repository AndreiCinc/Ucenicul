# docs/

## Purpose

Prose, contracts, and topology for WF-OR-01 Orchestrator.

## Contents

- `WF-OR-01_CONNECTION_MAP.md` — node-to-node connection mapping.
- `WF-OR-01_NODE_MAP.md` — node-by-node map.
- `WF-OR-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `desktop.ini` — foreign OS metadata; excluded from packaging; delete gated in this run.

## Canonicality

- Connection/node maps are supporting views; the `connections` block of `../workflow/WF-OR-01_Orchestrator_Input_Handoff.json` is the authoritative topology.

## Not source of truth

- Implementation (`../workflow/WF-OR-01_Orchestrator_Input_Handoff.json`).
- Status (`../state/STATE__WF-OR-01.json`).

## Missing (tracked gaps)

- `WF-OR-01_CONTRACTS.md` — no contract file on disk.
- `WF-OR-01_TEST_MATRIX.md` — no formal test matrix on disk.
