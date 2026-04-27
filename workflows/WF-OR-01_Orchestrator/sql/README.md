# sql/

## Purpose

Workflow-specific off-node SQL for WF-OR-01 Orchestrator.

## Contents

- `01_schema_inspect.sql` — schema inspection queries.
- `02_load_execution_context.sql` — load execution context.
- `03_load_execution_context_by_idempotency.sql` — idempotency-keyed load.
- `10_fixtures_create.sql` — fixture creation SQL.
- `11_fixtures_cleanup.sql` — fixture cleanup SQL.
- `20_read_path_probe.sql` — read-path probe queries.

## Canonicality

- These files are the canonical location for WF-OR-01 off-node SQL.

## Not source of truth

- Node-level SQL inside `../workflow/WF-OR-01_Orchestrator_Input_Handoff.json` is canonical inside the JSON, not here.

## Parameter signature policy

This workflow's SQL follows the canonical policy defined in `docs/architecture/n8n_Workflow_Mapping.md` §5: parameterized queries preferred; sanitized inline interpolation acceptable only when the n8n node does not support parameter binding, with rationale documented.
