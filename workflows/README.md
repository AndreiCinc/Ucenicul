# Workflows

Exported n8n workflow JSON files. Each file represents a complete automation pipeline that can be imported into an n8n instance.

## Sanitization requirements

Before committing any workflow to this repo:

1. **Replace credential IDs** — All `credentials` objects must use `CREDENTIAL_PLACEHOLDER` instead of real IDs
2. **Remove static data** — Delete `staticData` fields from all nodes
3. **Remove execution data** — No `executionData`, `lastExecution`, or run-specific fields
4. **Verify no secrets** — Search for patterns: `sk-`, `xoxb-`, API keys, tokens, passwords, real URLs
5. **Descriptive node names** — Every node must have a meaningful name, not defaults like "Code" or "IF"

## Naming convention

```
<purpose>_<version>.json
```

Examples:
- `brain_main_inbound_v3.json`
- `morning_briefing_v1.json`
- `reminder_delivery_v1.json`

## Workflow catalog

| Workflow | Status | Description |
|----------|--------|-------------|
| Brain Main Inbound | Active | Core message processing pipeline (Telegram → Brain → Execute → Respond) |
| Morning Briefing | Planned | Scheduled daily summary of tasks and reminders |
| Reminder Delivery | Planned | Scheduled check and delivery of due reminders |
| GDPR Data Deletion | Planned | On-demand data deletion for right-to-be-forgotten |
| Data Retention Cleanup | Planned | Scheduled removal of expired data |

## `examples/`

Contains a sanitized sample workflow for reference. Use this as a template for how exported workflows should look before committing.
