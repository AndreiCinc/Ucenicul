# docs/

## Purpose

Authoritative prose, contracts, and topology for WF-EC-01 Execution Context.

## Contents

- `WF-EC-01_CLOSURE_CONTRACT.md` — **canonical contract proxy** for WF-EC-01 (accepted location).
- `WF-EC-01_CLOSURE_PLAN.md` — closure-cycle plan document.
- `WF-EC-01_CONNECTION_MAP.md` — node-to-node connection mapping.
- `WF-EC-01_NODE_MAP.md` — node-by-node map of the workflow.
- `WF-EC-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `WF-EC-01_LIVE_REALITY_CHECK.md` — live reality check log.
- `06_STAGE_WF-EC-01.md` — stage-6 reference material.
- `HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` — historical handoff document (kept for provenance).
- `desktop.ini` — foreign OS metadata; excluded from packaging; delete gated in this run.

## Canonicality

- `WF-EC-01_CLOSURE_CONTRACT.md` is the canonical contract until a file is placed at `docs/contracts/` per the workflow standard. Location accepted in this run.
- Connection/node maps are supporting views; the `connections` block of `../workflow/WF-EC-01_Execution_Context.json` is the authoritative topology.

## Not source of truth

- Implementation (`../workflow/WF-EC-01_Execution_Context.json`).
- Status (`../state/STATE__WF-EC-01.json`).
- Narratives (`../reports/*`).

## Missing (tracked gaps)

- `WF-EC-01_TEST_MATRIX.md` — no formal test matrix on disk; fixtures and `tests/test_families.py` stand in as operational scope.
