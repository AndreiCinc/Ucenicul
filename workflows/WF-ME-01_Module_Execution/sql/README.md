# sql/

## Purpose

Workflow-specific off-node SQL for WF-ME-01 Module Execution.

## Contents

- `01_schema_inspect.sql` — schema inspection.
- `02_load_execution_context.sql` — EC load.
- `03_load_dispatch_request.sql` — dispatch-request load.
- `04_load_task_candidates.sql` — task candidates loader.
- `05_insert_task.sql` — task insert.
- `06_update_task.sql` — task update.
- `07_complete_task.sql` — task completion.
- `08_delete_task.sql` — task delete.
- `10_fixtures_create.sql` — fixture creation SQL.
- `11_fixtures_cleanup.sql` — fixture cleanup SQL.
- `20_read_path_probe.sql` — read-path probe.
- `21_write_path_probe.sql` — write-path probe.

## Canonicality

- These files are the canonical location for WF-ME-01 off-node SQL.

## Not source of truth

- Node-level SQL inside `../workflow/WF-ME-01_Module_Execution.json` is canonical inside the JSON, not here.

## Parameter signature policy

Follows `docs/architecture/n8n_Workflow_Mapping.md` §5.
