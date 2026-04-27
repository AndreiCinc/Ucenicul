# sql/

## Purpose

Workflow-specific off-node SQL for WF-MO-01 Message Out / Output Gateway.

## Contents

- `01_schema_inspect.sql` — schema inspection.
- `02_load_execution_context.sql` — EC load.
- `03_load_thread_context.sql` — thread context load.
- `04_load_channel_delivery_context.sql` — channel delivery context load.
- `05_insert_outbound_message_log.sql` — outbound message log insert.
- `06_replay_guard_probe.sql` — replay guard probe.
- `07_create_fallback_delivery_ledger_claude_mcp.sql` — fallback delivery ledger creation (Claude MCP integration).
- `10_fixtures_create.sql` — fixture creation SQL.
- `11_fixtures_cleanup.sql` — fixture cleanup SQL.
- `20_read_path_probe.sql` — read-path probe.

## Canonicality

- These files are the canonical location for WF-MO-01 off-node SQL.

## Not source of truth

- Node-level SQL inside `../workflow/WF-MO-01_Message_Out.json` is canonical inside the JSON, not here.

## Parameter signature policy

Follows `docs/architecture/n8n_Workflow_Mapping.md` §5.
