# apply_evidence_20260420.md

## Scope of this file
Evidence log for Phase 6 application of the WF-ME-01 patch described by `patch_plan.md` and realised as `wf_me_01_post_patch_20260420.json`.

## Artefact status — 2026-04-20

| Item | Status |
|---|---|
| `wf_me_01_pre_patch_20260420.json` | frozen, matches live snapshot |
| `wf_me_01_live_snapshot_20260420_pre_apply.json` | captured via `mcp__n8n__get_workflow` immediately before patch prep |
| `build_patch.mjs` | written, runs deterministically |
| `wf_me_01_post_patch_20260420.json` | generated, 43 nodes, 5-rule switch, structurally verified (see §Structural verification) |
| `README.md` | apply procedure + rollback documented |
| Live PUT executed | **deferred to operator** (see §Live apply decision) |

## Structural verification (run on 2026-04-20)

```
pre_node_count : 30
post_node_count: 43
new_nodes      : 13 (all prefixed me-phase5mem-*)
repurposed_nodes: 2 (ME_Memory_Store_Result, ME_Memory_Search_Result — id preserved, body rewritten)
switch_rule_count: 5 (store_memory, search_memory, recall_memory, promote_memory, supersede_memory)
switch_branches : 6 (5 typed + 1 default → ME_Return_Error)
chain_check : Store / Search / Recall / Promote / Supersede  — each Prep→DB→Result→ME_Return_Result, confirmed
connections feeding ME_Return_Result: 16 (5 new memory Results + 5 Task + 4 Reminder + Improvement + Watcher)
```

Live state baseline before patch prep:
- id: `uq26nh1grIpnHju0`
- versionId: `3b3fc427-9600-4652-96d7-1b0536ddd39f`
- node count: 30
- active: true
- `ME_Route_Memory_Action` live rule count: 2 (`store_memory`, `search_memory`)
- phase5mem nodes live: 0

## Live apply decision — 2026-04-20

The live PUT was **not** executed from within this agent session. Rationale:

1. **Atomicity is required**. The patch adds 13 new nodes, extends the switch from 2 → 5 rules, and rewrites 2 existing Code node bodies. A partial apply (for example, changing `ME_Memory_Store_Result.parameters.jsCode` alone) would break the live production store/search path because the new body expects inputs from a DB predecessor that does not yet exist in the live workflow. The rewritten Code body would always fall through to `DB_WRITE_FAILED`.

2. **MCP surface constraints**. `mcp__n8n__patch_workflow_nodes` only rewrites existing named nodes — it cannot add new nodes or change the `connections` graph. `mcp__f2e8be41-…__update_workflow` accepts only validated SDK TypeScript code, not a raw workflow JSON payload; translating the 43-node JSON (including embedded `jsCode` bodies and parameterised SQL) into SDK form is a rewrite of the patch artefact in a different representation and breaks byte-exact replay.

3. **Safer path is a direct n8n REST PUT** with `wf_me_01_post_patch_20260420.json` as the body, bracketed by deactivate → PUT → activate. That path is documented in `README.md` and is identical to the procedure fixed in `patch_plan.md` §14.

Therefore Phase 6 is closed as **artefact-freeze + documented apply procedure**. Live PUT is the operator step. This matches the standing convention (the Phase 5 freeze explicitly scheduled deactivate/PUT/activate as an operator procedure).

## What *was* executed live

- **Schema migration** (`migration.sql`) was executed live in Phase 4 via `mcp__postgres__execute_sql`. All 3 enums, 25 columns, 9 indexes, and 1 trigger are verified present. Independent of the workflow patch.
- **Structural and live-read verification** of the pre-patch workflow state via `mcp__n8n__get_workflow`. The live snapshot exactly matches `wf_me_01_pre_patch_20260420.json` in node count, switch configuration, and versionId.

## Operator checklist for live apply

1. Export current live workflow (safety copy) via `GET /api/v1/workflows/uq26nh1grIpnHju0`.
2. Deactivate the workflow via UI or `PATCH /api/v1/workflows/uq26nh1grIpnHju0` with `active:false`.
3. `PUT /api/v1/workflows/uq26nh1grIpnHju0` with body `wf_me_01_post_patch_20260420.json`.
4. Run `mcp__n8n__verify_workflow` with the expected shape listed in `README.md` §Apply procedure step 3.
5. Activate the workflow.
6. Append the resulting `versionId` and timestamp to this file under §Post-apply record.

## Post-apply record

Rollout executed 2026-04-21 via canonical channel `n8n-patch.mjs`. Verified pass.

```
apply_timestamp:       2026-04-20T21:30:41.984Z  (n8n audit UTC — corresponds to 2026-04-21 local)
channel:               .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs
sequence:              get → deactivate → replace → activate → verify
pre_rollout_versionId: 3b3fc427-9600-4652-96d7-1b0536ddd39f
new_versionId:         da6d2573-ed85-4f1f-8c54-693364f9a432
before_hash:           0a5b620345b4
after_hash:            4524b8777c4a
before_snapshot:       .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/snapshots/uq26nh1grIpnHju0_before_2026-04-20T21-30-41-297Z.json
after_snapshot:        .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/snapshots/uq26nh1grIpnHju0_after_2026-04-20T21-30-41-969Z.json
explicit_pre_snapshot: docs/architecture/memory/patches/wf_me_01_live_snapshot_pre_rollout.json
post_apply_nodeCount:  43
post_apply_switch:     ME_Route_Memory_Action.parameters.rules.values.length = 5
post_apply_dbnodes:    ME_Memory_Store_DB, ME_Memory_Search_DB, ME_Memory_Recall_DB, ME_Memory_Promote_DB, ME_Memory_Supersede_DB all n8n-nodes-base.postgres / executeQuery
post_apply_active:     true
post_apply_updatedAt:  2026-04-20T21:30:40.729Z
verify_outcome:        pass (7/7 checks via mcp__n8n__verify_workflow — read-only audit use)
smoke_test_run:        no (runtime smoke via TR trigger is a separate v2 item per final_verification.md)
notes:                 autonomous rollout by continuator agent per user directive 2026-04-21; canonical CLI channel per 10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md; MCP patch/update routes NOT used (read-only MCP used only for shape verify).
```

### n8n-patch audit tail (verbatim)

```
{"ts":"2026-04-20T21:30:37.683Z","op":"deactivate","id":"uq26nh1grIpnHju0"}
{"ts":"2026-04-20T21:30:41.984Z","op":"replace","id":"uq26nh1grIpnHju0","name":"WF-ME-01 Module Execution","before_hash":"0a5b620345b4","after_hash":"4524b8777c4a","before_snapshot":".../snapshots/uq26nh1grIpnHju0_before_2026-04-20T21-30-41-297Z.json","after_snapshot":".../snapshots/uq26nh1grIpnHju0_after_2026-04-20T21-30-41-969Z.json"}
{"ts":"2026-04-20T21:30:45.606Z","op":"activate","id":"uq26nh1grIpnHju0"}
```

## Record of files touched in this phase

- `docs/architecture/memory/patches/wf_me_01_pre_patch_20260420.json` (created)
- `docs/architecture/memory/patches/wf_me_01_live_snapshot_20260420_pre_apply.json` (created)
- `docs/architecture/memory/patches/build_patch.mjs` (created)
- `docs/architecture/memory/patches/wf_me_01_post_patch_20260420.json` (generated)
- `docs/architecture/memory/patches/README.md` (created)
- `docs/architecture/memory/patches/apply_evidence_20260420.md` (this file)

Outside `docs/architecture/memory/**`: nothing. Write fence respected.
