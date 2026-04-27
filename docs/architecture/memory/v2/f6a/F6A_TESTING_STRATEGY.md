# F6A Testing Strategy

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Frozen: 2026-04-23

Test philosophy (pack `05_TEST_STRATEGY_F6A.md`): mission is DONE only when **semantic retrieval behavior improves provably without regressing existing paths**. Row-store-success alone is not sufficient.

Test surface split:

- **Local harness** — deterministic JS oracle mimicking the Embed_Merge jsCode + Store_DB SQL shape, run via Node without touching n8n. Mirrors the approach used by V2-OBS local harness (`ra_logic_js.mjs`).
- **Live E2E** — triggered via `mcp__f2e8be41-…__execute_workflow` against live `WF-ME-01` post-apply; DB verified via `mcp__postgres__execute_sql` (SELECT-only).

Tenant scope for all tests: `aaaaaaaa-0000-0000-0000-000000000001`.
Shared execution_context_id: `d4f82a41-01cd-4fb7-9d70-573557348e74` (same as F1/F2/F5 smoke context).
Idempotency-key namespace: `mem-smoke-v2f6a-*` (L* for local, E* for E2E; distinct from F1/F5 namespaces).

---

## Local harness (`F6A_LOCAL_HARNESS`)

Location: `docs/architecture/memory/v2/f6a/harness/f6a_local_runner.mjs` (Phase 3 output).

The harness reproduces the jsCode of `ME_Memory_Store_Embed_Merge` as a pure function `mergeStep({ prep, httpResp })` and validates output shape against an oracle. It **does not** call the Embed node's HTTP endpoint — local runs use fixture HTTP responses.

### L1 — design-shape invariants

Verify that for every case in the L2..L7 matrix, the output of `mergeStep` conforms to:
- top-level keys exactly `{ __db, passthrough }` (or the `_error=true` passthrough shape when Prep errors);
- `__db.embedding_text` is either `null` or a string parseable as a 1536-element JSON array of finite numbers;
- `passthrough.embedding_attempted` is boolean;
- `passthrough.embedding_error` is either `null` or a non-empty string;
- All pre-existing `passthrough.*` fields from Prep are preserved.

### L2 — happy-path store with embedding (5 cases)

Fixtures: 5 Prep outputs with valid content + 5 synthetic HTTP responses `{data: [{embedding: <1536-float array>}]}`.

Oracle: `embedding_text` is a 1536-float JSON array string; `embedding_attempted=true`; `embedding_error=null`.

### L3 — replay / idempotency (5 cases)

For each L2 case, feed `mergeStep` twice in a row with different HTTP fixture responses (first response valid, second response different valid values). Oracle:
- Both runs produce valid `embedding_text`.
- The Merge function is pure — two successive calls with identical `prep` + identical `httpResp` produce byte-identical outputs.
- (No caching assertion — the workflow does not cache; the pure-function guarantee is what matters.)

Simulated DB replay semantics are unit-tested separately in L3b:
- Fixture SQL: replay of identical `idempotency_key` against a mock table with one pre-existing row → `ON CONFLICT DO NOTHING` preserves the pre-existing row.
- 5 cases with pre-existing row states: (a) pre-existing with non-null embedding + replay with valid new embedding → row unchanged; (b) pre-existing NULL embedding + replay with valid embedding → row unchanged (embedding stays NULL); (c)-(e) mirror with different payload variations.

### L4 — search semantic benefit (5 cases)

Fixture: 5 rows inserted via the F6A path with deterministic fake embeddings (unit vectors along distinct axes). Search query produces a query-embedding aligned with one of the 5 fixture axes → the matching row is top-ranked by cosine similarity.

Oracle: executed against a local pgvector-emulating function that computes cosine distance over the 5 fixture vectors. The top-1 result matches the expected axis row for each of the 5 queries. This proves the round-trip Merge → SQL → pgvector operator contract is coherent with the 1536-dim vector representation.

Pre-frontier counterfactual (documented, not executed): the same 5 rows inserted via pre-F6A Store_DB would carry `embedding=NULL`, the semantic CTE in Search_DB would filter them out (`WHERE mi.embedding IS NOT NULL`), and the 5 queries would return 0 matches. This is the "before/after" oracle required by pack 05 §L4.

### L5 — lexical fallback preservation (5 cases)

Fixture: 5 Search_DB payloads where the caller's query is purely lexical (content substring match). With rows carrying F6A embeddings in place:
- lexical CTE must still fire (F2b removed the `emb_text IS NULL` gate);
- dedupe (`NOT EXISTS`) must still work between semantic and lexical;
- lexical-only matches must still appear in the final `recall_results`.

Oracle: each of 5 cases produces the expected lexical-hit set identical to pre-F6A behavior.

### L6 — failure behavior (5 cases)

Fixtures: 5 failure shapes — (a) HTTP 429 (`{statusCode: 429, error: {…}}`), (b) HTTP 500 (`{statusCode: 500}`), (c) malformed 200 (`{data: []}`), (d) 1200-dim response (wrong length), (e) complete exception (`{error: {message: "connect ECONNREFUSED"}}`).

Oracle:
- (a), (b): `embedding_error` starts with `embedding_http_` and includes the status code.
- (c), (d): `embedding_error === 'embedding_response_unusable'`.
- (e): `embedding_error` starts with `embedding_http_error: `.
- In every case: `__db.embedding_text === null`; `passthrough.embedding_attempted === true`.
- Subsequent SQL simulation: row is inserted with `embedding=NULL`; `store_memory` result is `success`, not `failed`.

### L7 — non-target path preservation (6 cases)

Fixtures: one representative payload per non-target action family — `search_memory`, `recall_memory`, `promote_memory`, `supersede_memory`, `RA envelope`, and `store_memory` over pre-F6A Prep output shape (negative — old Prep output still works). For each:
- The non-store flow does not pass through the new Embed/Merge nodes (connection check).
- The non-store response envelopes are unchanged (field-by-field comparison against a pre-F6A fixture).

---

## Live E2E matrix (`F6A_E2E`)

All cases run against live `WF-ME-01` at post-F6A `versionId`. Execution IDs and raw JSONs captured under `docs/architecture/memory/v2/f6a/artifacts/runtime/`.

### E1 — store happy path (5 cases)

| Case | content | memory_type | category | Oracle |
|---|---|---|---|---|
| E1.1 | "Proiectul F6A introduce embedding producer pentru store-lane." | fact | store_lane | row inserted, `embedding IS NOT NULL`, `vector_dims(embedding)=1536`, `passthrough.embedding_attempted=true`, `passthrough.embedding_error IS NULL` |
| E1.2 | "Semantic retrieval cannot return rows without store-path embedding." | observation | memory_design | same |
| E1.3 | "ivfflat index is partial on embedding IS NOT NULL." | fact | db_infra | same |
| E1.4 | "Test E1.4 unique content xyzzy for semantic axis isolation." | fact | test_axis | same |
| E1.5 | "Cinci rânduri pentru E1." | observation | test_batch | same |

DB invariant (run once after all 5): `SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL) FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:d4f82a41-…:mem-smoke-v2f6a-e1-%'` returns `5`.

### E2 — store replay / idempotency (5 cases)

Re-run each E1 case with the exact same payload + same idempotency_key. Oracle:
- Workflow returns `module_result.status=success` for every replay (module re-emits the same row via the SELECT-after-UNION-ALL branch — `inserted=false`).
- `mem-smoke-v2f6a-e1-*` still has exactly 5 rows in `memory_items` (no duplicates).
- Row's `embedding` value is **byte-identical** between initial write and replay observation window (proves `ON CONFLICT DO NOTHING` preserves the first-written embedding).

### E3 — semantic retrieval of newly stored rows (5 cases)

Call `search_memory` with a query crafted to be semantically closest to exactly one of E1's 5 rows.

| Case | query | Expected top-1 match |
|---|---|---|
| E3.1 | "cum vine embedding-ul la store" | E1.1 |
| E3.2 | "why doesn't semantic find store rows" | E1.2 |
| E3.3 | "what's the ivfflat index predicate" | E1.3 |
| E3.4 | "xyzzy test axis probe" | E1.4 |
| E3.5 | "cinci rânduri test" | E1.5 |

Oracle for each:
- `recall_results.length >= 1`.
- `recall_results[0].id` matches the expected E1 row id.
- `recall_results[0].lexical_fallback === false` (proves the semantic CTE fired).
- `semantic_match_count >= 1` in the details envelope.

Counterfactual (evidence-only, not executed live): pre-F6A, these same queries would return `recall_results=[]` or at best lexical matches with `lexical_fallback=true`. The pre-F6A baseline from `apply_evidence_f2_20260421.md §3` is recorded in E2E results for contrast.

### E4 — lexical fallback regression pack (5 cases)

Insert 5 rows via F6A path where the content uses rare tokens; then call `search_memory` with queries that are purely lexical overlap (no semantic vector similarity expected):

| Case | content seed | query | Oracle |
|---|---|---|---|
| E4.1 | "anchor zzz_e4_token_alpha" | "zzz_e4_token_alpha" | lexical hit (`lexical_fallback=true`), semantic may also hit (bonus) |
| E4.2 | "zzz_beta_marker phrase" | "zzz_beta_marker" | lexical hit |
| E4.3 | "gamma_unique_xyz content" | "gamma_unique_xyz" | lexical hit |
| E4.4 | "delta anchor E4.4" | "delta anchor E4.4" | lexical hit |
| E4.5 | "epsilon phrase token" | "epsilon phrase token" | lexical hit |

Oracle: each query returns at least one row with that row in `recall_results`. If semantic also hit, dedupe must not double-list.

### E5 — fail-closed / degraded-path pack (3 cases — minimum authorized reduction)

Forcing real HTTP failure against OpenAI from live requires either credential rotation or network fault injection, both of which are invasive. F6A accepts the F2 precedent (`apply_evidence_f2_20260421.md §5 Known gaps`) — **L6 covers this exhaustively at the Merge layer; E5 verifies only the structural behavior that no such fault is accidentally triggered, and documents the deferral**.

- E5.1 — a happy case from E1 — verify `passthrough.embedding_error=null` actually reaches Store_Result (defensive check). One case.
- E5.2 — store with `content=""` (empty string) — expected Prep error `MISSING_REQUIRED_FIELDS`; HTTP never called; row not inserted; `store_memory` returns `_error=true` envelope with `missing_fields=["content"]`. One case.
- E5.3 — store with subjective content (`memory_type=observation`, content hitting the F5 RO regex — e.g., "Ion este prost în meseria lui.") — expected Prep error `SUBJECTIVE_JUDGMENT_FORBIDDEN`; HTTP never called; row not inserted. One case.

Pack 05 §E5 says "as needed by chosen design" — F5 Prep short-circuit path already gates out unsafe content before the HTTP node, so degraded-path live coverage reduces to these three. True HTTP-failure live exercise is formally deferred under `F6A-HTTP-FAIL-LIVE-PROBE` follow-up (inherits F2's t3 deferral rationale). This reduction is justified per pack 05 ("Claude may increase counts, but must justify any reduction").

### E6 — mixed regression pack (5 cases)

| Case | Scenario | Oracle |
|---|---|---|
| E6.1 | Store via F6A then search (semantic), then recall by tenant/category | 1 store success, 1 semantic hit, 1 recall hit; all 3 envelopes green |
| E6.2 | Store via F6A then promote (same row, caller user_confirmed=true) | Store success; Promote accepts (V2-014 accept-predicate holds); DB row's `tier='long_term'`; embedding unchanged |
| E6.3 | Store via F6A then supersede (new row supersedes) | Store success; Supersede creates new row with `embedding=NULL` (F6A does not touch supersede — expected deliberate scope gap); original row `status='superseded'` |
| E6.4 | Full RA envelope trip (ME→RA aggregation for a store family) | `domain_writes_performed=false` on envelope (V2-OBS invariant holds); RA aggregation accepts envelope; row still committed with embedding |
| E6.5 | Concurrent store + search interleave (rapid sequence) | No envelope corruption; both actions independent; embedding row in DB; search returns it |

---

## Mandatory oracles

- **Local PASS count:** 5 (L1) + 5 (L2) + 10 (L3 = 5+5) + 5 (L4) + 5 (L5) + 5 (L6) + 6 (L7) = **41 local cases**; must PASS 41/41.
- **Live E2E PASS count:** 5 (E1) + 5 (E2) + 5 (E3) + 5 (E4) + 3 (E5) + 5 (E6) = **28 live cases**; must PASS 28/28.
- **Explicit DB invariants** — listed below.
- **Semantic-retrieval proof:** E3.1–E3.5 top-1 match ids exactly correspond to E1.1–E1.5 inserted ids.
- **Zero regression:** E4 all PASS; E6.2/E6.3/E6.4 PASS; lexical baseline rows from pre-F6A remain findable identically.

## DB invariants (must hold post-E2E run)

Run via `mcp__postgres__execute_sql` with read-only role (`claude_mvp` SELECT). Results captured in `F6A_E2E_RESULTS.md §DB_verification`.

### DB-INV-1 — F6A store rows inserted with correct embedding state

```sql
SELECT
  COUNT(*)                                                     AS total_rows,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL)                AS with_embedding,
  COUNT(*) FILTER (WHERE embedding IS NULL)                    AS without_embedding,
  MIN(array_length(embedding::real[], 1))                      AS min_dim,
  MAX(array_length(embedding::real[], 1))                      AS max_dim
FROM public.memory_items
WHERE idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f6a-e1-%';
```
Expected: `total_rows=5, with_embedding=5, without_embedding=0, min_dim=1536, max_dim=1536`.

### DB-INV-2 — replay did not duplicate

```sql
SELECT idempotency_key, COUNT(*) AS n
FROM public.memory_items
WHERE idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f6a-e1-%'
GROUP BY idempotency_key
ORDER BY idempotency_key;
```
Expected: 5 distinct keys, every `n=1`.

### DB-INV-3 — E4 lexical rows present, embedding populated on happy path

```sql
SELECT id, substring(content for 60) AS content_head, embedding IS NOT NULL AS has_emb
FROM public.memory_items
WHERE idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f6a-e4-%'
ORDER BY id;
```
Expected: 5 rows, all `has_emb=true`.

### DB-INV-4 — E5.2 / E5.3 produced zero rows

```sql
SELECT COUNT(*) AS n
FROM public.memory_items
WHERE idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f6a-e5-%';
```
Expected: `n=0`.

### DB-INV-5 — E6.2 promoted, E6.3 superseded state

```sql
SELECT id, tier, status, embedding IS NOT NULL AS has_emb, supersedes_memory_id
FROM public.memory_items
WHERE idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f6a-e6-%'
   OR idempotency_key LIKE 'supersede_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f6a-e6-%'
ORDER BY idempotency_key;
```
Expected: for E6.2 row → `tier='long_term'`, `status='active'`, `has_emb=true`. For E6.3 original → `status='superseded'`; replacement → `has_emb=false` (supersede lane still writes NULL — deliberate).

### DB-INV-6 — no unintended mutation outside test namespace

Baseline captured at Phase 5 pre-apply via:
```sql
SELECT MAX(updated_at) FROM public.memory_items WHERE idempotency_key NOT LIKE 'store_memory:d4f82a41%mem-smoke-v2f6a%';
```
Post-E2E:
```sql
SELECT MAX(updated_at) FROM public.memory_items WHERE idempotency_key NOT LIKE 'store_memory:d4f82a41%mem-smoke-v2f6a%' AND idempotency_key NOT LIKE 'supersede_memory:d4f82a41%mem-smoke-v2f6a%';
```
Expected: post value ≤ pre value (no mutation outside F6A smoke namespace).

### DB-INV-7 — ivfflat index still valid

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';
```
Expected: 1 row, `indexdef` unchanged from pre-F6A capture.

---

## Test-first ordering

Per pack `04_EXECUTION_PROTOCOL_F6A.md §Phase 3` ("Before building patch, write: local matrix / E2E matrix / DB verification queries / regression pack"), this doc and `F6A_LOCAL_HARNESS` scaffold are Phase 3 outputs — produced before any build-script or payload authoring in Phase 4.

## Anything Claude may not change without reopening Phase 2

- Number of local cases (may grow, not shrink below 41).
- Number of E2E cases (may grow, not shrink below 28).
- DB invariant queries (parameters may be adjusted for namespace drift, but semantics must match).
- The L4 semantic-benefit oracle requirement (non-negotiable — it is the feature gate).
- The E3 top-1-matching requirement (non-negotiable — it is the user-visible improvement).
