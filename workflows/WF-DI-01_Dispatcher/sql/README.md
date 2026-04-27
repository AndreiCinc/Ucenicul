# sql/

## Purpose

Workflow-specific off-node SQL for WF-DI-01 Dispatcher.

## Contents

- `01_schema_inspect.sql` — schema inspection queries.
- `02_load_execution_context.sql` — load execution context.
- `03_load_plan_by_execution_context.sql` — plan loader.
- `04_load_module_registry.sql` — module registry loader.
- `10_fixtures_create.sql` — fixture creation SQL.
- `11_fixtures_cleanup.sql` — fixture cleanup SQL.
- `20_read_path_probe.sql` — read-path probe queries.

## Canonicality

- These files are the canonical location for WF-DI-01 off-node SQL.

## Not source of truth

- Node-level SQL inside `../workflow/WF-DI-01_Dispatcher.json` is canonical inside the JSON, not here.

## Parameter signature policy

This workflow's SQL follows the canonical policy defined in `docs/architecture/n8n_Workflow_Mapping.md` §5: parameterized queries preferred; sanitized inline interpolation acceptable only when the n8n node does not support parameter binding, with rationale documented.
