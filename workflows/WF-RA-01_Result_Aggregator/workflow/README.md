# workflow/

## Purpose

Canonical n8n implementation for WF-RA-01 Result Aggregator.

## Contents

- `WF-RA-01_Result_Aggregator_LIVE.json` — **canonical** full workflow export. Naming drift note: suffix `_LIVE` is non-standard for the repo; the file is deterministic and canonical, and filename-only refactor is deferred to a future wf-sync pass.
- `drafts/` — working-draft subfolder. See `drafts/README.md`.

## Canonicality

- `WF-RA-01_Result_Aggregator_LIVE.json` is the single source of truth for workflow implementation.

## Not source of truth

- `drafts/WF-RA-01_Result_Aggregator_draft.json` — working draft only.
- Topology prose in `../docs/` is a supporting view only.
- Status (that lives in `../state/STATE__WF-RA-01.json`).
