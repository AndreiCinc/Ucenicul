# F6A Local Results — Phase 7

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Phase: 7 — Local matrix
Harness: `docs/architecture/memory/v2/f6a/harness/f6a_local_runner.mjs`
Merge source: byte-faithful to live `ME_Memory_Store_Embed_Merge.parameters.jsCode` on `versionId=c07fe923-76eb-4901-b53b-14039536df55` (sha256 `4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc`).
Raw JSON output: `docs/architecture/memory/v2/f6a/harness/f6a_local_results.json`.
Run timestamp: 2026-04-23 (agent clock).

## Summary

| Block | Cases | PASS | FAIL |
|---|---|---|---|
| L1 — design-shape invariants | 5 | 5 | 0 |
| L2 — happy-path store with embedding | 5 | 5 | 0 |
| L3 — Merge purity / idempotency (5 pure + 5 ON CONFLICT) | 10 | 10 | 0 |
| L4 — semantic top-1 match (cosine) | 5 | 5 | 0 |
| L5 — lexical fallback preservation | 5 | 5 | 0 |
| L6 — failure behavior (graceful degradation) | 5 | 5 | 0 |
| L7 — non-target path preservation + `_error` short-circuit | 6 | 6 | 0 |
| **Total** | **41** | **41** | **0** |

Harness exit code: `0`. All 41 case oracles satisfied.

## Block-by-block evidence

### L1 — design-shape invariants (5/5 PASS)

For 5 prep + axis-aligned httpResp fixture pairs, the Merge output:

- had exactly the two top-level keys `__db` and `passthrough`;
- carried `__db.embedding_text` as a string parseable to a 1536-length array of finite numbers;
- preserved every Prep `passthrough.*` field (`action`) byte-identical;
- preserved every Prep `__db.*` field (`tenant_id`, `content`, etc.) byte-identical;
- set `passthrough.embedding_attempted: true` and `passthrough.embedding_error: null` on success.

### L2 — happy-path store with embedding (5/5 PASS)

Five axis vectors (`axisVector(5)…axisVector(9)`), each carried through Merge and surviving as a 1536-float JSON array with the correct axis bit set to `1`. `used_embedding=true`, `embedding_attempted=true`, `embedding_error=null` on every case.

### L3 — Merge purity + ON CONFLICT DO NOTHING (10/10 PASS)

- **L3.1–L3.5** (5/5) — Merge is a pure function of `{prep, httpResp}`. Two successive calls with identical inputs produced byte-identical outputs (JSON.stringify equality).
- **L3b.1–L3b.5** (5/5) — simulated `public.memory_items` table with `insertOnConflictDoNothing(idempotency_key)`:
  - first write `inserted=true`; row stored with embedding from Merge run 1;
  - replay with a *different* HTTP vector (second Merge run produced different `embedding_text`) returns `inserted=false`;
  - returned row's `embedding` is byte-identical to the first write — confirms `ON CONFLICT DO NOTHING` preserves first-written vector even if the second call would have produced a different one;
  - table has exactly 1 row after replay.

### L4 — semantic benefit (5/5 PASS)

Seeded an in-memory "table" with 5 rows, each stored via Merge with an orthogonal axis vector (`axisVector(10..14)`). For each of 5 query vectors aligned to one axis, cosine ranking returned the matching row at position 0, with similarity `≥ 0.999`. Counterfactual confirmed by the harness's own data path — if any of these rows had landed with `embedding=NULL` (pre-F6A behavior), the semantic CTE filter `WHERE mi.embedding IS NOT NULL` would exclude it and the query would return empty.

### L5 — lexical fallback preservation (5/5 PASS)

Five content/query pairs using rare tokens (`zzz_e4_token_alpha`, `zzz_beta_marker`, `gamma_unique_xyz`, `delta anchor L5.4`, `epsilon phrase token`). Lexical CTE (substring match on `content`) returned the expected seed row for every query. Dedupe (union-by-id `Map`) did not produce duplicates when semantic and lexical CTEs overlapped. Proves F2b's "lexical CTE must still fire irrespective of embedding presence" contract is unbroken by F6A.

### L6 — failure behavior (5/5 PASS)

Five failure shapes exercised, each producing the designed `embedding_error` string pattern and a downstream-SQL-simulated NULL embedding:

| Case | HTTP shape | embedding_error | Stored embedding | `used_embedding` |
|---|---|---|---|---|
| L6.1 | `{statusCode:429, error:{message:"rate limited"}}` | `embedding_http_error: rate limited` | NULL | false |
| L6.2 | `{statusCode:500}` | `embedding_http_500` | NULL | false |
| L6.3 | `{data:[]}` (malformed 200) | `embedding_response_unusable` | NULL | false |
| L6.4 | `{data:[{embedding:<1200-float array>}]}` (wrong dim) | `embedding_response_unusable` | NULL | false |
| L6.5 | `{error:{message:"connect ECONNREFUSED"}}` (exception shape) | `embedding_http_error: connect ECONNREFUSED` | NULL | false |

On every case `embedding_attempted=true` and `__db.embedding_text=null`, matching the contract table in `F6A_DESIGN_FREEZE.md §Behavioural contract table`.

### L7 — non-target path preservation + `_error` short-circuit (6/6 PASS)

- **L7.1–L7.5** — topology proof on `artifacts/WF-ME-01_post_f6a.json`: the set of nodes feeding `ME_Memory_Store_Embed` is exactly `{ ME_Memory_Store_Prep }`. No other action family (`search_memory`, `recall_memory`, `promote_memory`, `supersede_memory`, RA envelope) can enter the Merge node. Their code paths are unchanged from pre-F6A (proven by the 44-node byte-identical hash in Phase 6 evidence `b29acb6e0c08e30d48b7fb6475db20a24ca1ed643f3ef4696c256c5314ef4222`).
- **L7.6** — a `{_error:true, …}` Prep output is passed through Merge verbatim (`===` identity preserved), with no HTTP response processing attempted and `_error=true` flag kept intact, per the first `if` in the Merge jsCode.

## Anomaly classification

None observed. All 41 case oracles passed on first run. No retries, no manual adjustments.

The only notable sub-threshold observation is documentation-level:

- **DOC-DRIFT-1** — `F6A_DESIGN_FREEZE.md §Q5 →` "Differences vs `ME_Memory_Search_Embed_Merge`" lists "Removed `usedEmbedding` local" as a store-lane simplification. Actual live jsCode retains the `used_embedding` / `usedEmbedding` shape — hash byte-match with the staged payload (sha256 `4f546fe2` on both). The harness mirrors the live behavior (which is the intended superset — the extra `passthrough.used_embedding` field is harmless downstream). This doc-drift is logged for Phase 9 reconciliation and does not affect runtime correctness.

## Files produced in Phase 7

- `docs/architecture/memory/v2/f6a/harness/f6a_local_runner.mjs` — 41-case harness (pure JS, no external deps).
- `docs/architecture/memory/v2/f6a/harness/f6a_local_results.json` — raw per-case result JSON.
- `docs/architecture/memory/v2/f6a/harness/merge_live_jscode.txt` — verbatim dump of the live Merge jsCode (reference).
- `docs/architecture/memory/v2/f6a/F6A_LOCAL_RESULTS.md` — this document.

## Phase 7 verdict

**GREEN.** 41/41 local cases PASS. Proceed to Phase 8 live E2E matrix.
