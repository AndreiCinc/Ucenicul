# V2-OBS-RECALL-SUMMARY-STRING-FIX — APPLY COMMAND

V2-028 canonical channel. Agent runs the local `n8n-patch` pack from the Cowork sandbox. One `patch-node` invocation; one field changed.

## Command

```bash
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  patch-node \
  uq26nh1grIpnHju0 \
  ME_Memory_Recall_Result \
  --params docs/architecture/memory/v2/v2_obs_recall_summary_string_fix/artifacts/patch_recall_result_params.json
```

## Preamble (plain language)

This command tells the local `n8n-patch` CLI to update exactly one field — `parameters.jsCode` on node `ME_Memory_Recall_Result` in workflow `uq26nh1grIpnHju0` (`WF-ME-01`) — to the sha256-pinned payload produced in `artifacts/recall_result_jscode_post.js`. Everything else on that node and every other node remain byte-identical. The CLI uses GET → mutate → PUT internally with the n8n settings whitelist filter; the agent then verifies via MCP read-only and runs the recall smoke cases.

## Rollback command

```bash
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  patch-node \
  uq26nh1grIpnHju0 \
  ME_Memory_Recall_Result \
  --params docs/architecture/memory/v2/v2_obs_recall_summary_string_fix/artifacts/rollback_recall_result_params.json
```

(`rollback_recall_result_params.json` contains the pre-apply jsCode; see `artifacts/recall_result_jscode_pre.js` as authoritative source.)
