# n8n workflow patch readiness report

**Workflow ID:** TClXgmO8H8zsSwMb
**Workflow name:** WF-RC-01 (patched)

## Blocker

- The live `mcp__n8n__patch_workflow_nodes` wrapper does not filter invalid `settings` fields before PUT.
- Workflow 'settings' contains fields rejected by n8n OpenAPI: binaryMode, timeSavedMode.
- This makes a cosmetic edit fail with HTTP 400 unless the payload is filtered.
- Local `n8n-patch` CLI does filter these fields, but direct egress to the live n8n host is blocked from this sandbox.

## Prepared artifacts

- Backup of current local workflow JSON: backup-workflow-TClXgmO8H8zsSwMb-2026-04-18T09-37-19-059Z.json
- Filtered PUT-ready body: TClXgmO8H8zsSwMb-put-ready.json

## Notes on credentials

- Current workflow includes an OpenAI credential reference in the node `OpenAI Chat Model`.
- There is no Postgres node in this workflow file, so no Postgres credential binding was inserted.
- Credential association is a separate n8n surface; updating credentials via PUT is not reliably supported if the binding changes.

## Next step

Use the prepared `TClXgmO8H8zsSwMb-put-ready.json` in an environment with network access to the n8n host, or through a dedicated MCP wrapper that filters settings before PUT.