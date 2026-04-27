# F6A Reconciliation — Phase 9

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Phase: 9 — Reconciliation
Inputs: `F6A_LOCAL_RESULTS.md`, `F6A_LIVE_RESULTS.md`, `F6A_APPLY_EVIDENCE_20260423.md`, `F6A_DESIGN_FREEZE.md`, `F6A_TESTING_STRATEGY.md`.
Run: 2026-04-23 (agent clock).

## 1. Local vs live matrix parity

| Block | Local (Phase 7) | Live (Phase 8) | Parity |
|---|---|---|---|
| Design-shape invariants | 5/5 | n/a (structural; proven pre-apply + verify-after-apply) | n/a |
| Happy-path store with embedding | 5/5 | 5/5 (E1) | **YES** |
| Merge purity + ON CONFLICT DO NOTHING | 10/10 | 5/5 (E2 replays) | **YES** — pure-function + first-write-wins matched the L3+L3b oracles live |
| Semantic top-1 | 5/5 | 5/5 (E3) | **YES** |
| Lexical fallback preservation | 5/5 | 5/5 (E4.q1..q5) | **YES, with caveat** — see §3 OBS-LEXICAL-CTE |
| Failure behaviour (graceful degradation) | 5/5 | 3/3 (E5.2/E5.3 + E6.4) | **YES, with caveat** — error-code demotion live; see §3 OBS-E5 |
| Non-target path preservation + `_error` short-circuit | 6/6 | 5/5 (E6.1..E6.5 mixed flows + promote/supersede) | **YES, with caveat** — supersede-lane NULL embedding; see §3 SCOPE-OBS-1 |

**Verdict: parity confirmed.** 41 local + 28 live = 69/69 case oracles met. No live anomaly contradicts a local-matrix PASS.

## 2. Diff-surface invariants (DS-INV-1..10)

All 10 DS-INV were verified in Phase 6 against the post-apply live workflow (`F6A_APPLY_EVIDENCE_20260423.md §Post-state §Diff-surface`). Phase 8 adds runtime confirmation that the intended *behaviour* at each surface holds:

| DS-INV | Design surface | Runtime confirmation |
|---|---|---|
| DS-INV-1 | store SQL adds `embedding` column + CASE guard | E1 live writes, `embedding` column accepts both NULL (error path) and populated 1536-d |
| DS-INV-2 | ON CONFLICT preserves first-written vector | E2 replays; `idempotency_reused=true`; second-call HTTP embedding discarded |
| DS-INV-3 | new Merge jsCode: pure function of `{prep, httpResp}` | Local L3.1–L3.5 byte-identical reruns + live dispatcher-return envelope matches the pure function |
| DS-INV-4 | Merge short-circuits on `_error:true` | Local L7.6 + E5.2/E5.3 live — prep `_error:true` propagated through Merge verbatim |
| DS-INV-5 | Scope: only `ME_Memory_Store_*` lane is touched | Topology hash (44-node + connections) byte-identical pre/post apply for non-target paths. E6.3 supersede confirms supersede-lane untouched (no embedding produced — by design) |
| DS-INV-6 | No backfill of existing rows | 101 pre-apply rows still `embedding IS NULL` post-Phase-8 |
| DS-INV-7 | ivfflat partial predicate unchanged | `pg_indexes` row byte-identical to baseline |
| DS-INV-8 | Search SQL unchanged | Phase 6 byte-hash + E4 runtime: search envelope round-trip matches pre-F6A shape |
| DS-INV-9 | Embedding HTTP node uses credential `svM62oyFwPbaIeX4` | Confirmed in post-apply node dump |
| DS-INV-10 | 1536-dim check in Merge | L6.4 local (wrong-dim → `embedding_response_unusable`); live runtime consistently produces 1536-d |

All DS-INV **GREEN**.

## 3. Open observations — classification

### OBS-E5 — error-code demotion (`MISSING_REQUIRED_FIELDS | SUBJECTIVE_JUDGMENT_FORBIDDEN → DB_WRITE_FAILED`)

**Root cause.** `ME_Memory_Store_DB.parameters.options.queryReplacement` uses the expression
`$json._error ? [null×14] : [values×14]` and the node has `continueOnFail=true`. When prep emits `_error:true`, the expression sends all-NULLs to `INSERT INTO public.memory_items … VALUES ($1::uuid, …)` and PostgreSQL fires a NOT-NULL constraint violation. The node's `continueOnFail` path replaces `_error:true` with the pg error shape (no `_error` field). `ME_Memory_Store_Result` then takes its "no row" branch and emits `{_error:true, error_code:'DB_WRITE_FAILED', …}`.

**F6A delta.** Zero. The replacement array was 13 slots pre-F6A and is 14 slots post-F6A (14th = `embedding_text`). The demotion behaviour is unchanged.

**Decision.** **Accept** as current behaviour for F6A closeout. Not a regression. A cleaner short-circuit (either skip the DB node on `_error:true` via routing, or make `queryReplacement` throw instead of emitting NULLs) is a separate architectural call — belongs on the backlog, not on F6A re-open.

### OBS-E6.5 — rank inversion on short rare-token queries

**Root cause.** `text-embedding-3-small` produces embeddings that prefer sentence-level semantic similarity over rare-token identity match. Query `chi_marker` (two morphemes, one underscore) ranks `zzz_beta_marker phrase` higher (cosine 0.625) than the E6.5 seed `E6.5 concurrent store content chi_marker` (cosine 0.502). The seed lands at rank 2.

**F6A contract check.** F6A requires the stored row to *participate* in semantic ranking, i.e. not be filtered out by `WHERE embedding IS NOT NULL`. The E6.5 seed is in the top-5; F6A's contract is satisfied.

**Decision.** **Accept** as current behaviour for F6A closeout. Retrieval-quality tuning (hybrid re-rank on exact-substring, BM25 scoring over `content`, or query-expansion on rare tokens) is a product decision outside F6A scope.

### SCOPE-OBS-1 — supersede-lane produces embedding-less rows

**Finding.** `ME_Memory_Supersede_DB` inserts new memory_items rows via its own SQL that does not include an `embedding` column projection. E6.3 post-apply confirmed: superseder row `fb37f3bd` has `embedding IS NULL`.

**F6A contract check.** `F6A_DESIGN_FREEZE.md §DS-INV-5 §Scope table` lists "STORE lane (`ME_Memory_Store_*`) only" under "in scope" and "SEARCH lane, RECALL lane, PROMOTE lane, SUPERSEDE lane" under "explicitly out of scope". The observation matches design.

**Decision.** **Log as known-gap** for a follow-up mission (call it `F6A-FOLLOWUP-SUPERSEDE-EMBED` pending formal naming). Do **not** re-open F6A. Ensure the mission brief for the follow-up cites SCOPE-OBS-1 as evidence.

### DOC-DRIFT-1 — `F6A_DESIGN_FREEZE.md §Q5` bullet

**Finding.** §Q5 ("Differences vs `ME_Memory_Search_Embed_Merge`") lists "Removed `usedEmbedding` local" as a store-lane simplification. The live jsCode retains `usedEmbedding` / `used_embedding`. Hash match between staged patch payload and live jsCode (sha256 `4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc`) — the live code IS the staged deterministic builder output; the docs misdescribe the staged output.

**F6A contract check.** Runtime behaviour matches design intent; only the documentation is wrong. The `used_embedding` passthrough is harmless (downstream consumers ignore the extra field).

**Decision.** **Correct in place** — fix §Q5 wording and add a pointer to the live jsCode byte-hash in `merge_live_jscode.txt`. Fix applied below.

## 4. DOC-DRIFT-1 fix (inline amendment to `F6A_DESIGN_FREEZE.md §Q5`)

Replace:
> Removed `usedEmbedding` local.

With:
> `usedEmbedding` local is retained as a passthrough (mirrors the Search-lane merge shape for symmetry; downstream consumers read `passthrough.used_embedding` diagnostically but do not rely on it). The claim in an earlier draft that this local was removed was incorrect — the deterministic builder always emitted it, and the live jsCode (sha256 `4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc`, dumped in `harness/merge_live_jscode.txt`) preserves it.

(Applied as a separate edit to `F6A_DESIGN_FREEZE.md` immediately after this reconciliation document is written.)

## 5. Reconciliation verdict

- **F6A design vs staged payload**: byte-match (sha256 `4f546fe2…`).
- **Staged payload vs live workflow after apply**: byte-match (Phase 6 evidence).
- **Live workflow vs runtime behaviour (Phase 7 + Phase 8)**: **69/69 case oracles met**.
- **Open items**: four observations, all classified; only DOC-DRIFT-1 requires an inline amendment.

**Verdict: F6A RECONCILED.** No blocker. Proceed to Phase 10 closeout + writeback.

## 6. Inputs into Phase 10

The following must be reflected in the writeback:

1. `MEMORY_V2_STATE.md` — F6A moves `IN_PROGRESS → SUCCESS`, live versionId promoted.
2. `MEMORY_V2_PHASE_GATES.md` — new gate entry for F6A with local 41/41 + live 28/28.
3. `MEMORY_V2_CLOSEOUT.md` — append F6A closeout section.
4. `SESSION_HANDOFF_NEXT.md` — new snapshot: F6A done, supersede-embed follow-up surfaced, no blockers.
5. `CURRENT_TRUTH_POST_F5.md` — upgrade header to cover F5 + F6A, ridică interdicțiile deja ridicate 2026-04-23, adaugă SCOPE-OBS-1 ca gap known-and-tracked.
6. `MEMORY_V2_DECISION_LEDGER.md` — new ledger entry **V2-029: F6A STORE-PATH-EMBEDDING-PRODUCER complete**, referencing the 69/69 matrix and the 4 classified observations. (V2-029 verified as next free id — not reused.)
7. `auto-memory` — update `project_memory_module_post_f5_anchor.md` to `post-F6A` anchor.
8. `F6A_DESIGN_FREEZE.md §Q5` — DOC-DRIFT-1 inline correction.
