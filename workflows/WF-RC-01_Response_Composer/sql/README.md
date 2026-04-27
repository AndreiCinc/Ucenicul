# sql/

## Purpose

Workflow-specific off-node SQL for WF-RC-01 Response Composer.

## Contents

- `01_schema_inspect.sql` — schema inspection.
- `02_load_execution_context.sql` — EC load.
- `03_load_thread_context.sql` — thread context load.
- `04_load_response_inputs.sql` — response-inputs load.
- `10_fixtures_create.sql` — fixture creation SQL.
- `11_fixtures_cleanup.sql` — fixture cleanup SQL.
- `20_read_path_probe.sql` — read-path probe.

## Canonicality

- These files are the canonical location for WF-RC-01 off-node SQL.

## Not source of truth

- Node-level SQL inside `../workflow/WF-RC-01_Response_Composer.json` is canonical inside the JSON, not here.

## Parameter signature policy

Follows `docs/architecture/n8n_Workflow_Mapping.md` §5.
