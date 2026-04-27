# V2-014 Execution Plan

Phase model is non-negotiable — 0 through 9 in order. Each phase either closes with recorded evidence or opens a blocker per `05_V2_014_BLOCKER_AND_DISPATCH_PROTOCOL` (mirrored in `V2_014_BLOCKER_REGISTER.md`).

## Phase 0 — Truth anchor  [DONE]

1. Confirm V2-014 is the correct frontier (handoff + F3.1 `f31-promote-012` bucket evidence).
2. Confirm F6 is not opened.
3. Confirm SQL-side only; no runtime workflow scope.
4. Freeze live workflow baseline: `versionId b8e2f194-0263-46d9-8306-1534cc7c31fe`, 45 nodes, 63 connections.

Evidence: `V2_014_MISSION_BRIEF.md` §Truth anchor; `V2_014_STATE.json.versionId.pre`.

## Phase 1 — Inventory + patch surface  [DONE]

1. Read live workflow via `mcp__n8n__get_workflow` (id `uq26nh1grIpnHju0`).
2. Extract and freeze `ME_Memory_Promote_DB.parameters.query` baseline SQL verbatim.
3. Confirm patch surface = `parameters.query` (single field).
4. Confirm precedent lineage: F2b (SQL-shape single-node patch on this same node) + F4 (operator-run CLI patch-node channel, single-key params).
5. Affirm nothing else is touchable in this workflow this mission.

Evidence: `V2_014_MISSION_BRIEF.md` §Baseline SQL + §Patch surface.

## Phase 2 — Mission control docs  [IN_PROGRESS]

Write in `docs/architecture/memory/v2/v2_014/`:
- `V2_014_MISSION_BRIEF.md`
- `V2_014_EXECUTION_PLAN.md` (this file)
- `V2_014_TESTING_STRATEGY.md`
- `V2_014_CURRENT_STAGE.md`
- `V2_014_STATE.json`
- `V2_014_FIX_LOG.md`
- `V2_014_BLOCKER_REGISTER.md`
- `V2_014_DISPATCH_LOG.md`

## Phase 3 — Design freeze

1. Write `V2_014_DESIGN_FREEZE.md` containing: motivation, old SQL verbatim, new SQL verbatim, unified diff, predicate invariants table, rollback-equivalence argument.
2. Declare target accept predicate:
   `corroboration_count >= $3::int OR ($4::boolean IS TRUE) OR ($5::boolean IS TRUE) OR (user_confirmed IS TRUE) OR (evidence_validated IS TRUE)`.
3. Confirm invariants:
   - param order unchanged ($1..$5)
   - `options.queryReplacement` unchanged
   - UPDATE side semantics unchanged
   - UNION-ALL denial branch unchanged; `denial_reason` vocabulary unchanged
   - tier gate `accept.tier = 'recent'` unchanged
4. Capture old/new SQL into git-ignored scratch files under `artifacts/` for builder input.

Gate: no change to any other field. No reordering. No added/removed CTE. Only the `ok` expression in `accept`.

## Phase 4 — Build

1. Deterministic builder `artifacts/build_patch_v2_014.mjs`:
   - input: constants NEW_QUERY string only.
   - output: `artifacts/patchV2_014_params.json` with single key `{ "query": "<new SQL>" }`.
   - build-time guards (reject if missing): `user_confirmed IS TRUE`, `evidence_validated IS TRUE`, `corroboration_count >= $3`, `FOR UPDATE`, `tier = 'recent'`, `promoted` CTE name, `denial_reason`.
   - build-time guards (reject if present): Path 5 markers, UPDATE of any column outside the canonical set.
   - emits unified diff to stdout.
2. Run builder; commit `patchV2_014_params.json`.
3. Byte-for-byte sanity: re-run builder; identical output.

Gate: SHA of params.json recorded in `V2_014_DESIGN_FREEZE.md` §Build.

## Phase 5 — Pre-apply verification

1. `mcp__n8n__verify_workflow` pinning baseline versionId and `ME_Memory_Promote_DB.parameters.query` baseline content.
2. Capture pre-state raw to `artifacts/runtime/get_workflow_pre.json` (node excerpt only).
3. Write `V2_014_APPLY_COMMAND.md` with the exact operator CLI block:
   ```bash
   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
     patch-node \
     uq26nh1grIpnHju0 \
     ME_Memory_Promote_DB \
     --params docs/architecture/memory/v2/v2_014/artifacts/patchV2_014_params.json
   ```
4. Record expected post-state node-changed claim: `ME_Memory_Promote_DB`.

## Phase 6 — Apply via operator-run CLI

1. Hand off apply command to operator. Wait.
2. On return, capture operator stdout / summary into `artifacts/runtime/operator_apply_stdout.txt`.
3. Do NOT improvise another apply channel. If the CLI cannot run in the operator environment, open `APPLY_CHANNEL_BLOCKER` and stop the mission at closeout with BLOCKED_WITH_EVIDENCE.

## Phase 7 — Post-apply verification

1. `mcp__n8n__get_workflow` → record post `versionId` in `V2_014_STATE.json.versionId.post`.
2. `mcp__n8n__verify_workflow` assertions:
   - `ME_Memory_Promote_DB.parameters.query` equals NEW_QUERY exactly.
   - `ME_Memory_Promote_DB.parameters.options.queryReplacement` unchanged.
   - nodeCount == 45, connectionCount == 63.
3. `diff_surface_verification.txt`: show that only the one node's `parameters.query` changed, no other node body mutated. Derived by diffing pre vs post full workflow JSON.

## Phase 8 — Targeted rerun

1. Reseed `f31-promote-012` preconditions (row tier=recent, user_confirmed=true, evidence_validated=false, corroboration_count=1) via SELECT-pre + targeted UPDATE per F3.1 seed helper.
2. Execute WF-ME-01 with promote payload (caller cuc=false, cev=false) and memory_id `8fb20b75-b0fc-4c65-a65b-3eaa940b5b09`.
3. Capture `exec_f31-promote-012_<execId>.raw.json` + `verdict_f31-promote-012.json` in `artifacts/runtime/`.
4. Expectations (all must hold):
   - n8n execution status = success
   - module_result.status = accepted / promoted
   - denial_reason != `acceptance_criteria_not_met`
   - tier: recent → long_term
   - `last_reconfirmed_at` becomes non-null
   - no false broadening on one deny rerun + one caller-accept rerun
5. Safety reruns (minimum 2):
   - One deny case still denies (row persistent flags all false, caller false, corr < threshold).
   - One caller-accept case still accepts (row tier=recent, caller cuc=true).

## Phase 9 — Closeout + writeback

If all Phase 7 + 8 assertions hold:
1. Write `V2_014_FINAL_STATUS.md` with verdict `SUCCESS`.
2. Minimal pointer writeback:
   - `MEMORY_V2_STATE.md` — add V2-014 closed SUCCESS, remove from next-frontier.
   - `SESSION_HANDOFF_NEXT.md` — move V2-014 from candidate to closed; surface remaining deferred follow-ups.
   - `MEMORY_V2_PHASE_GATES.md` — add V2-014 row.
   - `CURRENT_TRUTH_POST_F5.md` — SQL clause now honors row-persisted confirmation flags.
   - `MEMORY_V2_DECISION_LEDGER.md` — only add row if a brand-new decision was made; V2-014 row already exists so prefer update column `status`.
3. Auto-memory anchor updated.

If operator apply blocked or rerun still FAILs:
- Verdict `BLOCKED_WITH_EVIDENCE`.
- All evidence paths listed in `V2_014_FINAL_STATUS.md`.
- No silent recovery, no drift to F6, no Path 5 fallback.
