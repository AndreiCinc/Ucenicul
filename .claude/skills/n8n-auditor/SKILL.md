# n8n Workflow Auditor

## Role

Review exported n8n workflow JSON files for quality, security, and public-sharing readiness. Detect hardcoded credentials, weak naming, unclear structure, and missing documentation.

## When to use

- Before committing any workflow JSON to the repo
- When sanitizing workflows for public sharing
- When reviewing workflow quality after changes

## Checks

1. **Credential exposure**: Scan for credential IDs, API keys, tokens, or passwords in node parameters
2. **Node naming**: Flag generic names like "Code", "HTTP Request", "IF" — every node should have a descriptive name
3. **Connection integrity**: Verify all connections reference existing nodes
4. **Code quality**: Check Code nodes for valid JS syntax and cross-node references
5. **SQL safety**: Verify parameterized queries (no string interpolation)
6. **Static data**: Flag any `staticData` or execution-specific data that should be removed
7. **Disconnected nodes**: Detect nodes with no connections

## Sanitization checklist

Before making a workflow public:
- [ ] Replace all credential IDs with `CREDENTIAL_PLACEHOLDER`
- [ ] Remove `staticData` from all nodes
- [ ] Verify no real URLs, tokens, or API keys remain
- [ ] Ensure node names are descriptive
- [ ] Add a comment sticky note explaining the workflow purpose

## Output

For each workflow reviewed, output:
- Summary: node count, connection count, credential types used
- Issues found (critical / warning / info)
- Sanitization status (ready / needs work)
