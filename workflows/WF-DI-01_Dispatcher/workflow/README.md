# workflow/

## Purpose

Canonical n8n implementation for WF-DI-01 Dispatcher.

## Contents

- `WF-DI-01_Dispatcher.json` — **canonical** full workflow export. Source of truth for implementation.
- `WF-DI-01_blueprint.json` — **stale / duplicate-full blueprint**. Canonicality bug per standard §5.3. Do NOT treat as canonical. Preserved pending future slim-regeneration or move-to-patches/.

## Canonicality

- `WF-DI-01_Dispatcher.json` is the single source of truth for workflow implementation.

## Not source of truth

- `WF-DI-01_blueprint.json` — duplicate-full; stale.
- Topology prose in `../docs/` is a supporting view only.
- Status (that lives in `../state/STATE__WF-DI-01.json`).

## Known gaps

- Duplicate-full blueprint is a known canonicality bug recorded in `../state/STATE__WF-DI-01.json` → `duplicate_canonical_bugs`.
