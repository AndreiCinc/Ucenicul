# WF-PL-01 Import / Patch Plan

## Purpose
Describe the safest known import path for `WF-PL-01`.

## Canonical workflow artifact
- `workflows/WF-PL-01_Plan_Generation.json`

## Shell policy
- preserve the existing `WF-PL-01` shell
- do not delete the workflow record
- replace placeholder internals only
- re-read the live shell immediately after import

## Target graph summary
- 13 nodes
- 12 stage edges
- 2 triggers
- 1 Postgres read node
- 7 Code nodes
- 2 Switch nodes

## Required post-import checks
1. workflow id unchanged
2. workflow name unchanged
3. node count sane
4. edge count sane
5. `PL_Load_Execution_Context` keeps:
   - correct credential binding
   - `alwaysOutputData: true`
6. both switches route on string `_valid` / `_context_ready`
7. `PL_Generate_Plan` body matches the source pack

## Known safe posture
- patch the source JSON on disk first
- user imports into n8n
- Claude verifies by live re-read
- Claude runs V1–V6
- Claude checks DB drift

## Known risk notes
- `mcp__n8n__patch_workflow_nodes` remains unsafe until disproven by new live evidence
- manual-mode execute may still prefer the webhook-registered trigger; dual-trigger pinData remains the fallback pattern
- query strings may remain inline-interpolated in n8n if parameter binding surfaces are not stable in this environment; if changed live, re-read and verify immediately

## Next executable action
Import the blueprint into the `WF-PL-01` shell, then perform live V1–V6 and post-test DB verification.
