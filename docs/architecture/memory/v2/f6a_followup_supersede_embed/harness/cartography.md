# F6A-FOLLOWUP-SUPERSEDE-EMBED — Live Workflow Cartography

Cartography snapshot taken from `artifacts/WF-ME-01_pre_f6a_followup.json` (sha256 `1b487734443891a6e7c70c2cf63e26aabc6bd288ca6cd67cf1188dad2c816906`, versionId `c07fe923-76eb-4901-b53b-14039536df55`, 47 nodes, active=true) on 2026-04-24.

## Supersede lane (target)

### Topology (pre)
`ME_Memory_Supersede_Prep → ME_Memory_Supersede_DB → ME_Memory_Supersede_Result → ME_Return_Result`

### Node metadata

- `ME_Memory_Supersede_Prep`: `n8n-nodes-base.code`, typeVersion 2, id `me-phase5mem-supersede-prep`, position [2768, 1320].
- `ME_Memory_Supersede_DB`: `n8n-nodes-base.postgres`, typeVersion 2.4, id `me-phase5mem-supersede-db`, position [3008, 1320], credential `Postgres account 2` (id `z9nKgToNWvIW7P8f`), `continueOnFail=true`.
- `ME_Memory_Supersede_Result`: `n8n-nodes-base.code`, typeVersion 2, id `me-phase5mem-supersede-result`, position [3248, 1320].

### Supersede_Prep output contract (__db fields)

Supersede_Prep emits `__db` with 15 fields (order observed):

1. `old_id` (uuid) — the id of the row being superseded.
2. `tenant_id` (uuid).
3. `memory_type` (enum).
4. `category` (text).
5. `content` (text) — **this is the replacement content to embed**.
6. `confidence` (numeric).
7. `importance` (numeric).
8. `durability` (enum).
9. `source_thread_id` (uuid).
10. `source_message_id` (uuid, nullable).
11. `entity_id` (uuid, nullable).
12. `evidence_refs` (JSON string).
13. `metadata` (JSON string).
14. `idempotency_key` (text) — `supersede_memory:<execution_context_id>:<step.step_id>`.
15. `tier` (enum).

Passthrough: `{env, step, inputs, idempotency_key}`.

On `_error:true` (MISSING_REQUIRED_FIELDS / INVALID_CATEGORY / SUBJECTIVE_JUDGMENT_FORBIDDEN), the Prep short-circuits before `__db` is built — the merge node downstream receives `{_error:true, ...}` and must propagate it unchanged.

### Supersede_DB SQL (pre)

```sql
WITH old_row AS (
  SELECT * FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
guard AS (
  SELECT 1 FROM old_row WHERE status = 'active'
),
marked AS (
  UPDATE public.memory_items
  SET status = 'superseded'
  WHERE id = $1::uuid AND EXISTS (SELECT 1 FROM guard)
  RETURNING id AS old_id
),
inserted AS (
  INSERT INTO public.memory_items (
    tenant_id, memory_type, category, content,
    confidence, importance, durability,
    source_thread_id, source_message_id, entity_id,
    evidence_refs, metadata, idempotency_key,
    supersedes_memory_id, tier, status
  )
  SELECT
    $2::uuid, $3::memory_type_enum, $4::text, $5::text,
    $6::numeric, $7::numeric, $8::rag_durability_enum,
    $9::uuid, $10::uuid, $11::uuid,
    $12::jsonb, $13::jsonb, $14::text,
    $1::uuid, $15::memory_tier_enum, 'active'
  FROM marked
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *, TRUE AS new_insert
)
SELECT * FROM inserted
UNION ALL
SELECT mi.*, FALSE AS new_insert
  FROM public.memory_items mi
 WHERE mi.idempotency_key = $14::text AND NOT EXISTS (SELECT 1 FROM inserted)
LIMIT 1;
```

### Supersede_DB queryReplacement (pre)

```
={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.old_id, $json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key, $json.__db.tier] }}
```

- Error branch: 15 NULLs.
- Success branch: 15 __db references mapping 1:1 to `$1..$15`.
- **Important:** `$1` is `old_id`, `$2` is `tenant_id`. The UPDATE on the old row uses `$1`, `$2`. The new row INSERT uses `$2..$15` + `$1` (for `supersedes_memory_id`). The fallback SELECT uses `$14` (idempotency_key).
- `continueOnFail=true` on the node (identical to store-path — same OBS-E5 demotion pattern will apply unchanged when `_error:true` propagates).

### Rewire plan (target)

Remove: `ME_Memory_Supersede_Prep → ME_Memory_Supersede_DB`.
Add:
- `ME_Memory_Supersede_Prep → ME_Memory_Supersede_Embed`
- `ME_Memory_Supersede_Embed → ME_Memory_Supersede_Embed_Merge`
- `ME_Memory_Supersede_Embed_Merge → ME_Memory_Supersede_DB`

Net: +3 edges − 1 edge = **+2 connection count**. ✅ Matches expected 65 → 67.

### Patch plan for Supersede_DB SQL

Append `embedding` as the 16th column in the INSERT projection (after `status`), and `CASE WHEN $16::text IS NULL THEN NULL ELSE $16::vector(1536) END` in the SELECT. The `status` is `'active'` literal (not a bind), so the column list order is `..., supersedes_memory_id, tier, status, embedding` and the SELECT order is `..., $1::uuid, $15::memory_tier_enum, 'active', CASE ...`.

### Patch plan for Supersede_DB queryReplacement

Error branch: append one more `null` (15 → 16 NULLs).
Success branch: append `$json.__db.embedding_text` (15 → 16 slots).

## F6A store-lane pattern (reference)

### Topology (pre)
`ME_Memory_Store_Prep → ME_Memory_Store_Embed → ME_Memory_Store_Embed_Merge → ME_Memory_Store_DB → ME_Memory_Store_Result`

### Store_Embed parameters (HTTP node)

```json
{
  "url": "https://api.openai.com/v1/embeddings",
  "method": "POST",
  "options": {"timeout": 30000},
  "jsonBody": "={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) }}",
  "sendBody": true,
  "specifyBody": "json",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "openAiApi"
}
```

Credential: `OpenAi account` (id `svM62oyFwPbaIeX4`).

### Store_Embed_Merge jsCode (reference; to be adapted for Supersede_Embed_Merge)

```js
const prep = $('ME_Memory_Store_Prep').first().json;   // <-- change to ME_Memory_Supersede_Prep
if (prep && prep._error === true) {
  return [{ json: prep }];
}

const httpResp = $json;

let embeddingText      = prep.__db.embedding_text || null;
let usedEmbedding      = prep.passthrough && prep.passthrough.used_embedding === true;
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
  __db: { ...prep.__db, embedding_text: embeddingText },
  passthrough: {
    ...prep.passthrough,
    used_embedding:      usedEmbedding,
    embedding_attempted: embeddingAttempted,
    embedding_error:     embeddingError
  }
}}];
```

### Store_DB SQL pattern (reference)

Uses `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END`. Same pattern applied to Supersede_DB with `$16` instead of `$14`.

## Node layout (visual position) for new nodes

Supersede row of nodes is at `y=1320` (Prep=[2768,1320], DB=[3008,1320], Result=[3248,1320]).

Proposed positions for new nodes (mirror of F6A store-lane offset):
- `ME_Memory_Supersede_Embed` at [2888, 1200] (between Prep x and DB x, offset y by -120 like store-lane uses 1040 vs 1160 in Prep row; keeping a clear visual separation).
- `ME_Memory_Supersede_Embed_Merge` at [3008, 1200].

Rationale: keeps supersede row clean; moves Embed/Merge to a parallel row +120 below (actually −120 since y-axis in n8n is downward-positive, the existing store-embed pair is at y=1040 which is *above* the store Prep row at y=1160, so above-lane positioning is idiomatic for this workflow). To mirror exactly, Supersede Embed pair at y=1200 sits just above the supersede row (y=1320), keeping topology symmetry with F6A (store Embed pair at 1040, store row at 1160 → offset −120).

Position is not a correctness concern (WD-14 only asserts settings unchanged; position changes are allowed within n8n's visual plane). Diff-surface test does NOT assert position.

## Out-of-scope confirmations

- Search lane (Prep/Embed/Embed_Merge/DB/Result): will be asserted byte-identical post-apply.
- Promote lane (Prep/DB/Result): will be asserted byte-identical.
- Recall lane (Prep/DB/Result): will be asserted byte-identical.
- Store lane F6A nodes: will be asserted byte-identical.
- RA envelope + routers + result nodes: will be asserted byte-identical.
- Settings object: `n8n-patch.mjs replace` filters `settings` via OpenAPI whitelist (same as F6A). WD-14 checks candidate JSON settings unchanged (we pass the same settings object through).

## Cartography verdict

All 9 cartography questions resolved:

1. Replacement content field: `$json.__db.content` (same as store-path).
2. SQL bind count: currently 15 (`$1..$15`); target 16 (`$1..$16` adding `$16::vector(1536)`).
3. queryReplacement branch shape: two branches (`_error ? NULL×15 : [15 __db refs]`); target (`_error ? NULL×16 : [16 __db refs]`).
4. Idempotency: `supersede_memory:<exec_ctx>:<step_id>` with `ON CONFLICT (idempotency_key) DO NOTHING` + UNION ALL fallback; unchanged.
5. Old-row UPDATE path: inside `marked` CTE; unchanged by this mission.
6. Embed HTTP contract: identical to Store_Embed (same URL, body, credential).
7. Merge jsCode: adapted by changing only the Prep reference name from `ME_Memory_Store_Prep` to `ME_Memory_Supersede_Prep`.
8. Rewire: +2 edges net (remove 1, add 3).
9. Node positions: y=1200, x values 2888/3008 (above the supersede row at y=1320).

No hard blockers. Proceeding to DESIGN_FREEZE.
