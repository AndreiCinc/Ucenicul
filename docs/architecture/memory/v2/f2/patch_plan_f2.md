# patch_plan_f2.md — F2 rollout plan

Opened: 2026-04-21.

## Objective

Add an embedding producer to the `search_memory` leg of `WF-ME-01`. Minimal scope, additive, code-and-HTTP only, no schema or credential changes.

## Inputs

- Current live: `versionId=c4a3b0d1-177e-457e-b710-f22bf78eb240` (post-Patch-A), `nodeCount=43`.
- Design: `docs/architecture/memory/v2/f2/design_f2_embedding_producer.md`.
- DIVERGENCE: `D-M-011`.
- Credential reuse: `svM62oyFwPbaIeX4` (OpenAi account).

## Build

Deterministic script: `artifacts/build_patch_f2.mjs`.
- Reads: `artifacts/WF-ME-01_pre_f2.json` (fetched fresh via `n8n-patch.mjs get`).
- Mutates: inserts `ME_Memory_Search_Embed` + `ME_Memory_Search_Embed_Merge`; rewires `Prep→DB` into `Prep→Embed→Merge→DB`.
- Writes: `artifacts/WF-ME-01_post_f2.json`.
- Invariants checked at build time: workflow name, node count 43→45, Patch A jsCode present, no pre-existing F2 nodes, all new edges wired, Prep→DB edge removed.

## Rollout

Canonical channel: `n8n-patch.mjs replace`.

```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace \
  uq26nh1grIpnHju0 \
  docs/architecture/memory/v2/f2/artifacts/WF-ME-01_post_f2.json
```

No `--reactivate` needed (no webhook triggers on this workflow — chat + executeWorkflowTrigger). The tool's internal safety guarantees apply: GET→mutate→PUT, body filtered to whitelist, audit appended.

## Post-rollout verification

1. `verify_workflow` with `nodeCount=45` expected.
2. Spot check that `ME_Memory_Search_Embed.parameters.nodeCredentialType === 'openAiApi'`.
3. Spot check connections: `Prep` has no edge to `DB`; `Embed→Merge→DB` chain exists.

## Smoke (F2.4)

Reruns against `execution_context_id=d4f82a41-01cd-4fb7-9d70-573557348e74`:

| Run | Query | Caller embedding? | Oracle |
|---|---|---|---|
| f2-t1 | `store path anchor` | no | HTTP success; semantic CTE runs; zero rows (no stored embeddings); `recall_results=[]`, `status=success`, merged passthrough shows `embedding_attempted=true`, `embedding_error=null`, `__db.embedding_json` length > 1000 chars |
| f2-t2 | `Smoke V2 F1` | **yes** (caller-supplied 1536-float array, e.g., all 0.00065) | HTTP call skipped in Merge (passthrough `embedding_attempted=false`); DB semantic still runs; likely zero matches on cosine; `recall_results=[]`, `status=success`, `used_embedding=true` |
| f2-t4 | `zzz_no_match_zzz` | no | HTTP succeeds; semantic returns 0; lexical branch gated out because `emb_text IS NOT NULL`; `recall_results=[]`, `status=success` — regression safety vs. s2b |

t3 (API-failure fallback) is deferred — see design §Test plan.

## Rollback

Revert to `WF-ME-01_pre_f2.json` via `replace`. Structural-only change; no data mutation anywhere in F2.

## Audit artifacts

- `apply_evidence_f2_YYYYMMDD.md` — pre/post versionId, verify result, smoke results, DB delta (none expected), final gate statuses.

## F2b addendum (landed 2026-04-21)

F2 t1 smoke revealed an implicit regression: the lexical CTE in `ME_Memory_Search_DB` was gated by `AND p.emb_text IS NULL`, which was correct pre-F2 but post-F2 silently disabled the lexical leg for every search (the Embed producer now populates `emb_text` on every request). Since `memory_items.embedding` is NULL for every row (store-path embeds are deliberately deferred), the semantic CTE also returned 0. Net effect: all searches returned 0 rows.

Addendum mutations (via `build_patch_f2b.mjs` → `WF-ME-01_post_f2b.json` → `n8n-patch.mjs replace`):

1. `ME_Memory_Search_DB.parameters.query` — drop `AND p.emb_text IS NULL` from lexical CTE; add `AND NOT EXISTS (SELECT 1 FROM semantic s WHERE s.id = mi.id)` so a row matching both legs is not returned twice.
2. `ME_Memory_Search_Result.parameters.jsCode` — read `ME_Memory_Search_Embed_Merge.passthrough` for authoritative `used_embedding`/`embedding_attempted`/`embedding_error`. `used_embedding` now requires `semantic_match_count > 0`. Only a true HTTP-producer failure (`embedding_attempted && embedding_error !== null`) triggers `status=partial` + a `generate_embedding` followup; "semantic matched 0 rows, lexical found some" is classified as `success`.

Final versionId after F2b: `f7f3e982-1ec8-46c9-a5d9-6d905419b313`.

Smoke evidence: exec 1431 (t1), 1441 (regression probe vs pre-F2 baseline), 1450 (t4 no-match). See `apply_evidence_f2_20260421.md` §3.
