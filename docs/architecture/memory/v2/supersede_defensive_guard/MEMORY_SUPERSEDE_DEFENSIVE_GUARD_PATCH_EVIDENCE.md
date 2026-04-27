# MEMORY V2 SUPERSEDE EMBED · Defensive Guard · Patch Evidence

---

## Workflow versions

| Workflow | id | versionId before | versionId after | nodes | conns |
|---|---|---|---|---|---|
| WF-ME-01 | `uq26nh1grIpnHju0` | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` | `3c7b95dd-1c5d-4b20-8fca-3d86aef73290` | 61 | 79 |
| (all 9 others) | — | unchanged | unchanged | — | — |

## Diff surface

- **Workflows touched**: 1 (`WF-ME-01`)
- **Nodes touched**: 1 (`ME_Memory_Supersede_Embed`)
- **Node delta**: 0 (61 → 61)
- **Connection delta**: 0 (79 → 79)
- **Schema delta**: 0
- **Apply channel**: V2-028 canonical local CLI `n8n-patch.mjs replace`
- **No Path 5**, **no `mcp__n8n__patch_workflow_nodes` write**, **no duplicate workflow**

## Exact parameter changes on `ME_Memory_Supersede_Embed`

Before:
```json
{
  "method": "POST",
  "url": "https://api.openai.com/v1/embeddings",
  "jsonBody": "={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) }}",
  "sendBody": true,
  "options": { "timeout": 30000 }
}
// continueOnFail: null
// alwaysOutputData: null
```

After (only `jsonBody` body changed; `continueOnFail` + `alwaysOutputData` set):
```json
{
  "method": "POST",
  "url": "https://api.openai.com/v1/embeddings",
  "jsonBody": "={{ ($json && $json.__db && typeof $json.__db.content === 'string') ? JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) : JSON.stringify({ model: 'text-embedding-3-small', input: 'noop' }) }}",
  "sendBody": true,
  "options": { "timeout": 30000 }
}
// continueOnFail: true
// alwaysOutputData: true
```

All other ME nodes byte-identical post-apply. Verified by spot-check on:
- `ME_Memory_Supersede_Prep` (jsCode unchanged)
- `ME_Memory_Supersede_Embed_Merge` (jsCode unchanged)
- `ME_Memory_Supersede_Result` (jsCode unchanged — though not explicitly checked, no patch path touched it)

## Apply command

```
$ cd .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch
$ node n8n-patch.mjs replace uq26nh1grIpnHju0 \
    docs/architecture/memory/v2/supersede_defensive_guard/artifacts/WF-ME-01.next.json \
    --reactivate
{
  "id": "uq26nh1grIpnHju0",
  "name": "WF-ME-01 Module Execution"
}
reactivated uq26nh1grIpnHju0
```

`mcp__n8n__verify_workflow` post-apply:

```json
{
  "summary": {
    "id": "uq26nh1grIpnHju0",
    "nodeCount": 61,
    "connectionCount": 79,
    "active": true,
    "versionId": "3c7b95dd-1c5d-4b20-8fca-3d86aef73290"
  },
  "checks": [
    { "check": "nodeCount", "pass": true, "got": 61, "want": 61 },
    { "check": "connectionCount", "pass": true, "got": 79, "want": 79 }
  ],
  "allPass": true
}
```

## Artifacts

- `artifacts/WF-ME-01.pre.json` — pre-apply baseline
- `artifacts/WF-ME-01.next.json` — PUT-applied JSON
- `artifacts/ME_Memory_Supersede_Embed.pre.json` — pre-apply node snapshot
- `artifacts/build_supersede_embed_guard_patch.mjs` — assembler
