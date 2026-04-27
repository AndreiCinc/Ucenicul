# F6A Apply Command

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Channel: **autonomous agent-run local `n8n-patch` pack** (V2-028 canonical, 2026-04-23; supersedes V2-025 operator-run CLI on apply-ownership). Protocol doc: `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md`.
Target workflow: `WF-ME-01 Module Execution` (id `uq26nh1grIpnHju0`).

The **agent** runs the apply command itself via `Bash` from the Cowork sandbox, using the pack's local `.env` at `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env` as the credential source. Credential values are never read into chat or committed to any doc. Before running, the agent emits a one-sentence plain-language preamble and waits for user approval (per the approval-gated command-preamble feedback).

---

## Inputs (must exist before the operator runs anything)

| File | Role | Expected sha256 |
|---|---|---|
| `docs/architecture/memory/v2/f6a/artifacts/WF-ME-01_pre_f6a.json` | canonical pre-apply snapshot; used for rollback if needed | `71a8c903584a1f0fac170a8ebce8daf1227f7a62c4f2ce0e47f2536216107c57` |
| `docs/architecture/memory/v2/f6a/artifacts/WF-ME-01_post_f6a.json` | full-workflow payload uploaded by `replace` | `8e775d5a5a982cd5b069b604a877dc52498f4e5224f0218d71eebab33c67624f` |

If either sha256 does not match, **halt**. Re-run the builder before proceeding:

```
node docs/architecture/memory/v2/f6a/artifacts/build_patch_f6a.mjs
```

The builder is deterministic — the same pre snapshot yields byte-identical outputs. If the post sha256 drifted, the pre snapshot was replaced with a different live state. Investigate before continuing.

---

## Pre-apply version assertion (must be run first, read-only)

The n8n-patch CLI does not expose a `--expect-version` flag, so the agent asserts the baseline version out-of-band via the read-only MCP call (`mcp__n8n__verify_workflow`). Expected baseline:

| Field | Expected |
|---|---|
| `versionId` | `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6` |
| `active` | `true` |
| `name` | `WF-ME-01 Module Execution` |
| `nodeCount` | `45` |
| `connectionCount` | `63` |

If any value differs, **halt**. Re-dump, diff against `WF-ME-01_pre_f6a.json`, and reconcile with the user before running the apply. The baseline must still be the same snapshot the post payload was built against — otherwise the `replace` call would overwrite unrelated changes.

---

## Apply command (single command block — agent runs exactly this)

```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace \
  uq26nh1grIpnHju0 \
  docs/architecture/memory/v2/f6a/artifacts/WF-ME-01_post_f6a.json
```

Notes:
- No `--reactivate` flag is passed. `WF-ME-01` has no webhook triggers (it is entered via chat and `executeWorkflowTrigger`), matching the F2 precedent in `v2/f2/patch_plan_f2.md §Rollout`.
- The tool's internal safety guarantees apply: `GET → mutate → PUT`, body filtered to `{name, nodes, connections, settings}`, audit appended to `.audit.jsonl`.
- The CLI will snapshot the live workflow to its own `snapshots/` directory before PUT. That snapshot is independent of `WF-ME-01_pre_f6a.json`; both are retained.

Expected outcome after a successful run:
- CLI exits zero.
- Live `versionId` changes (differs from `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`).
- Live `nodeCount` becomes `47`, live `connectionCount` becomes `65`.
- `active` remains `true`.

---

## Post-apply verification (agent-owned, runs immediately after CLI returns zero)

1. Read-only MCP `get_workflow uq26nh1grIpnHju0` — record the new versionId, nodes, connections.
2. Read-only MCP `verify_workflow` with asserted `nodeCount=47`, `connectionCount=65`, and `nodeFields` spot-checks:
   - `ME_Memory_Store_Embed.parameters.url === 'https://api.openai.com/v1/embeddings'`
   - `ME_Memory_Store_Embed.parameters.nodeCredentialType === 'openAiApi'`
   - `ME_Memory_Store_Embed_Merge.type === 'n8n-nodes-base.code'`
   - `ME_Memory_Store_DB.parameters.query` contains `idempotency_key, embedding` in the column list.
3. Diff-surface invariants (all 10 from `F6A_DESIGN_FREEZE.md §Diff surface invariants`) re-checked with evidence lines.
4. Record all evidence in `F6A_APPLY_EVIDENCE_20260423.md §Post-state`.

---

## Rollback (only if Phase 6 verification fails)

Agent re-runs `replace` through the same local pack with the pre snapshot:

```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace \
  uq26nh1grIpnHju0 \
  docs/architecture/memory/v2/f6a/artifacts/WF-ME-01_pre_f6a.json
```

After rollback:
- Agent captures the rollback versionId and confirms `nodeCount=45`, `connectionCount=63`.
- Agent opens an incident entry in `F6A_FIX_LOG.md` and flips mission status to `BLOCKED`.
- Closeout goes through `F6A BLOCKED_WITH_EVIDENCE`.

---

## Forbidden alternatives

- Do **not** use `mcp__n8n__patch_workflow_nodes` (blocked for `WF-ME-01` per sub-B).
- Do **not** use Path 5 as a default (retired per V2-025; only V2-026's 8-condition escape hatch survives, and F6A does not invoke it).
- Do **not** use the superseded operator-run CLI protocol (V2-025 / `protocol_operator_run_cli.md`) — apply-ownership belongs to the agent under V2-028.
- Do **not** use the CLI `patch-node` sub-command — F6A introduces new nodes and new edges; only `replace` can carry that shape.
