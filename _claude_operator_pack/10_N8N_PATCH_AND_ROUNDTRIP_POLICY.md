# 10_N8N_PATCH_AND_ROUNDTRIP_POLICY

## Canonical patch tool — MANDATORY

The **only** accepted channel for mutating live n8n workflows is the CLI script at:

```
/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs
```

Windows path: `C:\Users\andre\OneDrive\Desktop\Ucenicul\.claude\pipelines\ucenicul-pipeline\notes\tools\n8n-patch\n8n-patch.mjs`.

Credentials (`N8N_URL`, `N8N_API_KEY`) live in the sibling `.env`.

### Why this tool only

The MCP n8n patch surface (`mcp__n8n__patch_workflow_nodes`, `mcp__n8n__move_node`, and the SDK-code update route) fails 400 on this n8n instance for two structural reasons:

1. `settings.additionalProperties: false` — GET returns `binaryMode`, `timeSavedMode`, `availableInMCP`, etc., which PUT then rejects. `n8n-patch.mjs` applies a `SETTINGS_WHITELIST` filter on every PUT body.
2. PUT body strictness — the public API accepts exactly `{name, nodes, connections, settings}`. `n8n-patch.mjs`'s `toPutBody()` enforces this; the MCP patch tool does not strip `id`, `active`, `versionId`, `tags`, `meta`, `pinData`, etc., so it fails schema validation.

Reference: n8n-io/n8n#19587.

### Forbidden tools for live mutation

- `mcp__n8n__patch_workflow_nodes` — FORBIDDEN (settings + nodes schema drift).
- `mcp__n8n__move_node` — FORBIDDEN (same PUT path).
- `mcp__f2e8be41-*__update_workflow` — FORBIDDEN unless verified working against this instance; the SDK-code path has not been proven safe here.

Read-only MCP calls (`get_workflow`, `get_workflow_details`, `execute_workflow`, `get_execution`) are still fine.

### Accepted commands

Via `node n8n-patch.mjs`:

- `get <id> [--out <file>]` — capture pre-patch snapshot (also auto-snapshotted into `snapshots/`).
- `replace <id> <file.json> [--reactivate]` — GET + PUT full replacement with whitelist filters applied.
- `patch-node <id> <selector> --set k=v ...` or `--params <file>` — surgical patch of one node's `.parameters`, merge-in.
- `activate <id>` / `deactivate <id>` / `reactivate <id>` — activation as a separate endpoint (never a field).
- `delete <id> --yes` — requires explicit `--yes`.
- `audit [--tail N]` — read the append-only audit log (`.audit.jsonl`).

### Snapshot + rollback guarantee

Every mutating op writes `snapshots/<id>_{before,after}_<timestamp>.json` and appends to `.audit.jsonl`. Rollback is: `n8n-patch replace <id> snapshots/<id>_before_<ts>.json --reactivate`.

---

## Patch gates
Live patch este permis doar dacă:
- canonical repo truth este identificată
- live drift este demonstrat
- patch este local și justificat
- snapshot / rollback path există
- write boundaries permit
- roundtrip verification este posibilă

## Mandatory patch sequence
1. pre-patch audit
2. snapshot / backup capture
3. patch plan
4. patch execution
5. live re-read
6. invariant verification
7. docs/report proportional update

## Mandatory roundtrip invariants
- workflow id/name expected
- node count
- connection count
- triggers
- guard routes
- key config fields
- critical code node behavior shape
- credential references intact

## Patch refusal rule
Dacă oricare gate lipsește, refuzi patch-ul și continui cu audit/docs only.

## Last-resort DB-bypass (2026-04-21 precedent)

Preferred apply channel remains `n8n-patch.mjs patch-node` (canonical CLI): filters `settings` via n8n OpenAPI whitelist (ref n8n-io/n8n#19587), writes `.audit.jsonl` with before/after snapshots, maintains coherent versionId lineage.

If sandbox egress blocks the CLI AND `mcp__n8n__patch_workflow_nodes` fails with the known settings-validator or node-scoped-assignTop bug, a **documented last-resort fallback** exists:

- Direct UPDATE on `public.workflow_entity` via `mcp__postgres__execute_sql`.
- Precedent: F5 close on 2026-04-21. See DIVERGENCE `D-M-014` and decisions `V2-023`, `V2-024` (plus clarifying `V2-026`).

Conditions for using the DB-bypass:
1. Confirm canonical CLI is unreachable (one probe).
2. Confirm `mcp__n8n__patch_workflow_nodes` fails the same two known defects.
3. Preserve all `settings` keys except those n8n's PUT validator rejects. In particular: strip `timeSavedMode` if present; **`availableInMCP` MUST be preserved** (required by the MCP executor to see the workflow).
4. Byte-verify every non-target node pre/post.
5. Run full smoke matrix.
6. Rollback on any anomaly.
7. Write a new DIVERGENCE entry per rollout documenting why the DB-bypass was used.
8. This is not a general precedent — it's a documented exception, not a new default.

Relationship to `V2-025`: V2-025 retires Path 5 as the default channel and pins the operator-run CLI protocol (`docs/architecture/memory/v2/ops/protocol_operator_run_cli.md`) as canonical. This subsection does NOT revive Path 5 as default — it preserves it as a narrow, condition-gated escape hatch so a future session doesn't re-discover the channel under time pressure.
