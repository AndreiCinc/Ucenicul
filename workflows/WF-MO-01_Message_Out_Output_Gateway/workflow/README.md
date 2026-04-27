# workflow/

## Purpose

Canonical n8n implementation for WF-MO-01 Message Out / Output Gateway.

## Contents

- `WF-MO-01_Message_Out.json` — **canonical** full workflow export. Source of truth for implementation.
- `WF-MO-01_blueprint.json` — blueprint. Classification deferred — could be slim (intended per standard §5.3) or duplicate-full. A future wf-sync pass should byte-compare against the canonical JSON.

## Canonicality

- `WF-MO-01_Message_Out.json` is the single source of truth for workflow implementation.

## Not source of truth

- `WF-MO-01_blueprint.json` — supporting (non-canonical until verified slim).
- Topology prose in `../docs/` is a supporting view only.
- Status (that lives in `../state/STATE__WF-MO-01.json`).
