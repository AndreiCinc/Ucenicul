# sql/

## Purpose

Workflow-specific off-node SQL for WF-RA-01 Result Aggregator.

## Contents

- `01_schema_inspect.sql` — schema inspection.
- `02_load_execution_context.sql` — EC load.
- `03_load_execution_context_by_idempotency.sql` — idempotency-keyed EC load.
- `03_load_module_results.sql` — module-results loader (note: shares `03_` prefix with idempotency loader; intentional parallel variant).
- `04_load_plan_context.sql` — plan-context loader.
- `04_read_module_batch_probe.sql` — batch-read probe (shares `04_` prefix with plan-context loader; intentional parallel variant).
- `10_fixtures_create.sql` — fixture creation SQL.
- `11_fixtures_cleanup.sql` — fixture cleanup SQL.
- `20_read_path_probe.sql` — read-path probe.

## Canonicality

- These files are the canonical location for WF-RA-01 off-node SQL.

## Not source of truth

- Node-level SQL inside `../workflow/WF-RA-01_Result_Aggregator_LIVE.json` is canonical inside the JSON, not here.

## Parameter signature policy

Follows `docs/architecture/n8n_Workflow_Mapping.md` §5.
