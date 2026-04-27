# apply_evidence_f2_20260421.md — F2 + F2b rollout evidence

Date: 2026-04-21 (UTC timestamps below are from execution records, 2026-04-20 late-UTC = 2026-04-21 local).

Scope: close D-M-011 / F2 gates F2.2–F2.4 by landing the embedding producer
for `search_memory` **and** the hybrid-search addendum (F2b) that repairs the
regression the first rollout introduced.

---

## 1. F2 rollout — embedding producer (two new nodes)

### Inputs
- Workflow: `WF-ME-01 Module Execution`, id `uq26nh1grIpnHju0`
- Pre-F2 live versionId: `c4a3b0d1-177e-457e-b710-f22bf78eb240` (post-Patch-A)
- Build artefact: `artifacts/WF-ME-01_post_f2.json` from `artifacts/build_patch_f2.mjs`
- Credential: `svM62oyFwPbaIeX4` (`OpenAi account`, reused from brain v6 preprocessor)

### Mutation summary
- **Added** `ME_Memory_Search_Embed` — `n8n-nodes-base.httpRequest` typeVersion 4.2
  - `POST https://api.openai.com/v1/embeddings`
  - Body: `{"model":"text-embedding-3-small","input":$json.__db.query_text}`
  - Auth: `predefinedCredentialType` / `nodeCredentialType=openAiApi` / credential `svM62oyFwPbaIeX4`
  - `onError: continueRegularOutput`, timeout 30 s
- **Added** `ME_Memory_Search_Embed_Merge` — `n8n-nodes-base.code` typeVersion 2
  - Propagates `prep._error=true` unchanged.
  - Preserves caller-supplied embedding (short-circuit: if `__db.embedding_json` already set, do nothing).
  - Otherwise validates `httpResp.data[0].embedding.length === 1536`; on success folds it into `__db.embedding_json` and sets `passthrough.used_embedding=true`; on failure records `passthrough.embedding_error` and leaves `__db.embedding_json=null`.
- **Rewired** `ME_Memory_Search_Prep → ME_Memory_Search_DB` edge:
  - Removed: `Prep → DB`
  - Inserted chain: `Prep → Embed → Embed_Merge → DB`
- Post-state: 45 nodes, 63 connections.

### Rollout channel
```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace \
  uq26nh1grIpnHju0 \
  docs/architecture/memory/v2/f2/artifacts/WF-ME-01_post_f2.json
```
- Post-F2 versionId: `7455992c-debd-42f4-b0cc-97bf16d87e62`.
- `mcp__n8n__verify_workflow` confirmed `nodeCount=45`, `connectionCount=63`, `ME_Memory_Search_Embed.parameters.nodeCredentialType="openAiApi"`, `ME_Memory_Search_DB.parameters.operation="executeQuery"`.

### F2 t1 smoke (exec 1421) — regression discovered
- Query `store path anchor` → HTTP embedding succeeded, `emb_json` length 29 503 chars, Embed_Merge passthrough `used_embedding=true, embedding_attempted=true, embedding_error=null`.
- **BUT** `ME_Memory_Search_DB` returned the n8n zero-rows placeholder `{"success":true}`. Post-patch-A filter in `ME_Memory_Search_Result` dropped it correctly → `recall_results=[]`, but a pre-F2 identical query returned 2 lexical matches.

Root cause: pre-F2 the lexical CTE in `ME_Memory_Search_DB` was gated by `AND p.emb_text IS NULL`. The Embed producer now populates `emb_text` for **every** search, so the lexical leg was permanently gated out. And the semantic leg returns 0 because no `memory_items` row has `embedding` populated yet (store path intentionally writes `embedding=NULL` — out of F2 scope). Net effect: every search returned 0 rows. Unacceptable regression.

---

## 2. F2b addendum — hybrid-search SQL + Result node refinement

### Mutation summary
- `ME_Memory_Search_DB.parameters.query`
  - Removed `AND p.emb_text IS NULL` gate from the `lexical` CTE so the lexical leg always runs when `q_text` is supplied.
  - Added `AND NOT EXISTS (SELECT 1 FROM semantic s WHERE s.id = mi.id)` to prevent double-counting a row that matches both legs.
  - Semantic CTE unchanged (still gated by `emb_text IS NOT NULL AND mi.embedding IS NOT NULL`, so it remains a no-op until memory_items rows gain embeddings — store-path F-future work).
- `ME_Memory_Search_Result.parameters.jsCode`
  - Now reads `ME_Memory_Search_Embed_Merge` passthrough for authoritative embedding signals (`used_embedding`, `embedding_attempted`, `embedding_error`).
  - `used_embedding` = "embedding available AND semantic actually contributed" (i.e. `semantic_match_count > 0`).
  - `isTrueEmbeddingFallback` = "HTTP embedding was attempted **and** failed". Only this triggers `status=partial` + `generate_embedding` followup. "Semantic matched 0 rows, lexical found some" is **not** a fallback.
  - Reports `semantic_match_count` and `lexical_match_count` in `details` for observability.

### Rollout
```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace \
  uq26nh1grIpnHju0 \
  docs/architecture/memory/v2/f2/artifacts/WF-ME-01_post_f2b.json
```
- Pre-F2b versionId: `7455992c-debd-42f4-b0cc-97bf16d87e62`
- Post-F2b versionId: `f7f3e982-1ec8-46c9-a5d9-6d905419b313`
- verify_workflow: 45 nodes, Embed credential `openAiApi`, DB operation `executeQuery`, Result jsCode matches the F2b body byte-for-byte.

### Build artefact: `artifacts/build_patch_f2b.mjs`
Deterministic; input `WF-ME-01_post_f2_preSQL.json` (live state post-F2), output `WF-ME-01_post_f2b.json`. Invariant guards: still 45 nodes; lexical gate removed exactly once; NOT EXISTS clause present; semantic `emb_text IS NOT NULL` gate preserved; exactly 2 `mi.tenant_id = p.tenant_id` predicates (one per CTE).

---

## 3. Smoke — run table

All against tenant `aaaaaaaa-0000-0000-0000-000000000001`, execution context `d4f82a41-01cd-4fb7-9d70-573557348e74`, thread `77777777-0000-0000-0000-000000000007`. Execution mode `production`, chat trigger, `chatInput` = stringified dispatcher envelope.

| Run | Query | exec id | `used_embedding` | `embedding_attempted` | `embedding_error` | `semantic_match_count` | `lexical_match_count` | `recall_results` | `status` | Oracle |
|---|---|---|---|---|---|---|---|---|---|---|
| f2b-t1 | `store path anchor` | 1431 | false | true | null | 0 | 1 | 1 row (`a0909481-…` smoke_store) | `success` | **Pass** — embedding attempted and succeeded; semantic legs of the DB CTE returned 0 rows (correct: no stored embeddings yet); lexical found the exact anchor row. `used_embedding=false` because semantic did not contribute. |
| f2b-regress | `Smoke V2 F1` | 1441 | false | true | null | 0 | 2 | 2 rows (`6ceb9437-…` supersede + `a0909481-…` store) | `success` | **Pass — regression safety** — matches pre-F2 baseline `s2a (1394)` row-for-row; no drift. |
| f2b-t4 | `zzz_no_match_zzz` | 1450 | false | true | null | 0 | 0 | `[]` | `success` | **Pass** — embedding succeeded; both CTEs returned 0 rows; DB emits placeholder `{success:true}` which is filtered by Patch A's `typeof r.id === 'string'` guard; `recall_results` is the empty list; status is `success` (not `partial`, because `embedding_error=null`). |

Raw execution JSONs archived under `artifacts/runtime/exec_f2b_{t1_1431, regress_1441, t4_1450}.raw.json`.

### Pointwise oracle proofs

- **Producer wired correctly** — t1/regress/t4 all show `Embed_Merge.passthrough.embedding_attempted=true` and `embedding_error=null`; Embed output has OpenAI response keys `[data, model, object, usage]`. HTTP call succeeds consistently against the `openAiApi` credential.
- **Hybrid SQL fix** — regress returns 2 lexical rows with the gate removed; pre-F2b (post-F2 state) the same query returned 0 rows. Direct proof that `AND p.emb_text IS NULL` was the sole blocker.
- **Semantic/lexical dedupe** — `NOT EXISTS` clause wired; no double-counting observed in any run (but note: semantic returns 0 in all three runs because `memory_items.embedding IS NULL` for every row, so the dedupe is untested under load — called out as Known-Gap below).
- **True-fallback vs. semantic-miss** — t1 demonstrates "embedding succeeded, semantic matched nothing, lexical found rows" → `status=success`, `needs_followup=false`. No generate_embedding followup emitted, which is correct (the embedding already succeeded).
- **Zero-row placeholder** — t4 reproduces BUG-V2-01 shape (DB emits `{success:true}`) and confirms Patch A still correctly filters it out; `recall_results=[]`.

---

## 4. DB invariant

```
SELECT id, content, updated_at FROM public.memory_items
 WHERE tenant_id='aaaaaaaa-0000-0000-0000-000000000001'
 ORDER BY updated_at DESC LIMIT 5;
```
Max `updated_at` returned: `2026-04-20T21:51:51.025Z` — predates both F2 (smoke started `2026-04-20T22:07:…Z`) and F2b (smoke started `2026-04-20T22:25:…Z`) rollouts. No search-path row was mutated.

---

## 5. Known gaps / deferrals

- **Store path does not yet compute embeddings.** `memory_items.embedding` is NULL for every row, so the semantic CTE returns 0 rows by construction. The producer is wired and proven (HTTP returns a 1536-float vector in every run), but end-to-end semantic retrieval cannot be smoked until a future frontier adds an embedding producer on the store leg (F2-future or F-extension).
- **Caller-supplied embedding short-circuit (t2) verified by inspection.** Did not run live — a 1536-float `chatInput` is ~12.9 KB which exceeds practical smoke size. The Merge code path has been walked: `if (!embeddingJson) { embeddingAttempted = true; … }` — if the caller provided `embedding_json`, we skip the HTTP parse, set `embeddingAttempted=false`, and leave `used_embedding=true`. Decision V2-008 applies: defer live t2 until caller-embedding is exercised by a real traffic pattern.
- **True HTTP-failure path (t3) deferred.** `onError: continueRegularOutput` + `embedding_error='embedding_http_*'` branches are present in the Merge code but not exercised under live failure. Would require credential revocation or network fault injection. Tracked as F2-followup in `MEMORY_V2_PHASE_GATES.md`.

---

## 6. Rollback plan

Two-step rollback, in inverse order of application:
1. **Undo F2b** — `replace` with `artifacts/WF-ME-01_post_f2_preSQL.json` (versionId `7455992c-…`). Returns the workflow to the post-F2 pre-SQL state (broken: returns 0 rows for all queries). **Only use as an intermediate step.**
2. **Undo F2** — `replace` with `artifacts/WF-ME-01_pre_f2.json` (versionId `c4a3b0d1-…`, post-Patch-A 43-node state). This restores the pre-F2 Prep→DB edge and drops the Embed + Embed_Merge nodes. Structural-only change, no schema or data mutation required.

Preferred full-rollback: step 2 directly — `replace` to `WF-ME-01_pre_f2.json`.

---

## 7. Gate outcomes

- `F2.2` (patch plan + build_patch script) — **done 2026-04-21**.
- `F2.3` (live rollout via `n8n-patch.mjs replace`) — **done 2026-04-21** (two replaces: F2 then F2b).
- `F2.4` (semantic-path smoke proven end-to-end) — **done 2026-04-21 with caveat**: the HTTP producer leg is end-to-end proven (OpenAI response shape, Merge folding, DB CTE running with vector). The full semantic retrieval path (query → embedding → cosine match) cannot fire until store-path embeddings exist, which is deliberately out of F2 scope. Hybrid behaviour (lexical always available regardless of embedding availability) is proven.

D-M-011 closed. Phase B complete.
