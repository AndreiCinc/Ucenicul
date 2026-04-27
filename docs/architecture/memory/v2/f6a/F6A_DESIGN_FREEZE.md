# F6A Design Freeze

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Frozen: 2026-04-23
Authority: operator directive 2026-04-23 (uploaded `F6A` mission pack) + mirrors F2/F2b design pattern verbatim on the store lane.
Status: FROZEN — patching without updating this doc first is forbidden.

This doc answers the six design-freeze questions listed in pack `03_DESIGN_FREEZE_EXPECTED.md`.

---

## Q1 — Where is the best insertion point for store-path embedding generation?

**Decision: dedicated embed node + merge node inserted between `ME_Memory_Store_Prep` and `ME_Memory_Store_DB`**, mirroring the F2 search-leg topology.

Options considered:

| Option | Insertion | Rejection reason |
|---|---|---|
| A — Prep layer (expand `Store_Prep.jsCode` to HTTP) | Code node makes HTTP via `$http.request` | Code nodes can't cleanly mix sync validation with async HTTP + graceful `onError` semantics the F2 pattern already proves. Breaks the F2 shape precedent. |
| B — Dedicated HTTP + Merge pair between Prep and DB **(chosen)** | Two new nodes (`ME_Memory_Store_Embed` HTTP + `ME_Memory_Store_Embed_Merge` Code) | Mirrors the F2 search lane exactly. Reuses the OpenAI credential `svM62oyFwPbaIeX4`. Diff surface is well-understood. Rollback is a structural revert (same shape as F2 rollback). |
| C — Post-insert UPDATE leg (two-phase) | Insert row then embed then UPDATE | Introduces a second DB round-trip per store; complicates idempotency (replay of the UPDATE leg against a row already embedded is ambiguous); widens failure surface (transaction / commit semantics). Contradicts "smallest safe diff" bias. |
| D — Back-fill job, no workflow change | Offline cron that embeds rows with NULL | Orthogonal follow-up (still useful for legacy rows). Does not fulfil the mission objective for rows written *after* the feature lands. Tracked as `F6A-BACKFILL-FUTURE`; out of F6A scope. |

**Precedent:** F2 already demonstrated this exact shape on search with `onError: continueRegularOutput` providing graceful degradation. The store lane reuses the same approach so the workflow shape stays symmetric between search and store.

## Q2 — Exact storage contract for `embedding`

- **Type:** `vector(1536)` (matches `public.memory_items.embedding` column frozen in `migration.sql:150`).
- **Wire format Embed → Merge:** OpenAI response `data[0].embedding` — a JS array of 1536 numbers (as per F2's Merge code which already validates `vec.length === 1536`).
- **Wire format Merge → DB:** pgvector literal string `[n1,n2,...,n1536]` bound as `$14::vector(1536)`. F2 uses `JSON.stringify(vec)` which yields `[...]` — pgvector accepts both `[...]` and JSON array strings; the live search leg depends on this and it is byte-proven green at execs 1431/1441/1450. F6A reuses the identical serialization.
- **Nullability:**
  - On HTTP success with valid 1536-dim vector → row inserted with `embedding = <pgvector literal>`.
  - On HTTP failure / malformed response / non-1536 length → row inserted with `embedding = NULL`; `passthrough.embedding_error` captures the reason in workflow context.
- **Placement in `__db`:** Prep does **not** set `__db.embedding_text`; Merge folds it in (same shape as F2's `embedding_json`, renamed to `embedding_text` here for clarity — Store_DB consumes it via `$json.__db.embedding_text`). Rationale: Prep emits `_error=true` branches that must short-circuit the HTTP call; naming aligns with the fact that it will be stringly bound.

## Q3 — Idempotency semantics

- **Row de-duplication:** unchanged from current live — `ON CONFLICT (idempotency_key) DO NOTHING` in `ME_Memory_Store_DB`. First write wins.
- **Embedding recomputation on replay:** allowed at the HTTP layer (the Embed node will call OpenAI on every execution because there's no workflow-level cache), but **has no effect on the stored row** because `ON CONFLICT DO NOTHING` leaves the pre-existing row untouched. Net result: idempotency_key replay → HTTP call may or may not happen depending on whether the first attempt succeeded or failed; DB row is never duplicated; `embedding` column reflects the first successful write only.
- **Back-fill of rows whose first attempt wrote NULL embedding:** explicitly **out of F6A scope**. A row stored with `embedding=NULL` because the first attempt's HTTP failed will stay NULL forever as far as F6A is concerned. Reopening / UPDATE-embedding-after-the-fact is a separate mission (`F6A-BACKFILL-FUTURE`). See §Q4 "why not hard-fail" below.
- **Idempotency key format:** unchanged — `store_memory:{execution_context_id}:{step_id}` (computed in `Store_Prep`). Embed / Merge do not affect the key.

## Q4 — Failure behavior

**Decision: degrade gracefully — store row succeeds with `embedding=NULL`; `passthrough.embedding_error` carries the reason.**

Options considered:

| Option | Behavior | Rejection reason |
|---|---|---|
| A — Hard-fail store if embedding fails | `_error=true` propagates; row not inserted | Breaks the store contract. `store_memory` must be robust to transient OpenAI outages — losing a store call because the embedding API had a hiccup is unacceptable when the store row has intrinsic value (idempotency, audit trail) independent of semantic retrievability. Contradicts F2's own fallback philosophy ("`search_memory` never fails because the embedding HTTP call failed"). |
| B — Row succeeds with `embedding=NULL` on failure; `embedding_error` captured in passthrough **(chosen)** | INSERT proceeds; embedding column is NULL; workflow context records failure | Matches F2 philosophy. `memory_items.embedding` is nullable by design (`migration.sql:150` decision C2). Rows remain lexically retrievable. Future back-fill or supersede can restore semantic retrievability. |
| C — Two-phase (insert null then UPDATE) | Same result as B but via two round-trips | B achieves the same observable end-state with one round-trip. |

**Justification ties to existing design:**

- `design_f2_embedding_producer.md §Safety properties` explicitly treats graceful degradation as the v2 pattern: "No store_memory impact. F2 only touches the search leg downstream…" — F6A extends F2 and preserves the "no action silently fails because of embedding" principle.
- `final_verification.md §Known limitations / v2 follow-ups` names "Semantic search leg" as an explicit v2 follow-up — F6A closes it without breaking store_memory's own reliability contract.
- `apply_evidence_f2_20260421.md §5 Known gaps` records "Store path does not yet compute embeddings" as the deferred gap; F6A's graceful fallback matches the degradation pattern already proven by F2b.

## Q5 — Smallest safe diff surface

**Class:** structural change (new nodes + new connections + modified node parameters) → `n8n-patch.mjs replace` (not `patch-node`).

**Exact diff surface on live `versionId=96962424-…`:**

### Added nodes

```
ME_Memory_Store_Embed        (n8n-nodes-base.httpRequest, typeVersion 4.2, position [2888,1040])
ME_Memory_Store_Embed_Merge  (n8n-nodes-base.code,        typeVersion 2,   position [3008,1040])
```

Positions are chosen in the build script to sit between `ME_Memory_Store_Prep ([2768,1040])` and the new position of `ME_Memory_Store_DB` at row `y=1040`. To align vertically with the F2 search-lane offsets (where `Search_Embed` is at `[2888,1260]` and `Search_Embed_Merge` is at `[3008,1260]`), the final coordinates are:

- `ME_Memory_Store_Embed.position = [2888, 1040]` (directly above Search_Embed).
- `ME_Memory_Store_Embed_Merge.position = [3008, 1040]` (directly above Search_Embed_Merge; occupies the slot previously held by Store_DB).
- `ME_Memory_Store_DB.position` shifts `[3008, 1040]` → `[3128, 1040]` — one column to the right — to vacate `[3008,1040]` for the new Merge. This is a visual-layout-only change; no downstream node moves, no semantic behavior changes. The shift is explicitly permitted by the mission brief (§Patch surface) and enforced by `BUILD-INV-8`, `DS-INV-7`, and `DS-INV-10` below.

### Node parameters

**`ME_Memory_Store_Embed.parameters`:**
```json
{
  "url": "https://api.openai.com/v1/embeddings",
  "method": "POST",
  "options": { "timeout": 30000 },
  "jsonBody": "={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) }}",
  "sendBody": true,
  "specifyBody": "json",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "openAiApi"
}
```
plus `"onError": "continueRegularOutput"` at top-level (not inside `parameters`) and `"credentials": { "openAiApi": { "id": "svM62oyFwPbaIeX4", "name": "OpenAi account" } }` at top-level.

Byte-compared to live `ME_Memory_Search_Embed`:
- `url`, `method`, `options.timeout`, `sendBody`, `specifyBody`, `authentication`, `nodeCredentialType`, `credentials`, `onError` — **identical** copy.
- `jsonBody` — differs only in the `input:` source — `$json.__db.content` instead of `$json.__db.query_text` (rationale: store lane's payload names the text field `content`, not `query_text`).

**`ME_Memory_Store_Embed_Merge.parameters.jsCode`:**
```js
// Adapted from ME_Memory_Search_Embed_Merge with store-lane field names.
const prep = $('ME_Memory_Store_Prep').first().json;
if (prep && prep._error === true) {
  return [{ json: prep }];
}

const httpResp = $json;

// Defaults: if Prep ever carries caller-supplied embedding (future F-extension),
// honour it. Today Prep does not emit embedding_text, so this short-circuit is inert.
let embeddingText      = prep.__db.embedding_text || null;
let embeddingAttempted = false;
let embeddingError     = null;

if (!embeddingText) {
  embeddingAttempted = true;

  const vec = httpResp
    && httpResp.data
    && Array.isArray(httpResp.data)
    && httpResp.data[0]
    && Array.isArray(httpResp.data[0].embedding)
    ? httpResp.data[0].embedding
    : null;

  if (vec && vec.length === 1536) {
    embeddingText = JSON.stringify(vec);
  } else if (httpResp && httpResp.error) {
    embeddingError = 'embedding_http_error: '
      + (httpResp.error.message || httpResp.error.code || JSON.stringify(httpResp.error));
  } else if (httpResp && typeof httpResp.statusCode === 'number' && httpResp.statusCode >= 400) {
    embeddingError = 'embedding_http_' + httpResp.statusCode;
  } else {
    embeddingError = 'embedding_response_unusable';
  }
}

return [{ json: {
  __db: { ...prep.__db, embedding_text: embeddingText },
  passthrough: {
    ...prep.passthrough,
    embedding_attempted: embeddingAttempted,
    embedding_error:     embeddingError
  }
}}];
```

Differences vs `ME_Memory_Search_Embed_Merge`:
- Source node name: `ME_Memory_Store_Prep` (not `Search_Prep`).
- Field name: `embedding_text` (not `embedding_json`) — clarity; both serialize identically (JSON array string).
- `usedEmbedding` local is retained as a passthrough (mirrors the Search-lane merge shape for symmetry; downstream consumers read `passthrough.used_embedding` diagnostically but do not rely on it). The claim in an earlier draft that this local was removed was incorrect — the deterministic builder always emitted it, and the live jsCode (sha256 `4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc`, dumped in `harness/merge_live_jscode.txt`) preserves it. [DOC-DRIFT-1 fix, applied 2026-04-23 per F6A_RECONCILIATION.md §4.]

### Modified node parameters — `ME_Memory_Store_DB`

**Before (live on `versionId=96962424`):**
```sql
WITH ins AS (
  INSERT INTO public.memory_items (
    tenant_id, memory_type, category, content,
    confidence, importance, durability,
    source_thread_id, source_message_id, entity_id,
    evidence_refs, metadata, idempotency_key
  )
  VALUES (
    $1::uuid, $2::memory_type_enum, $3::text, $4::text,
    $5::numeric, $6::numeric, $7::rag_durability_enum,
    $8::uuid, $9::uuid, $10::uuid,
    $11::jsonb, $12::jsonb, $13::text
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *, TRUE AS inserted
)
SELECT * FROM ins
UNION ALL
SELECT mi.*, FALSE AS inserted
  FROM public.memory_items mi
 WHERE mi.idempotency_key = $13::text AND NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
```
with `options.queryReplacement = "={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key] }}"`.

**After (F6A target):**
```sql
WITH ins AS (
  INSERT INTO public.memory_items (
    tenant_id, memory_type, category, content,
    confidence, importance, durability,
    source_thread_id, source_message_id, entity_id,
    evidence_refs, metadata, idempotency_key,
    embedding
  )
  VALUES (
    $1::uuid, $2::memory_type_enum, $3::text, $4::text,
    $5::numeric, $6::numeric, $7::rag_durability_enum,
    $8::uuid, $9::uuid, $10::uuid,
    $11::jsonb, $12::jsonb, $13::text,
    CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *, TRUE AS inserted
)
SELECT * FROM ins
UNION ALL
SELECT mi.*, FALSE AS inserted
  FROM public.memory_items mi
 WHERE mi.idempotency_key = $13::text AND NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
```
with `options.queryReplacement = "={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key, $json.__db.embedding_text] }}"`.

**Diff surface proof (to be byte-verified in Phase 5 pre-apply):**
- Column `embedding` appended at end of INSERT column list (14th position).
- `$14::vector(1536)` appended via `CASE WHEN NULL THEN NULL ELSE cast` (pgvector will reject a NULL cast to `vector(1536)` otherwise — the CASE keeps the NULL-degraded path green).
- `queryReplacement` array grows 13 → 14 elements; the `_error=true` branch grows the null list from 13 to 14 nulls.
- Error branch: unchanged semantics — all 14 nulls cause the INSERT's NOT-NULL-constrained columns (tenant_id, memory_type, …) to fail, which is the intended short-circuit; F5 Prep error handling already relies on this.
- `UNION ALL` branch below `ins` and the `ON CONFLICT` clause — **unchanged byte-for-byte**.

### Connection edits

```
Remove: ME_Memory_Store_Prep.main[0][0]  = { node: "ME_Memory_Store_DB", type: "main", index: 0 }
Add:    ME_Memory_Store_Prep.main[0][0]  = { node: "ME_Memory_Store_Embed", type: "main", index: 0 }
Add:    ME_Memory_Store_Embed.main[0][0] = { node: "ME_Memory_Store_Embed_Merge", type: "main", index: 0 }
Add:    ME_Memory_Store_Embed_Merge.main[0][0] = { node: "ME_Memory_Store_DB", type: "main", index: 0 }
```

No edits outside these four. Connection count: 63 → 65 net (one removed, three added).

## Q6 — Regression families affected

| Family | Impact | Coverage |
|---|---|---|
| Store path (happy) | Row now carries non-null embedding on HTTP success | L2, E1 |
| Store path (HTTP failure) | Row carries NULL embedding, `passthrough.embedding_error` set, `store_memory` returns success | L6, E5 |
| Store path (replay) | Unchanged — `ON CONFLICT DO NOTHING` preserves first row | L3, E2 |
| Search semantic | **Intended change** — newly stored rows now semantic-retrievable | L4, E3 |
| Search lexical fallback | Unchanged — lexical CTE was decoupled from embedding presence in F2b | L5, E4 |
| Recall | No schema/node touched; regression expected zero | L7, E6 |
| Promote | No schema/node touched; regression expected zero | L7, E6 |
| Supersede | No schema/node touched on lane; regression expected zero. Supersede still inserts rows with `embedding=NULL` — tracked as `F6E` follow-up, NOT a regression from F6A | L7, E6 (spot), blocker register §Known deliberate exclusion |
| RA envelope / aggregation | Untouched; V2-OBS closure holds | E6 (spot) |

Latency impact: store action adds one OpenAI HTTP hop (~100-500 ms typical). Non-blocking for observed production traffic.

Cost impact: every store call incurs one `text-embedding-3-small` invocation. This is the cheapest OpenAI embedding tier; parity with search-leg cost profile. Cost is deferred to "future ops observation" (not an F6A blocker).

## Behavioural contract table (post-F6A)

| Case | Embed HTTP | `__db.embedding_text` out of Merge | `passthrough.embedding_error` | `memory_items.embedding` after INSERT | Row inserted? |
|---|---|---|---|---|---|
| F6A-happy — content valid, API 200, 1536-dim response | 200 OK | 1536-float JSON array string | `null` | non-null `vector(1536)` | yes |
| F6A-http-fail — API returns 429 / 5xx / timeout | non-200 or exception | `null` | `embedding_http_<code>` or `embedding_http_error: ...` | NULL | yes |
| F6A-malformed — API 200 but response lacks `data[0].embedding` | 200 OK + malformed | `null` | `embedding_response_unusable` | NULL | yes |
| F6A-wrong-dim — API 200, vector length ≠ 1536 | 200 OK + wrong len | `null` | `embedding_response_unusable` | NULL | yes |
| F6A-error-upstream — Prep emits `_error=true` | skipped (short-circuit in Merge) | not reached | not set | not reached (ins short-circuited by `queryReplacement`'s null array) | no (error propagates to Result) |
| F6A-replay — same `idempotency_key` as a prior insert | called again (no workflow cache) | varies | varies | **unchanged** (row from first call, regardless of whether that had embedding) | no (ON CONFLICT DO NOTHING) |

## Safety properties

- **No schema change.** `public.memory_items.embedding vector(1536)` already exists (v1 migration).
- **No index change.** Partial `ivfflat` cosine index on `embedding IS NOT NULL AND status='active'` already exists. New non-null rows land in the index on insert automatically. No `CREATE INDEX` / `REINDEX` required in F6A.
- **No credential creation.** Reuses `svM62oyFwPbaIeX4` (`OpenAi account`), already in production and used by both F2's search-lane Embed node and the brain v6 preprocessor.
- **No workflow split.** All F6A changes are inside `WF-ME-01`; multi-workflow connector assertion rule (F6D candidate) remains vacuously satisfied.
- **Rollback plan.** Structural revert via `n8n-patch.mjs replace` to a captured pre-F6A snapshot (`artifacts/WF-ME-01_pre_f6a.json`). Removes the two new nodes and restores the pre-F6A `Store_DB.parameters.query` + `options.queryReplacement`. No DB migration required — any rows with non-null embedding stay valid (column is nullable, index is partial).
- **No impact on non-store legs.** Search / recall / promote / supersede connections are unchanged; their nodes are unchanged; their DB queries are unchanged.
- **`availableInMCP` / settings preserved.** `replace` uses `n8n-patch.mjs` which filters settings via the OpenAPI whitelist (per V2-024 / V2-025) — the F6A `replace` must NOT rewrite settings; build script will preserve live `settings` byte-for-byte.

## Preservation constraints

- F5 Prep jsCode (subjective guard multi-language) is **untouched** — Store_Prep edits are zero in F6A. The HTTP Embed node is a new downstream node that consumes Store_Prep's existing output.
- F2/F2b search lane is **untouched** — Search_Embed / Search_Embed_Merge / Search_DB unchanged.
- V2-014 Promote_DB accept-predicate SQL is **untouched**.
- V2-OBS `ME_Build_RA_Envelope.parameters.jsCode` success branch is **untouched**.

## Diff-surface invariants (Phase 5 pre-apply verifier must assert)

1. Exactly 2 new nodes with names `ME_Memory_Store_Embed`, `ME_Memory_Store_Embed_Merge`.
2. `ME_Memory_Store_Embed.parameters.nodeCredentialType === 'openAiApi'`.
3. `ME_Memory_Store_Embed.parameters.jsonBody` matches the F2 Search_Embed body except for `query_text` → `content`.
4. `ME_Memory_Store_Embed_Merge.parameters.jsCode` contains `ME_Memory_Store_Prep`, `embedding_text`, `vec.length === 1536`.
5. `ME_Memory_Store_DB.parameters.query` contains `embedding` and `$14::vector(1536)` and the `CASE WHEN $14::text IS NULL` guard.
6. `ME_Memory_Store_DB.parameters.options.queryReplacement` has exactly 14 parameters in the non-error branch and exactly 14 nulls in the error branch.
7. All 45 pre-F6A nodes are byte-identical to pre **except**: (a) `ME_Memory_Store_DB` — `parameters.query`, `parameters.options.queryReplacement`, and `position` change as specified in this freeze. `Store_Prep` (entire node including `parameters.jsCode`, `passthrough`, and `position`) byte-identical. `Store_Result` byte-identical. Every other untouched node, including credentials, is byte-identical.
8. 4 connection edits as per §Q5 §Connection edits; no other connections altered.
9. Node count = 47. Connection count = 65.
10. Settings object `{binaryMode, callerPolicy, availableInMCP, executionOrder}` byte-identical to pre-F6A. Top-level workflow metadata (`name`, `settings`, `staticData`, `pinData`, `meta`, `triggerCount`, `tags`, `active`) byte-identical. No position change anywhere in the workflow except (a) the two new nodes' own coordinates (`Store_Embed` at `[2888,1040]`, `Store_Embed_Merge` at `[3008,1040]`) and (b) the single deliberate `ME_Memory_Store_DB` shift `[3008,1040] → [3128,1040]` — both already enumerated at §Q5 §Added nodes / §Positions.

## Open design questions (resolved above — none remain)

None. This doc is FROZEN. Any change requires a Phase 2 reopen.
