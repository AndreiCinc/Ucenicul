# workflow/

## Purpose

Canonical n8n implementation for WF-RC-01 Response Composer.

## Contents

- `WF-RC-01_Response_Composer.json` — **canonical** full workflow export.
- `WF-RC-01_blueprint.json` — full duplicate of canonical JSON (candidate canonicality bug per standard §5.3). Treat as `supporting` pending byte-level validation; do NOT treat as canonical.

## Canonicality

- `WF-RC-01_Response_Composer.json` is the single source of truth for workflow implementation.

## Not source of truth

- `WF-RC-01_blueprint.json` — duplicate-full candidate.
- Topology prose in `../docs/` is a supporting view only.
- Status (that lives in `../state/STATE__WF-RC-01.json`).
