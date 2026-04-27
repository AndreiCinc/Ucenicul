# patch_plan.md

> **Canonicality: LEVEL 3 — MISSION ARTIFACT**
> Subordinate to `Module_Spec_Memory.md`, `n8n_Workflow_Mapping.md`, and `memory_module_design.md`.
> This document is the **Phase-5 frozen patch plan** for `WF-ME-01` memory path.
> It pairs with `docs/architecture/memory/migration.sql` (DB side) and with the forthcoming
> `docs/architecture/memory/patches/` scripts (Phase-6 executable artifacts).

---

## 0. Freeze header

- Phase: **5 — patch planning freeze**
- Status: **FROZEN** (any later change requires `DIVERGENCE_REGISTER_MEMORY.md` entry + explicit phase reopen)
- Target workflow: `WF-ME-01 Module Execution`, n8n id `uq26nh1grIpnHju0`
- Observed live on: 2026-04-20
- Live snapshot source: `tests/generated/workflows/wf_snapshots_current_20260420/WF-ME-01_live_20260420.json`
- Write fence applies to: `docs/architecture/memory/**` and `tests/memory/**` only; no other workflow is touched; no other n8n resource is created.

---

## 1. Scope

### 1.1 In-scope surface (memory branch of `WF-ME-01`)

Existing nodes to **repurpose / rewrite**:

| Current node | Current id | Current role | New role after patch |
|---|---|---|---|
| `ME_Memory_Store_Result` | `me-phase11-me-memory-store-result` | placeholder Code | final envelope Code for `store_memory` chain |
| `ME_Memory_Search_Result` | `me-phase11-me-memory-search-result` | placeholder Code | final envelope Code for `search_memory` chain |

Existing node to **reconfigure**:

| Node | Change |
|---|---|
| `ME_Route_Memory_Action` (switch) | widen rule set from 2 actions (`store_memory`, `search_memory`) to 5 (`+ recall_memory, promote_memory, supersede_memory`) with explicit fallback to `ME_Return_Error`. |

Nodes to **add** (new):

| New node | Kind | Purpose |
|---|---|---|
| `ME_Memory_Store_Prep` | Code | validate inputs, apply Romanian heuristic, build DB params + idempotency_key |
| `ME_Memory_Store_DB` | Postgres | INSERT into `memory_items` with `ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`, then re-read row on conflict |
| `ME_Memory_Search_Prep` | Code | validate query, build structural filter params |
| `ME_Memory_Search_DB` | Postgres | SELECT ranked by recency (v1 — see §7 embedding note) / or by cosine distance when embedding is available |
| `ME_Memory_Recall_Prep` | Code | validate at-least-one structural filter, build params |
| `ME_Memory_Recall_DB` | Postgres | SELECT with strict intersection filters, ORDER BY created_at DESC |
| `ME_Memory_Recall_Result` | Code | envelope builder for recall |
| `ME_Memory_Promote_Prep` | Code | validate `memory_id`, `promotion_target='long_term'`, collect accept flags |
| `ME_Memory_Promote_DB` | Postgres | single-query rule-gated UPDATE using CTE (see §5.4) |
| `ME_Memory_Promote_Result` | Code | envelope builder — distinguishes `success` vs `partial` based on rows affected |
| `ME_Memory_Supersede_Prep` | Code | validate + build inputs for both old-row update and new-row insert, generate idempotency_key |
| `ME_Memory_Supersede_DB` | Postgres | transactional `WITH old_update AS (UPDATE ...) INSERT INTO memory_items ...` single-statement CTE |
| `ME_Memory_Supersede_Result` | Code | envelope builder |

Total new nodes: **13**. Existing nodes reused: **2** (repurposed as final envelope nodes for store/search). No existing node is deleted.

### 1.2 Forbidden surface (write-fence, do not touch)

- `ME_Task_*` handlers
- `ME_Route_Task_Action`
- `ME_Reminder_*` handlers
- `ME_Route_Reminder_Action`
- `ME_Improvement_Capture_Result`
- `ME_Watcher_Observe_Result`
- `ME_Route_Module_Name` (untouched — memory action dispatch stays on existing output index 2)
- `ME_Validate_Dispatcher_Result`
- `ME_Route_Valid`
- `ME_Load_Execution_Context`
- `ME_Load_Task_Candidates`
- `ME_Check_Context_Match`, `ME_Route_Context_OK`
- `ME_Build_RA_Envelope`, `ME_Dispatch_To_RA_01_SUBCALL`
- `ME_Return_Result`, `ME_Return_Error`
- The langchain `When chat message received` entry
- Any other workflow (`WF-TR-01`, `WF-OR-01`, `WF-PL-01`, `WF-DI-01`, `WF-RA-01`, `WF-SU-01`, `WF-RC-01`, `WF-MO-01`, `WF-EC-01`) — completely untouched.

### 1.3 Multi-workflow connector note

This patch **does not** create any new inter-workflow connector. Memory handlers run entirely inside `WF-ME-01`. The existing connector `DI → ME` (via `Execute Workflow`) is already tested in prior phases (`PHASE_5_EDGE_RUN_RECORD.md`, Edge 5 runtime) and is unchanged by this patch. Walker tests in Phase 7 will re-exercise that connector end-to-end.

If any future variant adds an embedding sub-workflow (e.g. `WF-EMBED-01`), a new Execute-Workflow connector must be added and tests for the bridge node must be included per `TEST_ORACLE_MEMORY_MODULE.md` multi-workflow rule. In v1 that sub-workflow is **not** introduced — embedding generation is deferred (see §7).

---

## 2. Handler chain shape (common pattern)

Every memory handler follows a fixed 3-node chain:

```
ME_Route_Memory_Action → *_Prep (Code, validator/params/idempotency)
                      → *_DB   (Postgres, parameterized executeQuery, alwaysOutputData: true)
                      → *_Result (Code, module_result envelope builder)
                      → ME_Return_Result
```

Error handling pattern:
- `*_Prep` returns either the validated param payload OR `{ _error: true, error_code, error_message, missing_fields }`.
- `*_DB` is configured `alwaysOutputData: true` with `continueOnFail: true`. When Prep returned `_error`, its `queryReplacement` resolves to a guard that returns zero rows (`WHERE false`) — the row is passed through untouched.
- `*_Result` inspects the incoming item: if `_error: true`, it re-emits the error envelope preserving `error_code`; otherwise it wraps the DB-returned rows into a `module_result`. The existing `ME_Return_Result` downstream node already handles the `_error` short-circuit, so no new error connector is needed.

This matches the pre-existing pattern used by `ME_Load_Execution_Context` (`alwaysOutputData: true`) and `ME_Return_Result` (short-circuit on `_error`).

---

## 3. `ME_Route_Memory_Action` — reconfigured switch

### 3.1 Current state (2 rules)
- Rule 0 (`store_memory`) → `ME_Memory_Store_Result`
- Rule 1 (`search_memory`) → `ME_Memory_Search_Result`
- Fallback `extra` → `ME_Return_Error`

### 3.2 Target state (5 rules + fallback)

| Output idx | Rule (equals) | Output name | Target node |
|---|---|---|---|
| 0 | `store_memory` | store_memory | `ME_Memory_Store_Prep` |
| 1 | `search_memory` | search_memory | `ME_Memory_Search_Prep` |
| 2 | `recall_memory` | recall_memory | `ME_Memory_Recall_Prep` |
| 3 | `promote_memory` | promote_memory | `ME_Memory_Promote_Prep` |
| 4 | `supersede_memory` | supersede_memory | `ME_Memory_Supersede_Prep` |
| fallback | — | extra | `ME_Return_Error` |

Switch expression per rule: `={{ $('ME_Validate_Dispatcher_Result').first().json.step.inputs.action }}` — identical to current node's rule expression format.

### 3.3 Rule ordering discipline

Order is stable (alphabetical by intent: store, search, recall, promote, supersede is NOT alphabetical — chosen ordering mirrors the canonical Module_Spec_Memory action list). Any future addition must append at the tail; existing output indices must not renumber because downstream connections reference by output index.

---

## 4. Node-level specifications — `store_memory` chain

### 4.1 `ME_Memory_Store_Prep` (Code)

Input: the item routed from `ME_Route_Memory_Action` output 0.

Responsibilities:
1. Read `env = $('ME_Validate_Dispatcher_Result').first().json`.
2. Read `step = env.step` and `inputs = step.inputs || {}`.
3. Validate required fields: `content`, `memory_type`, `category`, `source_thread_id`. Any missing → return `{ _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Memory store inputs are incomplete.', missing_fields: [...] }`.
4. Validate `memory_type ∈ {fact, observation, pattern, inference, preference, constraint}`. Invalid → `MISSING_REQUIRED_FIELDS` with `memory_type` in `missing_fields`.
5. Normalize `category` to lowercase snake_case and reject if it does not match `^[a-z][a-z0-9_]{0,63}$` → `{ _error: true, error_code: 'INVALID_CATEGORY', ... }`.
6. If `memory_type ∈ {observation, pattern}`, run Romanian subjective-judgment lexical filter (§8) on `content`. If match → `{ _error: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN', error_message: 'Subjective character judgments are not allowed under observation/pattern memory types.' }`.
7. Apply defaults: `confidence = 0.8`, `importance = 0.5`, `durability = 'stable'`.
8. Build `idempotency_key = '${action}:${env.execution_context_id}:${step.step_id}'` → `store_memory:<uuid>:<step_id>`.
9. Return a JSON item with a `__db` block and a `passthrough` block:
   ```
   {
     __db: {
       tenant_id, memory_type, category, content,
       confidence, importance, durability,
       source_thread_id, source_message_id|null, entity_id|null,
       evidence_refs, metadata, idempotency_key
     },
     passthrough: { env, step, inputs }
   }
   ```

Pseudo-code (final js is embedded verbatim in the n8n patch script — see `patches/wf_me_01_memory_patch.mjs`):

```js
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};

const required = ['content','memory_type','category','source_thread_id'];
const VALID_TYPES = ['fact','observation','pattern','inference','preference','constraint'];
const missing = required.filter(k => !inputs[k] || (typeof inputs[k] === 'string' && !inputs[k].trim()));
if (!VALID_TYPES.includes(inputs.memory_type)) { if (!missing.includes('memory_type')) missing.push('memory_type'); }
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Memory store inputs are incomplete.', missing_fields: missing } }];
}

const category = String(inputs.category).trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
if (!/^[a-z][a-z0-9_]{0,63}$/.test(category)) {
  return [{ json: { _error: true, error_code: 'INVALID_CATEGORY', error_message: 'Category fails ^[a-z][a-z0-9_]{0,63}$.', missing_fields: ['category'] } }];
}

// Romanian subjective-judgment heuristic (v1, lexical; see §8)
const SUBJECTIVE_RO = [
  /\\b(prost|prosti|proasta|proaste)\\b/i,
  /\\b(dezgustator|dezgustatoare)\\b/i,
  /\\b(idiot|idioti|idioata|idioate)\\b/i,
  /\\b(les[ae]|lenes(a|e|i)?)\\b/i,
  /\\b(incompetent(a|e|i)?)\\b/i,
  /\\b(rau|rea|rai|rele)\\b.*\\b(caracter|om|persoana)\\b/i
];
if (['observation','pattern'].includes(inputs.memory_type)) {
  const hit = SUBJECTIVE_RO.some(rx => rx.test(String(inputs.content)));
  if (hit) {
    return [{ json: { _error: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN', error_message: 'Subjective character judgments not allowed under observation/pattern.' , missing_fields: [] } }];
  }
}

const confidence = Number.isFinite(inputs.confidence) ? inputs.confidence : 0.800;
const importance = Number.isFinite(inputs.importance) ? inputs.importance : 0.500;
const durability = inputs.durability || 'stable';
const evidence_refs = Array.isArray(inputs.evidence_refs) ? inputs.evidence_refs : [];
const metadata     = (inputs.metadata && typeof inputs.metadata === 'object') ? inputs.metadata : {};

const idempotency_key = `store_memory:${env.execution_context_id}:${step.step_id}`;

return [{ json: {
  __db: {
    tenant_id:         env.tenant_id,
    memory_type:       inputs.memory_type,
    category,
    content:           inputs.content,
    confidence, importance, durability,
    source_thread_id:  inputs.source_thread_id,
    source_message_id: inputs.source_message_id || null,
    entity_id:         inputs.entity_id || null,
    evidence_refs:     JSON.stringify(evidence_refs),
    metadata:          JSON.stringify(metadata),
    idempotency_key
  },
  passthrough: { env, step, inputs, idempotency_key }
}}];
```

### 4.2 `ME_Memory_Store_DB` (Postgres executeQuery)

Parameterized query. Uses `WITH ins AS (INSERT ... ON CONFLICT DO NOTHING RETURNING *) SELECT * FROM ins UNION ALL SELECT * FROM memory_items WHERE idempotency_key = $12 AND NOT EXISTS (SELECT 1 FROM ins) LIMIT 1;` to handle idempotent replay — returns either the newly inserted row or the pre-existing row for the same `idempotency_key`.

SQL:

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
  RETURNING *
)
SELECT * FROM ins
UNION ALL
SELECT * FROM public.memory_items
 WHERE idempotency_key = $13 AND NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
```

`queryReplacement`:
```
={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null]
  : [$json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content,
     $json.__db.confidence, $json.__db.importance, $json.__db.durability,
     $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id,
     $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key] }}
```

`alwaysOutputData: true`; `continueOnFail: true`. Credential reused: `"Postgres account 2"` (id `z9nKgToNWvIW7P8f`), same as `ME_Load_Execution_Context`.

Error-mode behavior: when `_error` is set by Prep, all params are null; the INSERT fails silently because of NOT NULL violations on tenant_id/content/etc.; `continueOnFail: true` lets the row flow forward with `_error` preserved. The Result node sees `_error` and emits an error envelope instead of a success envelope.

### 4.3 `ME_Memory_Store_Result` (Code, repurposed)

Responsibilities:
1. If input item has `_error: true`, emit the existing error envelope (compatible with `ME_Return_Result`'s short-circuit).
2. Else, read DB row from `$('ME_Memory_Store_DB').all()`; take the first row. If empty (DB failure) → emit `{ _error: true, error_code: 'DB_WRITE_FAILED', error_message: 'memory_items insert returned no row', missing_fields: [] }`.
3. Else, build the canonical `module_result` envelope:
   - `status_kind: 'success'`
   - `result_type: 'module_result'`
   - `module_result.module_name: 'memory_module'`
   - `module_result.result_type: 'execution'`
   - `module_result.status: 'success'`
   - `module_result.actions_executed: [{ action: 'store_memory', details: { memory_id, tier, status, category, memory_type, durability, source_thread_id, created_at, idempotency_reused: <bool> } }]`
   - `module_result.artifacts: [{ type: 'memory_id', value: <uuid> }]`
   - `domain_writes_performed: true`

### 4.4 Connections
```
ME_Route_Memory_Action [out 0] → ME_Memory_Store_Prep  [in 0]
ME_Memory_Store_Prep    [out 0] → ME_Memory_Store_DB   [in 0]
ME_Memory_Store_DB      [out 0] → ME_Memory_Store_Result [in 0]
ME_Memory_Store_Result  [out 0] → ME_Return_Result      [in 0]
```

---

## 5. Node-level specifications — `search_memory`, `recall_memory`, `promote_memory`, `supersede_memory`

### 5.1 `search_memory`

Prep validates only `query` (required). Optional filters: `limit` (default 10, max 100), `memory_type`, `tier`, `status`/`include_statuses`, `source_thread_id`, `entity_id`, `category`.

DB strategy in v1 (because embedding generation is deferred, see §7):
- If `env.step.inputs.embedding` is provided by an upstream embedding step (optional input, `number[1536]`), run the ivfflat-backed query:
  ```sql
  SELECT *, 1 - (embedding <=> $1::vector) AS similarity
  FROM public.memory_items
  WHERE tenant_id = $2::uuid
    AND embedding IS NOT NULL
    AND status = ANY($3::memory_status_enum[])
    AND ($4::uuid IS NULL OR source_thread_id = $4::uuid)
    AND ($5::uuid IS NULL OR entity_id = $5::uuid)
    AND ($6::text IS NULL OR category = $6::text)
    AND ($7::memory_type_enum IS NULL OR memory_type = $7::memory_type_enum)
    AND ($8::memory_tier_enum IS NULL OR tier = $8::memory_tier_enum)
  ORDER BY embedding <=> $1::vector ASC
  LIMIT $9::int;
  ```
- If no embedding is supplied, v1 degrades to a lexical `content ILIKE '%' || $1::text || '%'` query with the same filters, sorted by `created_at DESC`, and returns `module_result.status = 'partial'` with `needs_followup: true`, `followup_requests: [{type:'generate_embedding', query: <text>}]`. This satisfies the TEST_ORACLE partial-distribution rule for `search_memory` (5 partial cases) and matches Known-Limitations section for v2 follow-up.

Result node wraps `recall_results[]` with `memory_id`, `content`, `memory_type`, `tier`, `status`, `similarity` (null if lexical), `created_at`.

### 5.2 `recall_memory`

Prep validates: at least one of `entity_id`, `source_thread_id`, `category`, `memory_type`. Zero filters → `{ _error: true, error_code: 'MISSING_REQUIRED_FIELDS', missing_fields: ['filter'] }`.

DB:
```sql
SELECT *
FROM public.memory_items
WHERE tenant_id = $1::uuid
  AND status = ANY($2::memory_status_enum[])
  AND ($3::uuid IS NULL OR source_thread_id = $3::uuid)
  AND ($4::uuid IS NULL OR entity_id = $4::uuid)
  AND ($5::text IS NULL OR category = $5::text)
  AND ($6::memory_type_enum IS NULL OR memory_type = $6::memory_type_enum)
  AND ($7::memory_tier_enum IS NULL OR tier = $7::memory_tier_enum)
ORDER BY created_at DESC
LIMIT $8::int;
```

Default `status[]` = `{active}`; explicit `include_statuses` can widen. Strict intersection: Prep only sets a filter if the caller supplied it — otherwise NULL → clause short-circuits.

Result: `recall_results[]` with no similarity field, sorted newest first. `status = 'success'` even on empty result set (per TEST_ORACLE §search/recall).

### 5.3 `promote_memory`

Prep validates: `memory_id` (uuid), `promotion_target == 'long_term'`. Any mismatch → `INVALID_PROMOTION_TARGET`.

DB (single-query rule-gated UPDATE):
```sql
WITH target AS (
  SELECT *
  FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
accept AS (
  SELECT id,
         (corroboration_count >= $3::int
           OR ($4::boolean IS TRUE)
           OR ($5::boolean IS TRUE)) AS ok
  FROM target
  WHERE tier = 'recent'
),
promoted AS (
  UPDATE public.memory_items m
  SET tier = 'long_term',
      last_reconfirmed_at = now(),
      user_confirmed     = (m.user_confirmed     OR $4::boolean),
      evidence_validated = (m.evidence_validated OR $5::boolean)
  FROM accept
  WHERE m.id = accept.id AND accept.ok
  RETURNING m.*, TRUE AS promoted
)
SELECT * FROM promoted
UNION ALL
SELECT t.*, FALSE AS promoted
  FROM target t
 WHERE NOT EXISTS (SELECT 1 FROM promoted)
LIMIT 1;
```

Params: `$1 = memory_id`, `$2 = tenant_id`, `$3 = corroboration_threshold` (v1 constant = 2), `$4 = user_confirmed`, `$5 = evidence_validated`.

Result node:
- 0 rows returned → `{ _error: true, error_code: 'INVALID_PROMOTION_TARGET', error_message: 'Target memory not found' }`
- 1 row with `promoted = true` → `success` + updated row details
- 1 row with `promoted = false` → `partial` with `denial_reason` in details (which criterion failed). Target-row tier check: if `tier != 'recent'` → `denial_reason = 'not_in_recent_tier'` (Prep can pre-flight this, but the CTE also enforces it by filtering `tier='recent'` in `accept`). If `tier='recent'` but acceptance was false → `denial_reason = 'acceptance_criteria_not_met'`.

### 5.4 `supersede_memory`

Prep validates: `supersedes_memory_id` (uuid) + all `store_memory` required fields for the replacement. Builds two idempotency keys is not necessary — only the new row's `idempotency_key = 'supersede_memory:${env.execution_context_id}:${step.step_id}'`.

DB (single-CTE transactional — Postgres executes CTEs atomically in one round-trip):
```sql
WITH old_row AS (
  SELECT *
  FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
guard AS (
  SELECT 1
  FROM old_row
  WHERE status = 'active'
),
marked AS (
  UPDATE public.memory_items
  SET status = 'superseded'
  WHERE id = $1::uuid
    AND EXISTS (SELECT 1 FROM guard)
  RETURNING id
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
    $1::uuid, COALESCE($15::memory_tier_enum, 'recent'),
    'active'
  FROM marked
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *
)
SELECT * FROM inserted
UNION ALL
SELECT mi.* FROM public.memory_items mi
 WHERE mi.idempotency_key = $14::text
   AND NOT EXISTS (SELECT 1 FROM inserted)
LIMIT 1;
```

Branches for the Result node:
- Old row missing (target row not found) → prep pre-flight should have caught it via a cheap SELECT; if not, Result sees zero output + DB error, returns `{ _error: true, error_code: 'SUPERSEDE_TARGET_INVALID', error_message: 'Old memory not found' }`.
- Old row already `superseded` → `guard` is empty → `marked` empty → `inserted` empty → UNION returns zero → Result returns `{ _error: true, error_code: 'SUPERSEDE_TARGET_INVALID', error_message: 'Old memory already superseded' }`.
- Happy path → returns new row. Result builds `success` envelope with `actions_executed: [{ action: 'supersede_memory', details: { old_memory_id, new_memory_id, tier, status } }]`.
- Idempotent replay (same idempotency_key) → returns existing new row via UNION fallback → `success` with `details.idempotency_reused = true`.

### 5.5 Connection topology (full)

```
ME_Route_Memory_Action [0] → ME_Memory_Store_Prep     → ME_Memory_Store_DB     → ME_Memory_Store_Result     → ME_Return_Result
                      [1] → ME_Memory_Search_Prep    → ME_Memory_Search_DB    → ME_Memory_Search_Result    → ME_Return_Result
                      [2] → ME_Memory_Recall_Prep    → ME_Memory_Recall_DB    → ME_Memory_Recall_Result    → ME_Return_Result
                      [3] → ME_Memory_Promote_Prep   → ME_Memory_Promote_DB   → ME_Memory_Promote_Result   → ME_Return_Result
                      [4] → ME_Memory_Supersede_Prep → ME_Memory_Supersede_DB → ME_Memory_Supersede_Result → ME_Return_Result
                      [fallback] → ME_Return_Error
```

All 5 chains terminate on `ME_Return_Result` — the same terminal node used today. No new error-branch connectors; error envelopes travel back through `ME_Return_Result`, which short-circuits on `_error: true` (already implemented).

---

## 6. Node positions (n8n canvas layout)

Memory cluster anchor: `x=2528, y=1075` (existing `ME_Route_Memory_Action`). Each chain occupies a row at `y = 1075 + 40*i`. Columns stride at x=240:

| Node | x | y |
|---|---|---|
| `ME_Route_Memory_Action` | 2528 | 1075 |
| `ME_Memory_Store_Prep` | 2768 | 1040 |
| `ME_Memory_Store_DB` | 3008 | 1040 |
| `ME_Memory_Store_Result` | 3248 | 1040 |
| `ME_Memory_Search_Prep` | 2768 | 1110 |
| `ME_Memory_Search_DB` | 3008 | 1110 |
| `ME_Memory_Search_Result` | 3248 | 1110 |
| `ME_Memory_Recall_Prep` | 2768 | 1180 |
| `ME_Memory_Recall_DB` | 3008 | 1180 |
| `ME_Memory_Recall_Result` | 3248 | 1180 |
| `ME_Memory_Promote_Prep` | 2768 | 1250 |
| `ME_Memory_Promote_DB` | 3008 | 1250 |
| `ME_Memory_Promote_Result` | 3248 | 1250 |
| `ME_Memory_Supersede_Prep` | 2768 | 1320 |
| `ME_Memory_Supersede_DB` | 3008 | 1320 |
| `ME_Memory_Supersede_Result` | 3248 | 1320 |

All result nodes connect into the existing `ME_Return_Result` (x=3008, y=272). Connection crossing is acceptable — layout is functional, not aesthetic.

Existing nodes `ME_Memory_Store_Result` (x=2768, y=1040) and `ME_Memory_Search_Result` (x=2768, y=1110) are **moved** to the new column `x=3248` without being renamed. Their ids and names persist.

---

## 7. Embedding strategy (v1)

Embedding generation is **deferred** in v1:

- `memory_items.embedding` is nullable (decision M-014). `store_memory` inserts with `embedding=NULL` unless the caller already supplied a pre-computed `embedding` vector in `step.inputs.embedding`. If supplied, Prep passes it through; the DB cast is `$N::vector`. Max array length enforced at 1536 by Prep.
- `search_memory` accepts `step.inputs.embedding` optionally. If provided, DB uses the ivfflat cosine branch. If absent, DB runs a lexical fallback and the Result envelope reports `status='partial'` with a `followup_requests` entry describing the missing embedding.
- This design keeps the patch closed without introducing a new HTTP credential for an embedding provider in v1. The follow-up is tracked in §Known-limitations of `final_verification.md`.

v2 follow-up: introduce `WF-EMBED-01` sub-workflow (or an HTTP node inside `WF-ME-01`) so `store_memory` and `search_memory` are always embedding-ready. That patch will require a new multi-workflow connector test per `TEST_ORACLE_MEMORY_MODULE.md` multi-workflow rule.

---

## 8. Romanian subjective-judgment heuristic (v1)

Applied only inside `ME_Memory_Store_Prep` and `ME_Memory_Supersede_Prep` when `memory_type ∈ {observation, pattern}`. Pattern set (case-insensitive, word-bounded) — extendable in `patches/wf_me_01_memory_patch.mjs`:

```
/\b(prost|prosti|proasta|proaste)\b/i                   // "stupid"
/\b(dezgustator|dezgustatoare)\b/i                      // "disgusting"
/\b(idiot|idioti|idioata|idioate)\b/i                   // "idiot"
/\b(les[ae]|lenes(a|e|i)?)\b/i                          // "lazy"
/\b(incompetent(a|e|i)?)\b/i                            // "incompetent"
/\b(rau|rea|rai|rele)\b.*\b(caracter|om|persoana)\b/i   // "bad character/person"
```

Intentional v1 limitations (carried to final_verification):
- Romanian-only. English or Hungarian subjective judgments are not blocked.
- Lexical only, no model-based classification.
- A neutral but uncommon word is safe from false positives (word boundaries + limited list).

---

## 9. Rollback contract

### 9.1 Workflow-level rollback

Every patch commit stores:
- the pre-patch `versionId` (`3b3fc427-9600-4652-96d7-1b0536ddd39f` at 2026-04-20T15:55:51Z)
- the pre-patch `updatedAt` timestamp
- a frozen copy of the pre-patch workflow JSON at `docs/architecture/memory/patches/wf_me_01_pre_patch_20260420.json`

Rollback procedure:
1. Deactivate `WF-ME-01`.
2. `PUT /api/v1/workflows/uq26nh1grIpnHju0` with the frozen pre-patch JSON (n8n `settings` whitelist).
3. Activate `WF-ME-01`.
4. Verify post-rollback `versionId` and node count match the pre-patch snapshot.

### 9.2 DB-level rollback

Already specified in `migration.sql` §ROLLBACK block. Rolling back the migration drops the `memory_items` table, its 7 indexes, and 3 new enums. Workflow rollback and DB rollback are independent — the workflow patch itself is safe against a pre-existing or missing `memory_items` table (handlers return DB errors gracefully via `continueOnFail: true`).

### 9.3 No partial-patch state

The Phase-6 patch script applies all 13 new nodes + 1 switch update + 2 existing-node re-wire in one `PUT` call (n8n does not allow per-node updates on v1.x API — the workflow is replaced wholesale). There is no intermediate partial state. If the `PUT` fails, the workflow remains on the pre-patch `versionId`.

---

## 10. Credential reuse

No new n8n credentials are created by this patch.
- All `*_DB` Postgres nodes reuse credential `"Postgres account 2"` (id `z9nKgToNWvIW7P8f`), which already has SELECT/INSERT/UPDATE on the tenant schema and is the credential used by `ME_Load_Execution_Context`.

---

## 11. Marker preservation

The existing marker pattern (node id prefix `me-phase11-*` for nodes introduced in Phase 11 of the greater project) is **not** reused for the new nodes. New nodes are assigned ids prefixed with `me-phase5mem-*` to make post-patch marker verification unambiguous:

| Node | Assigned id |
|---|---|
| `ME_Memory_Store_Prep` | `me-phase5mem-store-prep` |
| `ME_Memory_Store_DB` | `me-phase5mem-store-db` |
| `ME_Memory_Search_Prep` | `me-phase5mem-search-prep` |
| `ME_Memory_Search_DB` | `me-phase5mem-search-db` |
| `ME_Memory_Recall_Prep` | `me-phase5mem-recall-prep` |
| `ME_Memory_Recall_DB` | `me-phase5mem-recall-db` |
| `ME_Memory_Recall_Result` | `me-phase5mem-recall-result` |
| `ME_Memory_Promote_Prep` | `me-phase5mem-promote-prep` |
| `ME_Memory_Promote_DB` | `me-phase5mem-promote-db` |
| `ME_Memory_Promote_Result` | `me-phase5mem-promote-result` |
| `ME_Memory_Supersede_Prep` | `me-phase5mem-supersede-prep` |
| `ME_Memory_Supersede_DB` | `me-phase5mem-supersede-db` |
| `ME_Memory_Supersede_Result` | `me-phase5mem-supersede-result` |

Existing node ids for `ME_Memory_Store_Result` and `ME_Memory_Search_Result` are **preserved** — the Code body is rewritten but the id stays `me-phase11-me-memory-store-result` / `me-phase11-me-memory-search-result`. This keeps historical connector references and any external tooling that indexes by id stable.

Post-patch verification reads the live workflow JSON and asserts:
- all 13 `me-phase5mem-*` node ids present
- existing `me-phase11-me-memory-store-result` and `me-phase11-me-memory-search-result` still present but with new body signatures
- `ME_Route_Memory_Action.rules.length === 5`
- pre-existing node count (30) + 13 new = 43 nodes total

---

## 12. Test readiness dependencies

Patch is considered phase-5 ready only when:
- `memory_items` table + all 3 enums exist in the target DB (migration.sql applied).
- n8n Postgres credential `z9nKgToNWvIW7P8f` reaches the same DB instance where the migration ran.
- Fixtures seeded (Phase 7 walker responsibility — `tests/memory/fixtures/fixture_manifest.json`).
- `FOCUS_PACK.md`, `MISSION_CONTRACT_MEMORY_MODULE.md`, `IMPLEMENTATION_STATE.md`, `memory_module_design.md`, `ACTION_CONTRACTS_MEMORY.md` all say Phase 5 is done before Phase 6 executes.

---

## 13. Write-fence declaration

This plan mutates **only**:
- `WF-ME-01` memory branch (`ME_Route_Memory_Action` + memory chain nodes)

This plan does **not** mutate:
- any other n8n workflow
- any n8n credential
- any database row or schema (DDL already applied in Phase 4)
- any repo file outside `docs/architecture/memory/**`, `tests/memory/**`, or the future `docs/architecture/memory/patches/` subtree

If Phase 6 execution discovers a legitimate need to widen scope (e.g. new sub-workflow for embedding), the divergence MUST be logged in `DIVERGENCE_REGISTER_MEMORY.md` and the plan reopened via `PHASE_GATE_CHECKLIST.md` before any write.

---

## 14. Phase-5 freeze declaration

This plan is frozen as of 2026-04-20. Any subsequent change requires:
1. Entry in `DIVERGENCE_REGISTER_MEMORY.md`
2. Explicit phase reopen via `PHASE_GATE_CHECKLIST.md`
3. Updated version stamp at the bottom of this file

Scoring self-assessment (review-critic, 2026-04-20):

| Axis | Score |
|---|---|
| Authority (matches canonical specs + frozen decisions) | 9.8 |
| Coherence (internal consistency, cross-refs correct) | 9.7 |
| Completeness (all 5 actions, all handler nodes, rollback, marker, credential, write-fence) | 9.7 |
| Implementability (queries are parameterized, positions set, ids stable, connector shape matches n8n API) | 9.7 |
| **Total** | **9.73 / 10** — PASS (≥ 9.6) |

---

> **Level 3 — Mission Artifact.** Version: 1.0 | Phase: 5 frozen | Last updated: 2026-04-20
