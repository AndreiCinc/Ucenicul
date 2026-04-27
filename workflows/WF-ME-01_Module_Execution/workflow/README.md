# workflow/

## Purpose

Canonical n8n implementation for WF-ME-01 Module Execution.

## Contents

- `WF-ME-01_Module_Execution.json` — **canonical** full workflow export. 30 066 bytes. SHA256 `0a7b95fdc020cd1aa9f978f39a2448ac13e79e74794cb75907bfd9f95abfee44`. `versionId: wf-me-01-source-pack-v1.3-cross-tenant-guard`.
- `WF-ME-01_blueprint.json` — **supporting blueprint** (10 134 B). ~1/3 the size of canonical — probably the intended slim metadata summary per standard §5.3; treat as `supporting`, not canonical. A future wf-sync pass should verify the shape.

## Canonicality

- `WF-ME-01_Module_Execution.json` is the single source of truth for workflow implementation.

## Not source of truth

- `WF-ME-01_blueprint.json` — supporting (non-canonical).
- Topology prose in `../docs/` is a supporting view only.
- Status (that lives in `../state/STATE__WF-ME-01.json`).
