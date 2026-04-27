# F6A-FOLLOWUP-SUPERSEDE-EMBED — Mission Brief

Opened: 2026-04-24
Authority: operator prompt in `/sessions/tender-amazing-franklin/mnt/uploads/CLAUDE_AUTONOMOUS_IMPLEMENTATION_PACK_F6A_FOLLOWUP_SUPERSEDE_EMBED_V2_WITH_TESTS (1).zip` (unpacked to `/sessions/tender-amazing-franklin/f6a_followup_pack/`; preserved in this mission dir under `tests/`).
Canonical apply channel: **V2-028** — autonomous agent-run local `n8n-patch` pack from the Cowork sandbox.
Mission ID: `F6A-FOLLOWUP-SUPERSEDE-EMBED`
Planner-selected: yes (not a candidate; the operator pack explicitly selects this as the next implementation mission).

## Goal

Mirror the F6A store-path embedding producer pattern onto the `supersede_memory` lane of `WF-ME-01`. Make new replacement rows inserted by `ME_Memory_Supersede_DB` receive `embedding vector(1536)` so they participate in semantic retrieval on the same `WHERE embedding IS NOT NULL AND status='active'` predicate used by `idx_memory_items_embedding_cos`.

## Scope — in

- Add two new nodes to WF-ME-01: `ME_Memory_Supersede_Embed` (HTTP → OpenAI `text-embedding-3-small`, 1536-d, credential `openAiApi`) and `ME_Memory_Supersede_Embed_Merge` (Code, pure function of `{prep, httpResp}` → writes `__db.embedding_text` + diagnostic passthrough).
- Modify `ME_Memory_Supersede_DB.parameters.query` only to add a CASE-guarded `$N::vector(1536)` projection for the replacement row INSERT.
- Modify `ME_Memory_Supersede_DB.parameters.options.queryReplacement` only by appending exactly one slot (`embedding_text`) to both success and error/null branches.
- Rewire exactly one edge: `ME_Memory_Supersede_Prep → ME_Memory_Supersede_DB` becomes `Prep → Embed → Embed_Merge → DB` (net +2 edges).
- Preserve idempotency semantics (`ON CONFLICT` / first-write-wins) byte-identically.
- Preserve F6A store-lane, Search lane, Recall lane, Promote lane, RA envelope byte-identically.

## Scope — out (forbidden)

- Re-opening F6A.
- Backfilling existing `memory_items.embedding IS NULL` rows.
- Rebuilding or retraining `ivfflat`.
- Modifying search ranking, lexical fallback, recall summary, promote acceptance predicate, store-prep hardcoded flags, RA envelope.
- Direct writes on `workflow_entity` (Path 5 retired per V2-025; survives only as V2-026 8-condition escape hatch, which is NOT invoked here).
- Writes via `mcp__n8n__patch_workflow_nodes` on `WF-ME-01` (blocked per sub-B).
- Any workflow other than `WF-ME-01`.
- Secret exposure (the pack-local `.env` is used solely as a credential source by `n8n-patch.mjs`; its contents are never printed, catted, copied, summarized or logged).

## Baseline (pre-mission, 2026-04-24 verify)

| Field | Value |
|---|---|
| Workflow id | `uq26nh1grIpnHju0` |
| versionId | `c07fe923-76eb-4901-b53b-14039536df55` |
| nodeCount | 47 |
| connectionCount | 65 |
| active | true |
| lineage tail | `… → 96962424 (V2-OBS) → c07fe923 (F6A)` |

## Expected target shape (post-apply)

| Field | Value |
|---|---|
| nodeCount | 49 (+2) |
| connectionCount | 67 (+2 net) |
| active | true |
| New nodes | `ME_Memory_Supersede_Embed`, `ME_Memory_Supersede_Embed_Merge` |
| Modified node | `ME_Memory_Supersede_DB` (parameters.query + parameters.options.queryReplacement only) |
| All other 45 pre-existing nodes | byte-identical |

## Idempotency test namespace

`mem-smoke-f6a-followup-supersede-embed-*` (unique; no pre-existing rows confirmed in Phase 0).

## Sub-roles I will use

1. **Truth Anchor Agent** — Phase 0 GREEN (already executed).
2. **Workflow Cartographer Agent** — Phase 2, maps live supersede lane + F6A store-lane pattern.
3. **DB Contract Agent** — Phase 2, SELECT-only checks on `memory_items` + pgvector contract.
4. **Patch Builder Agent** — Phase 3, deterministic builder + pre/post snapshots.
5. **Test Architect Agent** — Phase 2 + Phase 4, extends pack tests with harness-compatible candidate function.
6. **Evidence + Closeout Agent** — Phase 8 + Phase 9, reconciliation + writeback.

## Stop conditions

- `n8n-patch` pack missing / unable to reach n8n.
- Live baseline not matching `c07fe923` + 47 + 65 + active=true.
- Exact replacement content field cannot be derived from live `ME_Memory_Supersede_Prep` / `ME_Memory_Supersede_DB` contract.
- Implementation requires changes outside supersede lane.
- Any required local/unit test fails.
- Post-apply verify fails.
- Live E2E shows duplicate replacement rows or broken old-row supersede status.
- Patch requires Path 5, MCP patch writes, backfill, or ivfflat rebuild.
- Any secret would need to be printed into chat or docs.

## Build, diff, DB invariants (indexed; details in TESTING_STRATEGY / DESIGN_FREEZE)

- BUILD-INV-1..10 — deterministic payload properties, sha256-pinned, re-run byte-identical.
- DS-INV-1..14 — diff-surface (14 from `run_workflow_diff_tests.mjs`).
- MU-1..MU-9 — merge unit oracles.
- LI-1..LI-8 — mocked integration oracles.
- E1..E6 — live E2E oracles.
- DB-1..DB-8 — SELECT-only DB invariants.

## Non-authorized follow-ups

- Search-side semantic-rerank / BM25 / query-expansion on rare tokens (pre-existing OBS-E6.5 in F6A; remains out-of-scope here).
- `ivfflat` retrain policy (F6A-X-03 still forbidden inside F6A; still OOS here).
- Backfill of pre-existing NULL-embedding rows (DS-INV-6 remains a closure property).
- Supersede-prep input passthrough follow-up (`V2-OBS-STORE-PREP-INPUT-PASSTHROUGH`; out of scope).
