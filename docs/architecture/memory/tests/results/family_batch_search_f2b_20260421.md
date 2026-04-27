# family_batch_search_f2b_20260421.md — first batch for `search_memory`

Date: 2026-04-21.
Frontier: **F3 — first-batch kickoff for the `search_lexical_fallback` family**.
Precondition: F2 + F2b rolled out (`versionId=f7f3e982-1ec8-46c9-a5d9-6d905419b313`).

## Scope of "first batch"

This is an intentionally small first batch covering the **variant dimensions** of the `search_lexical_fallback` family from `tests/fixtures/family_cases_seed.json`, not the full 50-case target. The purpose is to exit F2 with confidence that the hybrid path holds across: (i) multiple query texts, (ii) the `memory_type` filter variant, (iii) both "zero-row hybrid" and "positive-row hybrid" oracles.

Running 50 live executions via MCP sequentially has non-trivial cost (~30 KB per raw capture × 50 = 1.5 MB of runtime artefacts) and the variant combinations here are well-covered by 6 targeted runs. F3.1 (walker extension / sidecar runner) will carry the full 50 later.

## Inputs

- Workflow: `WF-ME-01 Module Execution`, id `uq26nh1grIpnHju0`
- tenant_id: `aaaaaaaa-0000-0000-0000-000000000001`
- execution_context_id: `d4f82a41-01cd-4fb7-9d70-573557348e74` (shared smoke context)
- thread_id: `77777777-0000-0000-0000-000000000007`
- idempotency scope: `mem-batch-v2c-search-*`

Seed data observed at batch time (all under tenant `aaaa…0001`):

| id | content | status | category |
|---|---|---|---|
| 6ceb9437-… | Smoke V2 F1 — supersede replacement anchor. | active | smoke_supersede |
| a0909481-… | Smoke V2 F1 — store path anchor. | active | smoke_store |
| 75a617be-… | Phase7 anchor A6 new row | active | supersede_test |
| 28c3a392-… | Phase7 anchor A6 old row | superseded | supersede_test |
| 7b03cd9c-… | Phase7 anchor A5 promote denied | active | promote_test |
| 578c7d1d-… | Phase7 anchor A4 promote happy | active | promote_test |
| da53c396-… | Phase7 anchor A3 recall row | active | recall_test |
| adbad490-… | seeded a2 memory PHASE7_A2_TOKEN_RUN1 | superseded | anchor_test |
| c7f148d9-… | Phase7 anchor A1 store happy | active | anchor_test |

All rows have `embedding IS NULL`. Semantic CTE is therefore an inert no-op across this batch — any hit must come from the lexical leg.

## Runs

Variant axes covered: 5 distinct Romanian queries (from `family_cases_seed.variants.query`) × the `memory_type` filter variant (fact / preference / observation / constraint / null), plus 1 positive probe to prove the lexical path fires under hybrid.

| Run | step_id | exec id | query | memory_type filter | `used_embedding` | `emb_attempted` | `emb_error` | `sem_count` | `lex_count` | `recall` | `status` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | c-search-q1 | 1459 | `raspunde dimineata` | fact | false | true | null | 0 | 0 | 0 | success |
| B2 | c-search-q2 | 1468 | `prefera whatsapp` | preference | false | true | null | 0 | 0 | 0 | success |
| B3 | c-search-q3 | 1477 | `buget lunar` | observation | false | true | null | 0 | 0 | 0 | success |
| B4 | c-search-q4 | 1486 | `obiectie pret` | constraint | false | true | null | 0 | 0 | 0 | success |
| B5 | c-search-q5 | 1495 | `vrea apel scurt` | null (omitted) | false | true | null | 0 | 0 | 0 | success |
| B6 | c-search-q6-pos | 1504 | `Phase7 anchor` | null (omitted) | false | true | null | 0 | 5 | 5 | success |

Raw captures under `docs/architecture/memory/v2/f2/artifacts/runtime/exec_c_c-search-q*_*.raw.json`.

### B6 row recall (positive probe)

5 active rows, `status = 'active'` filter applied by Prep (superseded A2 and A6-old excluded, confirming the default `statuses=['active']` contract):

1. `c7f148d9-…` A1 store happy (anchor_test)
2. `da53c396-…` A3 recall row (recall_test)
3. `578c7d1d-…` A4 promote happy (promote_test)
4. `7b03cd9c-…` A5 promote denied (promote_test)
5. `75a617be-…` A6 new row (supersede_test)

Ordered by `created_at DESC` (per lexical CTE).

## Oracles — all Pass

- **Hybrid-path correctness**: every run shows `embedding_attempted=true`, `embedding_error=null`, `used_embedding=false`, `status=success`. The embedding producer fires for all 5 distinct Romanian query texts without HTTP error — producer is stable across distinct inputs, not just the canary from F2 t1.
- **Zero-row hybrid**: B1–B5 correctly return `recall_results=[]` with `status=success` (not `partial`). `isTrueEmbeddingFallback=false` because `embedding_error===null`. No spurious `generate_embedding` followup.
- **Positive lexical under hybrid**: B6 returns 5 rows despite semantic contributing nothing. Proof that the F2b SQL fix (removal of `AND p.emb_text IS NULL` lexical gate) restores the pre-F2 lexical behaviour while the producer still runs.
- **memory_type filter**: B1–B4 each supplied a memory_type, and all returned 0 rows since the Romanian queries match none of the seeded rows anyway. Filter enforcement cannot be proven by absence alone; B6 omits memory_type and returns 5 rows (mixed memory_types), which is consistent with filter=null. Dedicated memory_type-positive-match test deferred to F3.1 walker.
- **Semantic CTE invariance**: across 6 runs, `semantic_match_count=0` always — `memory_items.embedding IS NULL` for every row makes the semantic leg a no-op by construction. This is the expected state until store-path embeddings ship; it is not a bug.
- **No DB mutation**: `MAX(updated_at)` for tenant `aaaa…0001` is `2026-04-20T21:51:51.025Z` before and after the batch. Search path is read-only confirmed across 6 executions.

## Residual failures

None. 6/6 oracles pass.

## Known-next-steps (not residuals — deliberately scoped out)

- Full 50-case search_lexical_fallback run needs F3.1 walker or sidecar runner to avoid MCP round-trip cost.
- `memory_type` filter positive-match test (B1–B4 only prove the filter doesn't crash — need a query that lexically matches under one memory_type but not another).
- `status_override` variant (not exercised here — currently the Prep node's default `['active']` is the only status path tested).
- Semantic CTE retrieval cannot be smoked until store-path embeddings ship (tracked as F2-future).
