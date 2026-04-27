# F6A Mission Brief

Mission ID: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Status: OPEN
Opened: 2026-04-23 (autonomous mission under operator directive via pack `F6A` uploaded 2026-04-23)
Verdict: pending
Authority source: operator directive 2026-04-23 (uploaded pack `00_READ_FIRST.md` → `07_OPERATOR_PROMPT_FOR_NEW_CHAT.md`) — ridică interdicțiile „Must not open F6" și „Must not start the store-path embedding producer" din `CURRENT_TRUTH_POST_F5.md §4` strict pentru F6A.
Precedent lineage:
- F2 / F2b (semantic search leg — two new nodes + hybrid SQL, `replace` channel)
- F5 (Prep jsCode patch pattern with multi-language guard)
- V2-025 (operator-run CLI protocol — canonical rollout channel)

## Purpose

Add the missing store-path embedding production so that `memory_items` rows created through the live `store_memory` action receive a 1536-dim OpenAI vector on insert, enabling semantic retrieval (F2/F2b search leg) to actually return rows produced by normal store flow. Current state: store-lane `ME_Memory_Store_DB` inserts with `embedding` column unset (defaults to NULL); the search leg's semantic CTE is therefore a no-op against all post-v2-rollout rows.

## Truth anchor (Phase 0)

- Read order per pack `00_READ_FIRST.md` completed: CURRENT_TRUTH_POST_F5.md, AUTHORITY_AND_READ_ORDER.md, MEMORY_V2_STATE.md, SESSION_HANDOFF_NEXT.md, MEMORY_V2_CLOSEOUT.md, v2/f2/design_f2_embedding_producer.md, v2/f2/patch_plan_f2.md, v2/f2/apply_evidence_f2_20260421.md, final_verification.md.
- Live workflow baseline at open: `versionId = 96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`, `nodeCount = 45`, `connectionCount = 63`, `active = true`. Full lineage: `da6d2573 → c4a3b0d1 (Patch A) → 7455992c (F2) → f7f3e982 (F2b) → fc43f6bc (F4) → b8e2f194 (F5) → 279a8628 (V2-014) → 96962424 (V2-OBS)`.
- All prior frontiers frozen and must not be mutated: F1, Patch A, F2, F2b, F3 first-batch, F4, F5, F3.1 Stage C (SUCCESS 2026-04-22T14:30Z), V2-014 (SUCCESS 2026-04-22T15:30Z), V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE (SUCCESS 2026-04-22).
- Raw umbrella `F6` remains NOT opened. Only the granular sub-frontier `F6A` is authorized by the 2026-04-23 directive.
- Remaining deferred follow-ups (not in F6A scope): V2-OBS-STORE-PREP-INPUT-PASSTHROUGH, V2-OBS-RECALL-SUMMARY-STRING, accept-via-corroboration, sub-A / sub-B infra.

## Problem statement (from repo evidence)

1. `ME_Memory_Store_Prep.parameters.jsCode` (dump at 2026-04-23 from live `versionId=96962424`) emits `{__db:{…}, passthrough:{…}}` with no embedding field.
2. `ME_Memory_Store_DB.parameters.query` is an `INSERT INTO public.memory_items (tenant_id, memory_type, category, content, confidence, importance, durability, source_thread_id, source_message_id, entity_id, evidence_refs, metadata, idempotency_key)` with 13 positional binds. Column `embedding` is absent from the column list and therefore set to NULL by the table default.
3. `migration.sql:150` declares `embedding vector(1536)` nullable; `migration.sql:224–228` declares the partial `ivfflat` cosine index `WHERE embedding IS NOT NULL AND status='active'`. New non-null embeddings land in that index automatically on insert.
4. `v2/f2/apply_evidence_f2_20260421.md §5` records the known gap: "Store path does not yet compute embeddings. `memory_items.embedding` is NULL for every row, so the semantic CTE returns 0 rows by construction." F6A is the scoped fix for that exact gap.

## Patch surface (allowed diff)

Three-node surface inside `WF-ME-01`:

1. **NEW node** `ME_Memory_Store_Embed` (`n8n-nodes-base.httpRequest` typeVersion 4.2) — mirror of `ME_Memory_Search_Embed`.
2. **NEW node** `ME_Memory_Store_Embed_Merge` (`n8n-nodes-base.code` typeVersion 2) — mirror of `ME_Memory_Search_Embed_Merge`, adapted to read from `ME_Memory_Store_Prep` and emit `__db.embedding_text`.
3. **MODIFIED node** `ME_Memory_Store_DB.parameters` — INSERT column list gains `embedding`; VALUES list gains `$14::vector(1536)`; `options.queryReplacement` expanded from 13 elements to 14.

Connection edits:
- Remove: `ME_Memory_Store_Prep → ME_Memory_Store_DB`
- Add: `ME_Memory_Store_Prep → ME_Memory_Store_Embed`
- Add: `ME_Memory_Store_Embed → ME_Memory_Store_Embed_Merge`
- Add: `ME_Memory_Store_Embed_Merge → ME_Memory_Store_DB`

Node count 45 → 47. Connection count 63 → 65 (net +2).

Nothing else in the workflow is writable this mission — no other node, no credentials, no settings, no changes to connections outside the four listed above. The only permitted position changes are (a) the two new nodes' own coordinates and (b) one deliberate single-column x-shift of `ME_Memory_Store_DB.position` from `[3008,1040]` to `[3128,1040]` so the new Store_Embed_Merge can occupy `[3008,1040]` and the two-lane layout aligns vertically with the F2 search-lane offsets; this shift is visual-layout only and no downstream node moves. Documentation diff is confined to `docs/architecture/memory/v2/f6a/**` plus the minimal pointer writeback in state/handoff/truth-anchor docs described in Phase 10.

## Out of scope (do NOT touch)

- Any other node outside the three named above (notably: Supersede lane, Promote lane, Recall lane, Search lane, RA envelope).
- Any other workflow than `WF-ME-01` (`uq26nh1grIpnHju0`).
- `brain_contract.json`.
- Module spec / Registry / Architecture spec.
- Raw umbrella `F6`, `F6B` (idempotency_key_prefix), `F6C` (ivfflat retrain policy), `F6D` (multi-workflow connector assertion).
- `V2-OBS-STORE-PREP-INPUT-PASSTHROUGH` (still open; hardcoded tier/user_confirmed/corroboration_count — unrelated to embedding).
- `V2-OBS-RECALL-SUMMARY-STRING` (cosmetic; unrelated).
- `accept-via-corroboration` mission.
- sub-A / sub-B infra fixes.
- Supersede-lane embedding producer — deliberately deferred (see `F6A_BLOCKER_REGISTER.md §Known deliberate exclusion`). Name of the mission ("STORE-PATH") is kept literal; mirror on supersede belongs to a successor `F6E-SUPERSEDE-PATH-EMBEDDING-PRODUCER` tracked as an open follow-up.
- Path 5 DB-bypass channel (retired per V2-025; `D-M-014` was F5-only).
- Back-fill of existing rows with NULL embeddings (future ops task; not a workflow change).
- `ivfflat` lists retraining (F6C candidate; no code change).
- Caller-supplied-embedding short-circuit proof via live traffic (deferred per F2 t2 precedent; F6A verifies the skip branch by inspection + unit).

## Channels

- Apply: **autonomous agent-run local `n8n-patch` pack** (V2-028 canonical, 2026-04-23; supersedes V2-025 operator-run CLI on the apply-ownership clause). The agent runs `node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace uq26nh1grIpnHju0 <post payload>` directly via `Bash` from the Cowork sandbox, using the pack's local `.env` for n8n API credentials. Because F6A introduces new nodes + new connections + modified node parameters, the apply sub-command is `replace` (not `patch-node`). Precedent: F2 used `replace` for the symmetric 2-node / 3-edge change on the search lane; V2-014 and V2-OBS used the same pack from the sandbox for their closures. Protocol doc: `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md`.
- Verify pre/post: `mcp__n8n__get_workflow` + `mcp__n8n__verify_workflow` (read-only).
- Smoke: `mcp__f2e8be41-…__execute_workflow` + `mcp__postgres__execute_sql` (SELECT-only).
- Path 5 is retired as a default (V2-025 preserved); survives only under V2-026's 8-condition escape hatch. Do not invoke for F6A.
- MCP `patch_workflow_nodes` remains blocked for `WF-ME-01` (sub-B); do not use.
- The prior operator-run CLI protocol (V2-025 / `protocol_operator_run_cli.md`) is superseded on apply-ownership and retained for audit only; do not hand the apply off to the operator.

## Success criteria

Mission is DONE only if all 13 items of `06_ACCEPTANCE_AND_CLOSEOUT_F6A.md` hold:

1. Mission docs exist in repo (this brief + design freeze + test strategy + execution plan + blocker register).
2. Design freeze exists and names exact target nodes/fields (`F6A_DESIGN_FREEZE.md`).
3. Deterministic builder + params/full-workflow payload exist under `artifacts/`.
4. Exact operator-run CLI command exists (`F6A_APPLY_COMMAND.md`).
5. Pre-apply verification exists in `F6A_APPLY_EVIDENCE_<date>.md §Pre-state`.
6. Post-apply verification exists in the same file §Post-state with diff-surface proof.
7. Local matrix passes in full (`F6A_LOCAL_RESULTS.md`).
8. Live E2E matrix passes in full (`F6A_E2E_RESULTS.md`).
9. Semantic retrieval improvement is proven with explicit evidence (at least one newly stored row found by semantic CTE post-patch that would have been unreachable pre-patch).
10. Replay/idempotency behavior is proven for the new path (no duplicate row; embedding produced once per unique idempotency_key).
11. No regression remains unresolved on impacted families (search semantic, search lexical fallback, store path replay, recall / promote / supersede unaffected).
12. State / gates / handoff / closeout pointers updated (`MEMORY_V2_STATE.md`, `MEMORY_V2_PHASE_GATES.md`, `MEMORY_V2_CLOSEOUT.md`, `SESSION_HANDOFF_NEXT.md`, `CURRENT_TRUTH_POST_F5.md`, `MEMORY_V2_DECISION_LEDGER.md`, auto-memory anchor).
13. `F6A_FINAL_STATUS.md` exists with verdict exactly `F6A SUCCESS — STORE-PATH EMBEDDING PRODUCER LANDED` or `F6A BLOCKED_WITH_EVIDENCE`.

## Pointers

- Design freeze: `F6A_DESIGN_FREEZE.md`
- Testing strategy: `F6A_TESTING_STRATEGY.md`
- Execution plan: `F6A_EXECUTION_PLAN.md`
- Cursor: `F6A_CURRENT_STAGE.md`
- State JSON: `F6A_STATE.json`
- Fix log: `F6A_FIX_LOG.md` (created lazily on first fix)
- Blocker register: `F6A_BLOCKER_REGISTER.md`
- Dispatch log: `F6A_DISPATCH_LOG.md`
- Build script: `artifacts/build_patch_f6a.mjs` (Phase 4)
- Patch payload: `artifacts/WF-ME-01_post_f6a.json` (Phase 4, full-workflow for `replace`)
- Apply command block: `F6A_APPLY_COMMAND.md` (Phase 5)
- Apply evidence: `F6A_APPLY_EVIDENCE_<date>.md` (Phase 6+)
- Local results: `F6A_LOCAL_RESULTS.md` (Phase 7)
- E2E results: `F6A_E2E_RESULTS.md` (Phase 8)
- Final status: `F6A_FINAL_STATUS.md` (Phase 10)
