# sql/

## Purpose

Workflow-specific off-node SQL for WF-EC-01 Execution Context.

## Contents

- `01_schema_inspect.sql` — schema inspection queries.
- `02_upsert.sql` — upsert statements for execution-context rows.
- `03_load_existing.sql` — loader for existing rows.
- `10_fixtures_create.sql` — fixture creation SQL.
- `11_fixtures_cleanup.sql` — fixture cleanup SQL.
- `20_behavior_probe.sql` — behavior probe queries.

## Canonicality

- These files are the canonical location for WF-EC-01 off-node SQL.

## Not source of truth

- Node-level SQL used inside the workflow JSON is canonical inside the JSON, not here. This folder holds only off-node SQL.

## Parameter signature policy

This workflow's SQL follows the canonical policy defined in `docs/architecture/n8n_Workflow_Mapping.md` §5: parameterized queries preferred; sanitized inline interpolation acceptable only when the n8n node does not support parameter binding, with rationale documented.
