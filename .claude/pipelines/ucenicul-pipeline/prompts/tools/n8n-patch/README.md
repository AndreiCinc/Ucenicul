# n8n-patch

Safe n8n workflow CRUD helper. Single-file Node.js CLI, zero dependencies.

Built to fix the recurring pain of patching n8n workflows from Claude Code / MCP / scripts: **n8n's PATCH endpoint is broken for many fields, the OpenAPI schema rejects extra `settings` keys that GET returns, and activation is a separate endpoint not a field.** This tool encodes all those rules so you can stop re-discovering them.

---

## Why this exists

n8n's REST API has several traps when you try to update workflows programmatically:

1. **PATCH silently drops fields.** Don't use it. Use PUT (full replacement).
2. **`settings.additionalProperties: false`.** GET returns extra keys (`binaryMode`, `timeSavedMode`, …) that PUT then rejects. You must filter to a whitelist. (See [n8n-io/n8n#19587](https://github.com/n8n-io/n8n/issues/19587).)
3. **PUT body must contain exactly `{name, nodes, connections, settings}`.** Sending `id`, `active`, `createdAt`, `versionId`, `tags`, `meta`, `pinData` triggers `400 Bad Request`.
4. **Activation is not a field.** Use `POST /workflows/:id/activate` and `/deactivate`, separately.
5. **Webhook workflows often don't re-register after activate.** Fix: deactivate → sleep ~1s → activate.
6. **Credentials cannot be re-associated via PUT.** If first imported with placeholder creds, you must DELETE + POST.
7. **`specifyInputSchema` is silently ignored on POST.** Use the two-workflow `toolWorkflow` pattern instead.

This script handles points 1–5 automatically. Points 6 and 7 you handle at the workflow-design level.

---

## Setup

```bash
cd tools/n8n-patch
cp .env.example .env
# edit .env with your N8N_URL + N8N_API_KEY

# (optional) make it convenient
chmod +x n8n-patch.mjs
ln -s "$(pwd)/n8n-patch.mjs" /usr/local/bin/n8n-patch
```

Requires **Node 18+** (uses built-in `fetch`).

---

## Commands

```text
list [--active|--inactive] [--limit N]    list workflows
search <pattern>                          substring or /regex/ on names
get <id> [--out <file>]                   fetch raw workflow JSON
import <file.json> [--activate]           POST new workflow
replace <id> <file.json> [--reactivate]   GET + PUT full replacement
patch-node <id> <node-name-or-id>         surgical patch on one node's .parameters
    --params <file.json>
    --set key=value [--set k=v ...]
    [--reactivate]
activate <id>
deactivate <id>
reactivate <id>                           deactivate → sleep → activate
delete <id> --yes                         DELETE (requires --yes)
audit [--tail N]                          show audit log
help
```

---

## Common recipes

### Backup before editing

```bash
n8n-patch get 5RcNLtxNjAHJsZPE --out ./backup.json
```

### Edit and re-upload (full replace)

```bash
n8n-patch get abc123 --out edit.json
$EDITOR edit.json
n8n-patch replace abc123 edit.json --reactivate
```

The `--reactivate` is useful for any workflow that has a Telegram, webhook, form, or MCP trigger — it forces n8n to re-register the trigger path.

### Surgical edit of one node (no full file dance)

```bash
# Change a code node's jsCode
n8n-patch patch-node abc123 "Build System Prompt" \
    --set 'jsCode=return [{json: {ok: true}}]'

# Change a postgres query
n8n-patch patch-node abc123 "Load Soul" \
    --set 'query=SELECT key, content FROM soul WHERE tenant_id = $1'

# Bulk param change from a file
echo '{"path": "/webhook/v2", "responseMode": "lastNode"}' > p.json
n8n-patch patch-node abc123 "Webhook" --params p.json --reactivate
```

`--set` values are parsed as JSON when possible (so `--set foo=42` becomes a number, `--set foo=true` becomes a boolean, `--set foo='[1,2,3]'` becomes an array). If parsing fails it stays a string.

### Import a new workflow from disk

```bash
n8n-patch import ./workflows/WF-DI-01_Dispatcher.json --activate
# returns {"id": "...", "name": "..."}
```

### Find the Plan Builder by name

```bash
n8n-patch search "Plan Builder"
n8n-patch search "/^WF-PL/"     # regex form
```

### See history of changes

```bash
n8n-patch audit --tail 20
```

Each mutating op also writes a snapshot to `snapshots/<id>_before|after_<timestamp>.json` so you can diff or restore.

---

## Calling from Claude Code / Claude Agent SDK

The killer use case. Three patterns:

### 1. Plain Bash from a chat (Claude Code CLI)

```text
You: rename the "Load Soul" node in workflow abc123 to "Load Soul Tenant-Scoped"

Claude (uses Bash):
  n8n-patch patch-node abc123 "Load Soul" --set name="Load Soul Tenant-Scoped"
```

### 2. As an MCP-replacement subroutine in Ucenicul

In `WF-N8N-PATCH-01` (the patch helper stage I recommended), call this script via an `Execute Command` node. Input contract:

```json
{
  "operation": "patch-node",
  "workflow_id": "abc123",
  "selector": "Load Soul",
  "patch": {"query": "SELECT ... WHERE tenant_id = $1"},
  "reactivate": true
}
```

Map to: `n8n-patch patch-node abc123 "Load Soul" --params /tmp/patch.json --reactivate`.

### 3. CI / automated migrations

```bash
# Update all workflows that have a "Load Soul" node to add tenant scoping
for id in $(n8n-patch list | grep -v "^$" | awk '{print $1}'); do
  if n8n-patch get "$id" | jq -e '.nodes[] | select(.name == "Load Soul")' > /dev/null; then
    n8n-patch patch-node "$id" "Load Soul" \
      --set 'query=SELECT key, content FROM soul WHERE tenant_id = $1'
  fi
done
```

---

## Safety guarantees encoded in the script

| Trap | How it's handled |
|------|------------------|
| PATCH silently drops fields | Never used. All updates go through PUT. |
| `settings: additionalProperties: false` | `SETTINGS_WHITELIST` filter applied to every PUT body. |
| PUT body shape strict | `toPutBody()` returns exactly `{name, nodes, connections, settings}`. |
| Activation as field | Separate `activate` / `deactivate` / `reactivate` commands. |
| Webhook trigger re-registration | `reactivate` does deactivate → sleep 1.2s → activate. Auto-detected on `import --activate`. |
| Lost work | Every mutating op writes `snapshots/<id>_{before,after}_<ts>.json` and appends to `.audit.jsonl`. |
| Ambiguous selectors | `patch-node` errors if 0 or >1 nodes match. |

---

## What this tool does NOT do (intentionally)

- **Credential creation/management.** That's a separate API surface. Use n8n UI or the credentials API directly.
- **Two-workflow `toolWorkflow` builder.** That's a workflow-design pattern, not a CRUD concern. Build it in your factory workflow (see `mcp-builder.json` in n8n-claw for reference).
- **MCP tool installation.** Out of scope; this is just the n8n REST layer.
- **Validation of node connections / DAG correctness.** It will happily PUT a broken workflow. Validate before PUT.
- **Diffing.** Use `diff snapshots/<id>_before_*.json snapshots/<id>_after_*.json` (or `jq` if you want structural diff).

---

## Exit codes

- `0` — success
- `1` — user/usage error
- `2` — n8n API error (status + body printed to stderr)

---

## File layout

```
tools/n8n-patch/
├── n8n-patch.mjs        # the CLI (single file, ~500 lines)
├── README.md            # this file
├── .env.example         # config template
├── .env                 # your config (gitignored)
├── .audit.jsonl         # append-only audit log (auto-created)
└── snapshots/           # before/after JSON dumps (auto-created)
```
