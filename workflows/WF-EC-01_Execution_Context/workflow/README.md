# workflow/

## Purpose

Canonical n8n implementation for WF-EC-01 Execution Context.

## Contents

- `WF-EC-01_Execution_Context.json` — **canonical** full workflow export. Source of truth for implementation.

## Canonicality

- `WF-EC-01_Execution_Context.json` is the single source of truth for workflow implementation per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §4.B.

## Not source of truth

- Topology prose in `../docs/` (`WF-EC-01_CONNECTION_MAP.md`, `WF-EC-01_NODE_MAP.md`) is a supporting view only; the `connections` block of the canonical JSON is authoritative.
- Status (that lives in `../state/STATE__WF-EC-01.json`).
