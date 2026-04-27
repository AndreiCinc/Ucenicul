# F2.0 Design Doc — Embedding Producer for `search_memory`

Opened: 2026-04-21.
Scope: **minimal F2** — only the `search_memory` action gets an embedding producer. `store_memory`, `recall_memory`, `promote_memory`, `supersede_memory` remain untouched.

User decisions frozen into this design:
- Provider: OpenAI `text-embedding-3-small`. Dimension: **1536** (matches `memory_items.embedding vector(1536)` exactly — no projection/truncation needed).
- Location: separate HTTP node inside `WF-ME-01`, in the search leg, between `ME_Memory_Search_Prep` and `ME_Memory_Search_DB`.
- Fallback rule: if embedding fails (network, API error, unparseable response, missing vector), the search path continues on the lexical branch with `used_embedding=false` and a clear fallback artifact in the result. `search_memory` never fails because the embedding HTTP call failed.

## Existing reference point

Workflow `brain_main_inbound_mvp_v6_preprocessor_fixed` (`DO0uAOBZOVHVumOW`) already uses the same provider and credential:
- credential `svM62oyFwPbaIeX4` (name `OpenAi account`)
- node shape: `n8n-nodes-base.httpRequest` typeVersion 4.2
- body: `{"model":"text-embedding-3-small","input":<string|[string]>}`
- `onError: "continueRegularOutput"` so pipeline continues on failure
- timeout: 30000ms

F2 reuses the exact same credential and shape for lowest-risk integration.

## Current search leg (pre-F2)

```
ME_Route_Memory_Action.out[1=search_memory]
  → ME_Memory_Search_Prep       (builds __db + passthrough; if inputs.embedding array is already supplied, serializes it; otherwise embedding_json=null)
    → ME_Memory_Search_DB       (SQL CTE: semantic branch runs when emb_text IS NOT NULL; lexical branch when NULL)
      → ME_Memory_Search_Result (envelope; Patch A fix landed)
```

Under Patch A, zero-hit search emits `recall_results=[]`, and `used_embedding` reflects DB ground-truth (`rows.some(r => r.lexical_fallback === false)`).

## F2 target topology

```
ME_Route_Memory_Action.out[1=search_memory]
  → ME_Memory_Search_Prep
    → ME_Memory_Search_Embed         (NEW — HTTP POST /v1/embeddings, onError=continue)
      → ME_Memory_Search_Embed_Merge (NEW — Code node, folds embedding vector into __db.embedding_json)
        → ME_Memory_Search_DB
          → ME_Memory_Search_Result
```

Two new nodes. Two connection edits:
- Remove: `ME_Memory_Search_Prep → ME_Memory_Search_DB`
- Add: `ME_Memory_Search_Prep → ME_Memory_Search_Embed`
- Add: `ME_Memory_Search_Embed → ME_Memory_Search_Embed_Merge`
- Add: `ME_Memory_Search_Embed_Merge → ME_Memory_Search_DB`

Non-search branches are untouched. Total nodeCount rises 43 → 45.

## Node contracts

### `ME_Memory_Search_Embed` (HTTP Request)

```jsonc
{
  "name": "ME_Memory_Search_Embed",
  "id":   "me-f2-search-embed",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [2888, 1260],
  "onError": "continueRegularOutput",
  "parameters": {
    "method": "POST",
    "url":    "https://api.openai.com/v1/embeddings",
    "authentication":       "predefinedCredentialType",
    "nodeCredentialType":   "openAiApi",
    "sendBody":     true,
    "specifyBody":  "json",
    "jsonBody":     "={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.query_text }) }}",
    "options": { "timeout": 30000 }
  },
  "credentials": { "openAiApi": { "id": "svM62oyFwPbaIeX4", "name": "OpenAi account" } }
}
```

- Reads `$json.__db.query_text` — the Prep-computed query string. Using a single string (not array) so the response has `data[0].embedding` directly.
- `onError: continueRegularOutput` — HTTP failures propagate downstream as data instead of aborting the run.

### `ME_Memory_Search_Embed_Merge` (Code)

```jsonc
{
  "name": "ME_Memory_Search_Embed_Merge",
  "id":   "me-f2-search-embed-merge",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [3008, 1260],
  "parameters": { "jsCode": "<see below>" }
}
```

```js
// Pull the pre-HTTP context explicitly (HTTP node doesn't forward caller input by default)
const prep = $('ME_Memory_Search_Prep').first().json;
if (prep && prep._error === true) {
  return [{ json: prep }];
}

const httpResp = $json;

// Defaults preserve pre-F2 behavior: if caller already supplied embedding in Prep, keep it
let embeddingJson      = prep.__db.embedding_json;
let usedEmbedding      = prep.passthrough && prep.passthrough.used_embedding === true;
let embeddingAttempted = false;
let embeddingError     = null;

// Only invoke F2 path if caller did not supply an embedding
if (!embeddingJson) {
  embeddingAttempted = true;

  // Success shape: { data: [ { embedding: [...1536 numbers...] } ] }
  const vec = httpResp
    && httpResp.data
    && Array.isArray(httpResp.data)
    && httpResp.data[0]
    && Array.isArray(httpResp.data[0].embedding)
    ? httpResp.data[0].embedding
    : null;

  if (vec && vec.length === 1536) {
    embeddingJson = JSON.stringify(vec);
    usedEmbedding = true;
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
  __db: { ...prep.__db, embedding_json: embeddingJson },
  passthrough: {
    ...prep.passthrough,
    used_embedding:       usedEmbedding,
    embedding_attempted:  embeddingAttempted,
    embedding_error:      embeddingError
  }
}}];
```

Output shape is byte-compatible with what `ME_Memory_Search_DB` already expects (`$json.__db.query_text`, `$json.__db.embedding_json`, etc., plus a `queryReplacement` expression that reads `$json.__db.*`). Adding new `passthrough.embedding_attempted` / `embedding_error` fields is additive and does not break downstream consumers.

### Downstream effect on `ME_Memory_Search_Result`

No code change required. The Result node already reads `lexical_fallback` directly from the DB rows (post-Patch A), so:
- Semantic HTTP success → DB `semantic` CTE fires → `lexical_fallback=false` on rows → Result reports `used_embedding=true`, `status=success`.
- Semantic HTTP failure → `embedding_json=null` in Merge → DB `lexical` CTE fires → `lexical_fallback=true` on rows → Result reports `used_embedding=false`, `status=partial`, `followup_requests=[{generate_embedding,...}]`.

The fallback artifact is already emitted by the Patch-A version of `ME_Memory_Search_Result`. F2 does **not** change `ME_Memory_Search_Result`.

## Behavioural contract post-F2

| Case | `inputs.embedding` | HTTP call | DB branch | `recall_results` | `used_embedding` | `status` | `summary` | `embedding_error` |
|---|---|---|---|---|---|---|---|---|
| F2-ok — caller has query, no embedding, API succeeds | absent | 200 OK with 1536-dim vector | `semantic` | N rows w/ `lexical_fallback=false` | `true` | `success` | `Memory search completed.` | `null` |
| F2-ok-empty — same as above, zero matches on cosine | absent | 200 OK | `semantic` | `[]` | `false` (because `rows.length === 0`) | `success` | `Memory search completed.` | `null` |
| F2-fallback — API fails or returns garbage | absent | non-200 / malformed | `lexical` | N rows w/ `lexical_fallback=true` | `false` | `partial` | `Memory search degraded to lexical fallback (embedding missing).` | `"embedding_http_XXX"` / `"embedding_response_unusable"` |
| F2-fallback-empty — API fails, lexical zero matches | absent | non-200 | `lexical` | `[]` | `false` | `success` | `Memory search completed.` | `"embedding_http_XXX"` |
| F2-caller-override — caller supplied `inputs.embedding` array | present (1536) | **skipped** | `semantic` | N rows | `true` | `success` | `Memory search completed.` | `null` (attempted=false) |

Two important corners:
1. **Empty semantic hit is `status=success`, not `partial`.** The Result node only sets `partial` when ALL rows exist and all are `lexical_fallback=true`. Zero rows short-circuits to `success` with `recall_results=[]`. This is unchanged from Patch A and intentional — empty is not a degradation.
2. **Pure fallback with zero lexical hits looks identical to "caller asked for nothing searchable".** `used_embedding=false`, `recall_results=[]`, `status=success`. The `embedding_error` field in passthrough remains the only signal of API failure. That signal is **not** surfaced to `module_result` in F2 (to keep the envelope change minimal). It stays inside the workflow as debug context. If future frontiers need upstream visibility they can promote it to `module_result.artifacts.embedding_failure` as an additive patch.

## Safety properties

- **No store_memory impact.** F2 only touches the search leg downstream of `ME_Route_Memory_Action` output 1. All five action switch outputs 0/2/3/4 untouched.
- **No schema change.** `memory_items.embedding vector(1536)` already exists (v1). Index already exists (ivfflat cosine).
- **Rollback plan.** Remove the two new nodes and restore the single connection `Prep → DB`. Structural, no data migration.
- **No production chain depended on `used_embedding=true` being always false.** F1 smoke confirmed dispatcher-level consumers ignore `used_embedding` (no branching on it in WF-RA-01 at its current commit).
- **Credential scope.** Reuses `svM62oyFwPbaIeX4` which is already in production (`brain_main_inbound_mvp_v6_preprocessor_fixed`). No new credential required.
- **Cost note.** `text-embedding-3-small` is the cheapest embedding tier OpenAI offers. Every search run incurs one embedding call unless the caller supplies a vector. If cost becomes a concern a later frontier can add a short-lived (query, vector) cache, but F2 explicitly does not.

## Why not store_memory?

The user confirmed v2 scope excludes F2 embeddings at write-time. Rows inserted via `store_memory` continue to carry `embedding=NULL`. Semantic search will therefore not find v2-stored rows until either (a) a back-fill job populates vectors, or (b) a later frontier extends F2 to the store leg. The v1 walker fixture rows from 2026-04-20 also have `embedding=NULL` — they remain lexical-only findable. This is an explicit, documented limitation of the minimal F2 scope.

## Test plan (F2.4)

Against shared execution_context `d4f82a41-01cd-4fb7-9d70-573557348e74`, step ids `mem-smoke-v2f1:f2-{t1,t2,t3,t4}`:

- **t1 — semantic path baseline.** Query: `"store path anchor"` (no caller-supplied embedding). Expect: HTTP succeeds; DB semantic CTE runs. Because no row has `embedding IS NOT NULL`, semantic returns 0 rows. Oracle: `used_embedding=false` (no rows), `recall_results=[]`, `status=success`, `embedding_error=null` in passthrough. **Key observation:** F2 is wired correctly — the absence of results is due to lack of stored embeddings, not a wire problem. Validate via `ME_Memory_Search_Embed_Merge` output showing `embedding_attempted=true`, 1536-length JSON string in `__db.embedding_json`.
- **t2 — caller-supplied embedding short-circuit.** Caller passes a manually constructed 1536-float embedding (e.g., all 0.0001) via `inputs.embedding`. Expect: Prep folds it, Merge detects `embeddingJson` already present, skips HTTP (verify via `embedding_attempted=false` in passthrough). DB semantic CTE runs against the supplied vector. Probably zero matches (all-zero vector won't resemble any stored row, but also no row has embedding so it's zero either way). Oracle: `embedding_attempted=false`, `used_embedding=true` (caller intent), `status=success`, `recall_results=[]`.
- **t3 — HTTP failure fallback.** Force the HTTP call to fail by mutating the credential reference temporarily? No — that's invasive. Instead, send a query designed to produce a 400 (e.g., empty-ish input after trim) OR rely on a second smoke with a bogus payload shape — **will decide in F2.3 runbook whether to exercise this via an ephemeral invalid-credential swap or accept as an observational gap**. For first F2.4 run, document t3 as "observational — confirm `onError=continueRegularOutput` is set; full-failure exercise deferred to F2-extension once we have a safe way to simulate".
- **t4 — smoke s2b re-run for regression safety.** Query `"zzz_no_match_zzz"` again: expect the F2 path to produce embedding successfully, DB semantic returns 0, fallback to lexical (also 0), final `recall_results=[]`, `status=success`. This confirms the two-CTE UNION ALL path still returns empty correctly when both branches fail. **Important:** under F2 both branches execute in parallel inside the SQL — semantic gets a vector, lexical checks `emb_text IS NULL`. Since emb_text is now non-null, the lexical branch gates out (`WHERE p.emb_text IS NULL`). So for t4 semantic runs, finds 0, lexical is skipped. Result: same `recall_results=[]` as s2b.

After F2.3 rollout, these runs must pass before F3 is queued.

## Gate alignment

| F2 gate | Artifact |
|---|---|
| F2.0 — this design doc | ✅ |
| F2.1 — DIVERGENCE D-M-011 | written alongside this doc |
| F2.2 — patch plan + build script | `docs/architecture/memory/v2/f2/patch_plan_f2.md` + artifacts |
| F2.3 — live rollout via `n8n-patch.mjs replace` | `docs/architecture/memory/v2/f2/apply_evidence_f2_YYYYMMDD.md` |
| F2.4 — end-to-end smoke proven | appended to apply evidence |
