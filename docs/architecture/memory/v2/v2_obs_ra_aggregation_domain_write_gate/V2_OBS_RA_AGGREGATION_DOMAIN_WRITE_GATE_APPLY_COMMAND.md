# Apply Command — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

Canonical operator-run CLI protocol (V2-025). No alternatives, no in-n8n-UI edits, no Path 5.

## Target

- Workflow: `WF-ME-01 Module Execution`
- Workflow id: `uq26nh1grIpnHju0`
- Node: `ME_Build_RA_Envelope`
- Parameter key overwritten: `parameters.jsCode`
- Pre-apply live versionId: `279a8628-5df6-4b38-86b0-8cc51989629b` (verified via `mcp__n8n__verify_workflow`, session 2026-04-22)

## Prerequisites

1. `.env` at repo root contains `N8N_URL` + `N8N_API_KEY`.
2. Params payload frozen: `docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/artifacts/patchV2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_params.json`.
3. Builder was run and its sha256 is recorded in `artifacts/runtime/build_output.txt` (added during execution).
4. Pre-apply `get_workflow` snapshot is captured at `artifacts/pre/get_workflow_pre.json`; node-level extraction at `artifacts/pre/ME_Build_RA_Envelope_pre.json` and `artifacts/pre/ME_Build_RA_Envelope_pre.jsCode.txt`.

## Canonical command

```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
    patch-node uq26nh1grIpnHju0 ME_Build_RA_Envelope \
    --params docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/artifacts/patchV2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_params.json
```

Execution: Bash from repo root, stdout captured to `artifacts/runtime/operator_apply_stdout.txt`.

## Post-apply verification sequence

1. `mcp__n8n__verify_workflow` with `expected.nodeCount=45`, `expected.connectionCount=63`, and `nodeFields[0]={nodeName:"ME_Build_RA_Envelope", path:"parameters.jsCode", equals: "<post jsCode>"}`.
2. `mcp__n8n__get_workflow` → persist new snapshot to `artifacts/post/get_workflow_post.json`; extract `ME_Build_RA_Envelope` node to `artifacts/post/ME_Build_RA_Envelope_post.json` and its jsCode to `artifacts/post/ME_Build_RA_Envelope_post.jsCode.txt`.
3. Diff-surface audit: compare `artifacts/pre/ME_Build_RA_Envelope_pre.jsCode.txt` vs `artifacts/post/ME_Build_RA_Envelope_post.jsCode.txt`. Expected functional diff: exactly the success-branch line change (`domain_writes_performed: !!src.domain_writes_performed,` → `domain_writes_performed: false,`) plus the comment-block header update. Persist diff + verdict under `artifacts/runtime/diff_surface_verification.txt`.
4. Record new versionId (post-apply) in `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_FINAL_STATUS.md` once closeout runs.

## Abort conditions

- If `verify_workflow` fails `allPass` post-apply — mark BLOCKED_WITH_EVIDENCE and stop.
- If diff-surface audit shows any other node or field changed — mark BLOCKED_WITH_EVIDENCE and stop.
- If the operator-run CLI does not emit a clean `patch-node` success line — mark BLOCKED_WITH_EVIDENCE and stop.

Precedent: this is the same channel V2-014 and F3.1 Stage C used for their single-field node patches.
