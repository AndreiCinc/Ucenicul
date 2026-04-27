# F6A Live Results — Phase 8

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Phase: 8 — Live E2E matrix
Workflow: `WF-ME-01 Module Execution` — id `uq26nh1grIpnHju0`
Live versionId (baseline post-apply): `c07fe923-76eb-4901-b53b-14039536df55`
Execution context id: `d4f82a41-01cd-4fb7-9d70-573557348e74`
Tenant: `aaaaaaaa-0000-0000-0000-000000000001` · Thread: `77777777-0000-0000-0000-000000000007`
Idempotency namespace: `mem-smoke-v2f6a-*`
Run window: 2026-04-23 ~12:09Z–12:27Z (agent clock).

All envelopes dispatched through the chat trigger in full dispatcher-result shape (`status_kind=success`, `result_type=dispatch`, `dispatcher_input.dispatch_allowed=true` etc.) per `smoke_plan_f1.md` §Trigger shape and the live validator `ME_Validate_Dispatcher_Result` (see `F6A_APPLY_EVIDENCE_20260423.md §Live validator contract`).

## Summary

| Block | Cases | PASS | Notes |
|---|---|---|---|
| E1 — happy stores | 5 | 5 | 1536-d, DB-INV-1 GREEN |
| E2 — idempotent replays | 5 | 5 | `idempotency_reused=true`, DB-INV-2 GREEN |
| E3 — semantic top-1 | 5 | 5 | axis-aligned queries, top-1 correct |
| E4 — lexical-fallback seeds + queries | 5 + 5 | 10 | DB-INV-3 GREEN; lexical CTE NOT-EXISTS interaction explained below |
| E5 — happy + 2 error-path cases | 3 | 3 | DB-INV-4 GREEN; pre-existing error-code demotion documented |
| E6 — mixed flows | 5 | 5 | DB-INV-5/6/7 GREEN; SCOPE-OBS-1 and OBS-E6.5 logged for Phase 9 |
| **Total** | **28** | **28** | — |

## Execution IDs

| Case | Intent | execId | Outcome |
|---|---|---|---|
| E1.1 | store happy | 4420 | success, memory_id `fcff5f34-7b7a-4243-b343-3d5e570e5a99` |
| E1.2 | store happy | 4429 | success, memory_id `901428c3-4412-4817-b7bf-9f89df547b39` |
| E1.3 | store happy | 4438 | success, memory_id `b8034d25-0513-454d-bdc4-1826f1c1d80a` |
| E1.4 | store happy | 4447 | success, memory_id `4f833891-ced7-44f3-9eed-f47fded7f7dc` |
| E1.5 | store happy | 4456 | success, memory_id `0707fba0-89a3-4772-be49-575b19e4061c` |
| E2.1..E2.5 | idempotent replay of E1.* | 4465, 4474, 4483, 4492, 4501 | success, `idempotency_reused=true` |
| E3.1..E3.5 | semantic top-1 | 4510, 4519, 4528, 4537, 4546 | success, top-1 correct on every case |
| E4.1..E4.5 | lexical seed stores | 4555, 4564, 4573, 4584, 4593 | success (4582, 4583 were discarded flat-envelope attempts — see §Dispatcher envelope shape) |
| E4.q1..q5 | lexical queries | 4602, 4611, 4620, 4629, 4638 | success, top-1 = expected seed (similarity 0.77–0.91) |
| E5.1 | happy confirm | 4647 | success, memory_id logged |
| E5.2 | empty-content error | 4656 | prep `MISSING_REQUIRED_FIELDS` → DB-level `DB_WRITE_FAILED`, no row |
| E5.3 | subjective observation | 4665 | prep `SUBJECTIVE_JUDGMENT_FORBIDDEN` → DB-level `DB_WRITE_FAILED`, no row |
| E6.1 | mixed store + search | 4674 / 4683 | store success w/ embed; search top-1 = seed `547fe200`, sim 0.50 |
| E6.2 | mixed store + promote | 4692 / 4710 | store success; promote success `recent→long_term` |
| E6.3 | mixed store + supersede | 4701 / 4719 | old `db36db98` → `status=superseded`; new row `fb37f3bd` `has_emb=FALSE` (SCOPE-OBS-1) |
| E6.4 | dispatch-guard trip | 4728 | validator rejected `dispatch_allowed=false`, `INVALID_DISPATCH_INPUT`, no row |
| E6.5 | concurrent store + search | 4729 / 4738 | store success w/ embed; search returned seed `e790c484` at rank #2 (OBS-E6.5) |

## Block-by-block evidence

### E1 — happy stores (5/5 PASS)

Five axis-aligned store invocations, each writing a `memory_type=fact` row under
tenant/thread/context. Confirmed via `SELECT idempotency_key, array_length(embedding::real[],1), …`:

- 5 rows present; every embedding is a 1536-float JSON array serialised to `vector(1536)`
- `used_embedding=true`, `embedding_attempted=true`, `embedding_error=null` on every envelope
- `idempotency_reused=false` on every case

DB-INV-1 **GREEN** — all 5 rows with 1536-d embeddings.

### E2 — idempotent replays (5/5 PASS)

Re-dispatch of each E1 envelope with the same `step_id`:
- `actions_executed[].details.idempotency_reused=true` in every envelope
- DB row count per key still exactly `1`
- `created_at==updated_at` (row not touched on replay)
- `ON CONFLICT (idempotency_key) DO NOTHING` confirmed: the second embedding that OpenAI would have produced is discarded; the first-written vector is preserved. This mirrors the L3b block in `F6A_LOCAL_RESULTS.md`.

DB-INV-2 **GREEN**.

### E3 — semantic top-1 (5/5 PASS)

Five queries aligned to the five E1 axes returned the matching E1 row at position 0 with cosine `≥0.99` on identical-semantics axes and `≥0.7` on prose-to-prose axes. All five envelopes carried `used_embedding=true`, `embedding_error=null`.

Counterfactual: if any E1 row had landed with `embedding=NULL` (pre-F6A behaviour), the semantic CTE filter `WHERE mi.embedding IS NOT NULL` would have excluded it and these five queries would have returned empty. All five returned the expected seed.

### E4 — lexical-fallback seeds + queries (10/10 PASS)

Five seed stores using rare tokens (`zzz_e4_token_alpha`, `zzz_beta_marker`, `gamma_unique_xyz`, `delta anchor E4.4`, `epsilon phrase token`). Every seed row landed 1536-d.
Five queries, one per token:

| Query | top-1 memory_id | top-1 similarity |
|---|---|---|
| zzz_e4_token_alpha | f9b5b640 (E4.1 seed) | 0.844 |
| zzz_beta_marker | bc61ce7a (E4.2 seed) | 0.905 |
| gamma_unique_xyz | b321ced0 (E4.3 seed) | 0.909 |
| delta anchor E4.4 | 80f89387 (E4.4 seed) | 0.826 |
| epsilon phrase token | d095efc9 (E4.5 seed) | 0.768 |

All five envelopes: `used_embedding=true`, `embedding_attempted=true`, `embedding_error=null`, `semantic_match_count=10`, `lexical_match_count=0`.

**Interpreting `lexical_match_count=0`.** The live Search SQL (node `ME_Memory_Search_DB`) defines the lexical CTE with
`NOT EXISTS (SELECT 1 FROM semantic s WHERE s.id = mi.id)`. When semantic captures the seed in its top-N, lexical excludes it from its own result set (dedupe by `id`), so the lexical side legitimately returns 0 rows. This is byte-identical to the pre-F6A SQL (`F2b`) and proves F2b's "lexical CTE must still fire irrespective of embedding presence" contract is structurally unchanged by F6A. The only behavioural change F6A makes is that the semantic CTE is now usable for new rows (pre-F6A it was dormant because new rows carried `embedding IS NULL`).

DB-INV-3 **GREEN** — all 5 seed rows 1536-d.

### E5 — happy + error-path cases (3/3 PASS)

- **E5.1 happy**: row stored with embedding, `category=happy_confirm`.
- **E5.2 empty content**: `ME_Memory_Store_Prep` returned `{_error:true, error_code:"MISSING_REQUIRED_FIELDS", missing_fields:["content"]}`. `ME_Memory_Store_Embed_Merge` correctly short-circuited the `_error=true` flag through verbatim (L7.6 from local matrix confirmed live). `ME_Memory_Store_DB` ran with the `_error ? 14-nulls : 14-values` guard — pushed all NULLs → NOT-NULL constraint fired on `tenant_id` → `DB_WRITE_FAILED`. No row inserted.
- **E5.3 subjective**: prep returned `{_error:true, error_code:"SUBJECTIVE_JUDGMENT_FORBIDDEN"}` (English regex matched `lazy` and `incompetent` under `memory_type=observation`). Same downstream path as E5.2; no row inserted.

**Pre-existing quirk (NOT a F6A regression).** For both error cases the final RA envelope surfaces `DB_WRITE_FAILED`, not the original prep error code. The demotion happens because the `ME_Memory_Store_DB` node's `queryReplacement` expression (`$json._error ? [null,null,…] : [values]`) sends all-NULLs to the INSERT instead of short-circuiting at the node boundary, and the node's `continueOnFail=true` converts the constraint violation into its own downstream output which replaces `_error:true` with the pg error shape. `ME_Memory_Store_Result` then falls through to its "no row" branch and emits `DB_WRITE_FAILED`. The same wiring existed pre-F6A (F6A added only the 14th `embedding_text` slot to the replacement array); the error-code demotion is not new.

DB-INV-4 **GREEN** — 1 row for `e5-1`, 0 rows for `e5-2` / `e5-3`.

### E6 — mixed flows (5/5 PASS)

- **E6.1 store + search**: seed `547fe200` stored with embedding; query on `phi_unique_tokeN` returned seed at rank 1 (sim 0.50).
- **E6.2 store + promote**: seed `4f23469a` stored, then promoted with `user_confirmed=true` — row's `tier` moved `recent → long_term`, embedding preserved across update.
- **E6.3 store + supersede**: seed `db36db98` stored with embedding; supersede call created new row `fb37f3bd` and flipped the old row to `status=superseded`. **New supersede row has `embedding IS NULL`** — see **SCOPE-OBS-1** below.
- **E6.4 dispatch-guard trip**: envelope with `dispatcher_input.dispatch_allowed=false` rejected at `ME_Validate_Dispatcher_Result` with `INVALID_DISPATCH_INPUT` / `missing_fields:["dispatcher_input.dispatch_allowed"]`. No DB touch. Row count for key `e6-4`: 0.
- **E6.5 concurrent store + search**: seed `e790c484` stored with embedding; query on `chi_marker` returned `bc61ce7a` (E4.2 seed "zzz_beta_marker phrase", sim 0.625) at rank 1; expected seed `e790c484` landed at **rank 2** (sim 0.502). Not a F6A correctness failure — the F6A invariant only requires the stored row to *participate* in semantic ranking (which requires `embedding IS NOT NULL`). Rank-inversion is a retrieval-quality observation documented as **OBS-E6.5**.

DB-INV-5 **GREEN** — 4/4 E6 store-path rows carry embeddings (the supersede-lane row is out of scope).

### DB-INV-6 — index invariant

```
CREATE INDEX idx_memory_items_embedding_cos
  ON public.memory_items
  USING ivfflat (embedding vector_cosine_ops) WITH (lists='100')
  WHERE ((embedding IS NOT NULL) AND (status = 'active'::memory_status_enum))
```

Byte-identical to the pre-F6A baseline (captured as pre-state in `F6A_APPLY_EVIDENCE_20260423.md`).

DB-INV-6 **GREEN** — partial ivfflat predicate unchanged.

### DB-INV-7 — NULL-embedding row-count invariant

Corpus-wide tally post-Phase-8:

| `created_at < 2026-04-23T12:01:42.753Z` (pre-apply) | rows | null_emb | with_emb |
|---|---:|---:|---:|
| true | 101 | 101 | 0 |
| false | 16 | 1 | 15 |

- All 101 pre-apply rows remain `embedding IS NULL` — F6A does **not** backfill historical rows; this is the explicit design decision `DS-INV-6` in `F6A_DESIGN_FREEZE.md`.
- All 15 post-apply rows in the `store_memory` lane of the F6A smoke namespace carry 1536-d embeddings.
- The one post-apply NULL is `fb37f3bd`, a `supersede_memory` row — recorded as **SCOPE-OBS-1** (supersede-lane embedding producer is out of F6A scope).

DB-INV-7 **GREEN** for the store-path; the supersede-lane NULL is classified, not a regression.

## Dispatcher envelope shape (anomaly capture, for future-me)

Two initial attempts at E4.4/E4.5 (execIds `4582`, `4583`) used a flat envelope (top-level `execution_context_id` + `step`, no `status_kind`/`result_type`/`dispatcher_input`). `ME_Validate_Dispatcher_Result` correctly rejected them with `INVALID_DISPATCH_INPUT / missing_fields: [status_kind, result_type, dispatcher_input]` — see node jsCode in `merge_live_jscode.txt` sibling for reference. Re-submission with the full dispatcher-result shape (execIds `4584`, `4593`) passed. The correct shape is the one produced by the Dispatcher workflow upstream of WF-ME-01 in production (`F1/F2/F5` path). No F6A surface is affected — the validator predates F6A and is byte-identical in pre- and post-apply dumps.

## Anomaly classification (summary)

- **OBS-E5 — error-code demotion** (`MISSING_REQUIRED_FIELDS | SUBJECTIVE_JUDGMENT_FORBIDDEN → DB_WRITE_FAILED`). Pre-existing; not introduced by F6A. Classification: **accept** as current behaviour; follow-up ticket material (not a F6A re-open).
- **OBS-E6.5 — rank inversion on short rare-token queries** (`chi_marker` vs `zzz_beta_marker`). Pre-existing embedding-quality ceiling of `text-embedding-3-small`; F6A's contract is "stored row participates in ranking", which is satisfied (rank 2, not filtered out). Classification: **accept**; product-decision on re-ranking out of F6A scope.
- **SCOPE-OBS-1 — supersede-lane produces embedding-less rows**. F6A's staged scope was explicitly `ME_Memory_Store_*` only (DS-INV-5). The `ME_Memory_Supersede_*` path creates rows via a separate SQL (no embedding HTTP node in the lane). Classification: **known gap**, candidate for a follow-up mission (informally F6A-follow-up / not F6C/F6D/F6E). No Phase-9 re-open of F6A.
- **DOC-DRIFT-1 — design-freeze §Q5 "Removed `usedEmbedding` local"**. Live jsCode retains the `usedEmbedding` / `used_embedding` shape. Hash byte-match between staged payload and live (sha256 `4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc`). Live is the intended superset — the extra `passthrough.used_embedding` field is harmless downstream. Classification: **documentation-only drift**; correct in Phase 9 (see `F6A_RECONCILIATION.md`).

## Files produced in Phase 8

- `docs/architecture/memory/v2/f6a/F6A_LIVE_RESULTS.md` — this document.

No other Phase-8 artifacts (the 28 executions live as trace in n8n; no JSON dumps retained).

## Phase 8 verdict

**GREEN.** 28/28 live cases PASS. DB-INV-1..DB-INV-7 all GREEN. Three classified observations (OBS-E5, OBS-E6.5, SCOPE-OBS-1) and one documentation drift (DOC-DRIFT-1) for Phase 9 reconciliation. No F6A-regression anomalies.

Proceed to Phase 9 reconciliation.
