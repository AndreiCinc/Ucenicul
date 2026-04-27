# workflow/

## Purpose

Canonical n8n implementation for WF-OR-01 Orchestrator.

## Contents

- `WF-OR-01_Orchestrator_Input_Handoff.json` — **canonical** full workflow export. Source of truth for implementation.
- `WF-OR-01_blueprint.json` — **stale / duplicate-full blueprint** (14 216 B). Classified as canonicality bug per standard §5.3 (blueprint should be a slim metadata summary, not a full JSON duplicate). Do NOT treat as canonical. Preserved in this pass pending a future slim-regeneration or move-to-patches/ pass.

## Canonicality

- `WF-OR-01_Orchestrator_Input_Handoff.json` is the single source of truth for workflow implementation.

## Not source of truth

- `WF-OR-01_blueprint.json` — duplicate-full; stale.
- Topology prose in `../docs/` is a supporting view only.
- Status (that lives in `../state/STATE__WF-OR-01.json`).

## Known gaps

- Duplicate-full blueprint is a known canonicality bug recorded in `../state/STATE__WF-OR-01.json` → `duplicate_canonical_bugs`. A future pass should either (a) regenerate a slim blueprint or (b) move this file to `workflow/patches/<date>_pre_slim_blueprint.json`.
