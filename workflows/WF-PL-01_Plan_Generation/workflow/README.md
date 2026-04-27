# workflow/

## Purpose

Canonical n8n implementation for WF-PL-01 Plan Generation.

## Contents

- `WF-PL-01_Plan_Generation.json` — **canonical** full workflow export. Source of truth for implementation.
- `WF-PL-01_blueprint.json` — **stale / duplicate-full blueprint**. Canonicality bug per standard §5.3. Do NOT treat as canonical. Preserved in this pass pending a future slim-regeneration or move-to-patches/ pass.

## Canonicality

- `WF-PL-01_Plan_Generation.json` is the single source of truth for workflow implementation.
- Live runtime proof for this canonical implementation is recorded inside legacy `../reports/STATE__WF-PL-01.json` → `live_runtime_proof` (execution_ids 711–714).

## Not source of truth

- `WF-PL-01_blueprint.json` — duplicate-full; stale.
- Topology prose in `../docs/` is a supporting view only.
- Status (that lives in `../state/STATE__WF-PL-01.json`).

## Known gaps

- Duplicate-full blueprint is a known canonicality bug recorded in `../state/STATE__WF-PL-01.json` → `duplicate_canonical_bugs`.
