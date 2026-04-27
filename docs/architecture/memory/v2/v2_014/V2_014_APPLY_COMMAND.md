# V2-014 Apply Command (operator-run CLI)

Channel: operator-run CLI (V2-025 canonical). Single-node patch-node. No other channel is authorized for this mission.

## Pre-state (frozen)

- Workflow id: `uq26nh1grIpnHju0`
- Workflow name: `WF-ME-01 Module Execution`
- Target node: `ME_Memory_Promote_DB` (id `me-phase5mem-promote-db`)
- Pre versionId: `b8e2f194-0263-46d9-8306-1534cc7c31fe`
- Patch surface: `parameters.query` only
- Payload SHA-256: `cf0c7ace937139a1d28c5d85e79bafcac14176af7d35eed58c0e4bfd1597367d`
- Pre-apply `mcp__n8n__verify_workflow` result: all 3 assertions PASS (nodeCount 45, connectionCount 63, parameters.query matches baseline verbatim).
- Pre-state snapshot: `artifacts/runtime/get_workflow_pre.json`.

## Operator command block

Run from the repo root on the operator laptop that has n8n API credentials available to `n8n-patch.mjs`:

```bash
# Frontier: V2-014
# Expected pre-state versionId: b8e2f194-0263-46d9-8306-1534cc7c31fe
# Expected post-state node changed: ME_Memory_Promote_DB
# Expected diff surface: parameters.query (single field)

node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  patch-node \
  uq26nh1grIpnHju0 \
  ME_Memory_Promote_DB \
  --params docs/architecture/memory/v2/v2_014/artifacts/patchV2_014_params.json
```

## What the operator sees after apply (expected)

- `n8n-patch.mjs` emits a before/after diff for `ME_Memory_Promote_DB.parameters.query`.
- The diff matches the unified-diff hint printed by `build_patch_v2_014.mjs` (5-disjunct new `ok` expression replacing the 3-disjunct baseline).
- Workflow remains active; versionId advances.

## After apply — send back to agent

Operator should paste or attach to the session:
1. The n8n-patch stdout (copy into `artifacts/runtime/operator_apply_stdout.txt`).
2. A single "apply complete" signal so the agent can advance to Phase 7.

## Do NOT do any of the following

- Do NOT edit any other node or field.
- Do NOT change `options.queryReplacement`.
- Do NOT run Path 5 (direct UPDATE on `workflow_entity`). Retired per V2-025; V2-026 allows only under the 8-condition gate which is not met here.
- Do NOT hand-edit `patchV2_014_params.json`. Regenerate only via `build_patch_v2_014.mjs` if the design changes.

## Fallback / blocker path

If the CLI cannot be executed (auth failure, network block, n8n API outage):
1. Capture stderr to `artifacts/runtime/operator_apply_stderr.txt`.
2. Agent opens `V2-014-BLOCKER-001` with category `APPLY_CHANNEL_BLOCKER` and dispatch entry.
3. Mission closes with verdict `BLOCKED_WITH_EVIDENCE`. No silent fallback.
