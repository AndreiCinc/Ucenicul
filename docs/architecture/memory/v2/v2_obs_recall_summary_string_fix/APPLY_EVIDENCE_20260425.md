# V2-OBS-RECALL-SUMMARY-STRING-FIX — APPLY EVIDENCE (2026-04-25)

## Pre-state

- Live `WF-ME-01` (`uq26nh1grIpnHju0`) versionId: `c2273980-fb36-420d-bab9-b9fc3edcb2d9`.
- `nodeCount=49`, `connectionCount=67`, `active=true`.
- `ME_Memory_Recall_Result.parameters.jsCode` sha256: `3dbc8cb329a080b31bcef40c4f17cb9419fdd3b4576bedc7cecdd6763ce24f7a` (1319 bytes).
- Snapshot source: `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/snapshots/uq26nh1grIpnHju0_after_2026-04-24T13-24-24-582Z.json`.

## Apply channel

V2-028 canonical — autonomous agent-run local `n8n-patch` pack from the Cowork sandbox. Command:

```bash
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  patch-node \
  uq26nh1grIpnHju0 \
  ME_Memory_Recall_Result \
  --params docs/architecture/memory/v2/v2_obs_recall_summary_string_fix/artifacts/patch_recall_result_params.json
```

CLI reply: `{ "id": "uq26nh1grIpnHju0", "name": "WF-ME-01 Module Execution", "patched": "ME_Memory_Recall_Result", "keys": ["jsCode"] }`.

Pre/post snapshots captured by the pack:

- `.claude/pipelines/…/snapshots/uq26nh1grIpnHju0_before_2026-04-24T22-06-40-519Z.json`
- `.claude/pipelines/…/snapshots/uq26nh1grIpnHju0_after_2026-04-24T22-06-42-108Z.json`

## Post-state

- versionId `c2273980-fb36-420d-bab9-b9fc3edcb2d9` → `9d1da628-f9fd-44dc-8f62-fda571a7bc23`.
- `nodeCount=49`, `connectionCount=67`, `active=true` — all unchanged.
- `ME_Memory_Recall_Result.parameters.jsCode` sha256: `a7782f0e51b859c9a526aa490bf3d50742126cb28498c4c1245997b12f3c96a7` (1504 bytes).

## Diff-surface verification

- DS-INV-1: `parameters.jsCode` is the only mutated field on `ME_Memory_Recall_Result`. **GREEN.**
- DS-INV-2: nodeCount unchanged (49/49). **GREEN.**
- DS-INV-3: connectionCount unchanged (67/67). **GREEN.**
- DS-INV-4: 48/48 non-target nodes byte-identical pre/post (verified by deep JSON diff on each node dict). **GREEN.**
- DS-INV-5: `active=true` preserved. **GREEN.**
- DS-INV-6: `settings` JSON byte-identical pre/post. **GREEN.**
- DS-INV-7: Filter now predicates on `typeof row.id === 'string'` — mirrors F1 BUG-V2-01 / Patch A fix on `ME_Memory_Search_Result`. **GREEN.**
- DS-INV-8: Post-patch summary emits `0 rows` / `1 row` / `N rows` correctly (verified live at execs 7002 / 7011 / 7020 / 7029). **GREEN.**
- DS-INV-9: `recall_results.length === row_count` — normalised list drives the count (verified live). **GREEN.**
- DS-INV-10: `_error` prep short-circuit branch byte-identical. **GREEN.**
- `connections` JSON byte-identical pre/post. **GREEN.**

## Audit trail

`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.audit.jsonl` appended with the operation.

## Live verification via MCP

`mcp__n8n__verify_workflow` on `uq26nh1grIpnHju0` returned `{nodeCount:49, connectionCount:67, active:true, updatedAt:2026-04-24T22:06:40.781Z, versionId:9d1da628-…}`. The returned jsCode for `ME_Memory_Recall_Result` matches `a7782f0e…` byte-for-byte.
