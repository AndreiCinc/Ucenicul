# F6A-FOLLOWUP-SUPERSEDE-EMBED — Design Freeze

Mission: `F6A-FOLLOWUP-SUPERSEDE-EMBED`
Frozen: 2026-04-24 (Phase 2).
Baseline: `versionId=c07fe923-76eb-4901-b53b-14039536df55`, 47 nodes, 65 connections, active=true.

## 1. Smallest safe diff surface

Only the supersede lane is touched. Two nodes added; one node's `parameters.query` + `parameters.options.queryReplacement` modified; one edge removed, three edges added. No settings change; no other node touched.

## 2. New nodes (exact spec)

### `ME_Memory_Supersede_Embed`

- Type: `n8n-nodes-base.httpRequest`
- typeVersion: `4.2` (match Store_Embed)
- id: `me-f6af-supersede-embed`
- position: `[2888, 1200]`
- credentials: `{ "openAiApi": { "id": "svM62oyFwPbaIeX4", "name": "OpenAi account" } }`
- parameters:
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

Rationale: byte-identical to Store_Embed except for node name + id. Input `$json.__db.content` is the replacement-row content (same as store-path), confirmed by cartography §Supersede_Prep output contract.

### `ME_Memory_Supersede_Embed_Merge`

- Type: `n8n-nodes-base.code`
- typeVersion: `2`
- id: `me-f6af-supersede-embed-merge`
- position: `[3008, 1200]`
- credentials: null
- parameters.jsCode: (pure function, mirrors Store_Embed_Merge with only the Prep reference renamed):

  ```js

  const prep = $('ME_Memory_Supersede_Prep').first().json;
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

Rationale: the only text diff vs Store_Embed_Merge is the Prep node reference on line 2. Everything else is byte-identical for symmetry. Downstream consumers read `__db.embedding_text` + `passthrough.{used_embedding, embedding_attempted, embedding_error}` exactly as in F6A.

The merge is a **pure function of `{prep, httpResp}`** once the `$()` lookup returns — the harness copy we build in Phase 4 will inline the `$('…Prep')` lookup as a parameter, producing a Node-testable pure function with signature `mergeSupersedeEmbedding(prep, httpResp)`.

## 3. Modified node: `ME_Memory_Supersede_DB`

Only `parameters.query` and `parameters.options.queryReplacement` change. Everything else on the node is byte-identical (credentials, typeVersion, position, continueOnFail, id).

### New SQL (with additions marked `-- NEW`)

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
    supersedes_memory_id, tier, status, embedding                    -- NEW: embedding appended
  )
  SELECT
    $2::uuid, $3::memory_type_enum, $4::text, $5::text,
    $6::numeric, $7::numeric, $8::rag_durability_enum,
    $9::uuid, $10::uuid, $11::uuid,
    $12::jsonb, $13::jsonb, $14::text,
    $1::uuid, $15::memory_tier_enum, 'active',
    CASE WHEN $16::text IS NULL THEN NULL ELSE $16::vector(1536) END  -- NEW: CASE-guarded $16
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

### New queryReplacement

```
={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.old_id, $json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key, $json.__db.tier, $json.__db.embedding_text] }}
```

- Error branch: 15 → **16** NULLs.
- Success branch: 15 → **16** slots (`$json.__db.embedding_text` appended).
- `continueOnFail=true` preserved (OBS-E5 demotion pattern unchanged — same as F6A, accepted per F6A_RECONCILIATION.md §3).

## 4. Connection edits (exactly 4)

1. Remove: `ME_Memory_Supersede_Prep → ME_Memory_Supersede_DB` (main/0).
2. Add: `ME_Memory_Supersede_Prep → ME_Memory_Supersede_Embed` (main/0).
3. Add: `ME_Memory_Supersede_Embed → ME_Memory_Supersede_Embed_Merge` (main/0).
4. Add: `ME_Memory_Supersede_Embed_Merge → ME_Memory_Supersede_DB` (main/0).

Net: `connectionCount 65 → 67` (+2).

## 5. Idempotency semantics (preserved)

- The `ON CONFLICT (idempotency_key) DO NOTHING` behavior is unchanged.
- On replay with the same `idempotency_key`, the `inserted` CTE returns 0 rows; the `UNION ALL` branch selects the pre-existing row by `idempotency_key` (which carries whatever `embedding` value the first write set). First-write-wins on the embedding is preserved by pgvector's column-level semantics and the CONFLICT clause.
- The `marked` CTE updates the old row's status to `'superseded'` only when the guard CTE finds an active row. On replay, the guard still passes if the old row is *still* active (rare, because first call already flipped it); otherwise the UPDATE is a no-op. The UNION ALL fallback returns the pre-existing replacement row regardless.

## 6. Failure behavior (graceful degradation)

### Embedding HTTP failure

- Merge sets `embedding_text=null`, `embedding_error='embedding_http_<code>'` or `'embedding_http_error: <msg>'`.
- DB `CASE WHEN $16::text IS NULL THEN NULL ELSE ...` emits `embedding=NULL`.
- Row still lands (old row superseded, replacement inserted) with `embedding=NULL`.
- This is a first-class F6A-parity property: supersede must not fail just because embedding HTTP failed.

### Prep `_error:true` (pre-existing behavior, unchanged)

- Merge short-circuits: returns `{json: prep}` verbatim.
- DB's queryReplacement sees `$json._error===true` → NULL×16 branch → INSERT fails on NOT-NULL constraints → `continueOnFail=true` catches it → Result node emits `DB_WRITE_FAILED` (OBS-E5 pattern, pre-existing).
- F6A_RECONCILIATION.md §3 classified this as accepted pre-F6A behavior. No regression from this mission.

## 7. Diff-surface invariants (DS-INV-1..14) — map to WD-1..WD-14 from pack

| DS-INV | Target assertion | Covered by harness |
|---|---|---|
| DS-INV-1 | post node count = pre + 2 | WD-1 |
| DS-INV-2 | post edge count = pre + 2 net | WD-2 |
| DS-INV-3 | exactly 2 new nodes named `ME_Memory_Supersede_Embed` and `ME_Memory_Supersede_Embed_Merge` | WD-3 + WD-12 |
| DS-INV-4 | Embed node has `type=httpRequest`, `openAiApi` cred, `authentication=predefinedCredentialType` | WD-4 |
| DS-INV-5 | Embed node jsonBody references `text-embedding-3-small`, `input`, and `$json.__db.<field>` | WD-5 |
| DS-INV-6 | Merge jsCode references `ME_Memory_Supersede_Prep`, `embedding_text`, and `1536` | WD-6 |
| DS-INV-7 | Supersede_DB SQL includes `embedding` + `vector(1536)` | WD-7 |
| DS-INV-8 | Supersede_DB SQL includes CASE-guard `WHEN $N::text IS NULL ... ELSE $N::vector(1536)` | WD-8 |
| DS-INV-9 | queryReplacement non-error branch adds exactly one `$json.__db.<field>` reference AND `embedding_text` | WD-9 |
| DS-INV-10 | queryReplacement error/null branch null-count +1 (when pre has null branch) | WD-10 |
| DS-INV-11 | non-target nodes byte-identical (by sorted sha256 of node object) | WD-11 |
| DS-INV-12 | only 2 new nodes added; no other additions | WD-12 |
| DS-INV-13 | supersede lane rewired: direct edge removed, 3 new edges added | WD-13 |
| DS-INV-14 | settings object in candidate JSON unchanged | WD-14 |

## 8. BUILD-INV-1..10 (builder properties)

| BUILD-INV | Property |
|---|---|
| BUILD-INV-1 | Builder reads pre snapshot deterministically; re-running on same input produces byte-identical output |
| BUILD-INV-2 | Exactly 2 nodes added (named as specified) |
| BUILD-INV-3 | Exactly 1 existing node modified (`ME_Memory_Supersede_DB`), only its `parameters.query` + `parameters.options.queryReplacement` |
| BUILD-INV-4 | All other 46 existing nodes are output-pass-through (deep-equal to input) |
| BUILD-INV-5 | Connections object has exactly 1 edge removed and 3 edges added; no other change |
| BUILD-INV-6 | Embed node: `input: $json.__db.content` expression in jsonBody |
| BUILD-INV-7 | Merge jsCode: `ME_Memory_Supersede_Prep` referenced in the `$()` lookup (not `Store_Prep`) |
| BUILD-INV-8 | Supersede_DB SQL: exactly 16 `$N` parameter binds; `$16` is the new CASE-guarded one; `$14` still used for the idempotency fallback |
| BUILD-INV-9 | queryReplacement: error branch = 16 NULLs; success branch = 16 `$json.__db.<field>` references; `embedding_text` appears last |
| BUILD-INV-10 | Output JSON sha256 captured and printed by the builder |

## 9. DB-INV-1..8 (DB invariants)

Per pack §F:

- DB-1: pre-apply rows with `embedding IS NULL` count unchanged post-apply (no backfill).
- DB-2: new supersede replacement rows (mission namespace) have `embedding IS NOT NULL` on success path.
- DB-3: vector dimension = 1536.
- DB-4: old superseded rows retain their prior `embedding` state; not overwritten.
- DB-5: idempotency — exactly 1 row per `idempotency_key`.
- DB-6: `idx_memory_items_embedding_cos` definition unchanged.
- DB-7: scope — only mission-namespace rows created by live smokes.
- DB-8: no direct DB writes by Claude (workflow-mediated only).

## 10. Rollback

- Pre snapshot at `artifacts/WF-ME-01_pre_f6a_followup.json` (sha256 `1b487734443891a6e7c70c2cf63e26aabc6bd288ca6cd67cf1188dad2c816906`).
- Rollback command: `n8n-patch.mjs replace uq26nh1grIpnHju0 <pre snapshot>`.
- Rollback invoked only if Phase 6 post-verify fails, or if Phase 7 E2E reveals a hard regression classifiable as blocker.

## 11. Differences vs F6A store-lane

| Dimension | F6A store-lane | F6A-followup supersede-lane |
|---|---|---|
| Inserted table | `memory_items` | `memory_items` |
| DB slots (pre) | 13 (`$1..$13`) | 15 (`$1..$15`) |
| DB slots (post) | 14 (`$1..$14`) | 16 (`$1..$16`) |
| New slot | `$14` = `embedding_text` | `$16` = `embedding_text` |
| Embed input | `$json.__db.content` | `$json.__db.content` |
| Merge Prep ref | `ME_Memory_Store_Prep` | `ME_Memory_Supersede_Prep` |
| Old-row UPDATE | n/a | preserved byte-identical |
| `supersedes_memory_id` | n/a (NULL in store) | `$1::uuid` (the old_id) |
| `continueOnFail` on DB | true | true |
| Idempotency fallback | UNION ALL by `$13::text` | UNION ALL by `$14::text` |
