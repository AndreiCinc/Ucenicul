#!/usr/bin/env node
/**
 * build_patch.mjs — Phase-6 patch builder for WF-ME-01 memory branch.
 *
 * Reads the pre-patch workflow JSON (frozen 2026-04-20 live snapshot) and
 * produces the post-patch workflow JSON by applying the frozen patch plan
 * (see ../patch_plan.md).
 *
 * Transformations applied:
 *   1. Repurpose ME_Memory_Store_Result  — rewrite jsCode to envelope-only
 *   2. Repurpose ME_Memory_Search_Result — rewrite jsCode to envelope-only
 *   3. Move these two nodes to column x=3248 (new envelope column)
 *   4. Extend ME_Route_Memory_Action switch to 5 rules + fallback
 *   5. Insert 13 new nodes (5 Prep Code nodes, 5 DB Postgres nodes,
 *      3 Result Code nodes for recall/promote/supersede)
 *   6. Rewire connections for all 5 chains → ME_Return_Result
 *
 * Usage:
 *   node build_patch.mjs                           # uses default paths
 *   node build_patch.mjs <input.json> <output.json>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const IN  = process.argv[2] || path.join(__dirname, 'wf_me_01_pre_patch_20260420.json');
const OUT = process.argv[3] || path.join(__dirname, 'wf_me_01_post_patch_20260420.json');

const PG_CRED = { id: 'z9nKgToNWvIW7P8f', name: 'Postgres account 2' };

// ----------------------------------------------------------------------------
// Embedded handler JavaScript bodies
// ----------------------------------------------------------------------------

const jsStorePrep = String.raw`
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};

const required = ['content','memory_type','category','source_thread_id'];
const VALID_TYPES = ['fact','observation','pattern','inference','preference','constraint'];
const missing = required.filter(k => !inputs[k] || (typeof inputs[k] === 'string' && !inputs[k].trim()));
if (!VALID_TYPES.includes(inputs.memory_type) && !missing.includes('memory_type')) missing.push('memory_type');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Memory store inputs are incomplete.', missing_fields: missing } }];
}

const category = String(inputs.category).trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
if (!/^[a-z][a-z0-9_]{0,63}$/.test(category)) {
  return [{ json: { _error: true, error_code: 'INVALID_CATEGORY', error_message: 'Category fails ^[a-z][a-z0-9_]{0,63}$.', missing_fields: ['category'] } }];
}

const SUBJECTIVE_RO = [
  /\b(prost|prosti|proasta|proaste)\b/i,
  /\b(dezgustator|dezgustatoare)\b/i,
  /\b(idiot|idioti|idioata|idioate)\b/i,
  /\b(lene[sș](a|e|i)?)\b/i,
  /\b(incompetent(a|e|i)?)\b/i,
  /\b(r[aă]u|rea|r[aă]i|rele)\b.*\b(caracter|om|persoana)\b/i
];
if (['observation','pattern'].includes(inputs.memory_type)) {
  if (SUBJECTIVE_RO.some(rx => rx.test(String(inputs.content)))) {
    return [{ json: { _error: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN', error_message: 'Subjective character judgments not allowed under observation/pattern.', missing_fields: [] } }];
  }
}

const confidence = Number.isFinite(inputs.confidence) ? inputs.confidence : 0.800;
const importance = Number.isFinite(inputs.importance) ? inputs.importance : 0.500;
const durability = inputs.durability || 'stable';
const evidence_refs = Array.isArray(inputs.evidence_refs) ? inputs.evidence_refs : [];
const metadata     = (inputs.metadata && typeof inputs.metadata === 'object') ? inputs.metadata : {};

const idempotency_key = 'store_memory:' + env.execution_context_id + ':' + step.step_id;

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
`;

const sqlStoreInsert = `WITH ins AS (
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
LIMIT 1;`;

const jsStoreResult = String.raw`
const input = $json;
if (input && input._error === true) {
  return [{ json: {
    _error: true,
    error_code: input.error_code,
    error_message: input.error_message,
    missing_fields: input.missing_fields || []
  }}];
}
const dbRows = $items().map(i => i.json);
const row = dbRows && dbRows[0];
if (!row || !row.id) {
  return [{ json: { _error: true, error_code: 'DB_WRITE_FAILED', error_message: 'memory_items insert returned no row', missing_fields: [] }}];
}
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: 'success',
    summary: 'Memory store completed.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'store_memory',
      details: {
        memory_id: row.id,
        tier: row.tier,
        status: row.status,
        memory_type: row.memory_type,
        category: row.category,
        durability: row.durability,
        source_thread_id: row.source_thread_id,
        created_at: row.created_at,
        idempotency_reused: row.inserted === false
      }
    }],
    artifacts: [{ type: 'memory_id', value: row.id }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: true,
  response_generation_allowed: false
}}];
`;

const jsSearchPrep = String.raw`
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
if (!inputs.query || (typeof inputs.query === 'string' && !inputs.query.trim())) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Memory search inputs are incomplete.', missing_fields: ['query'] } }];
}
const limit = Math.min(Math.max(parseInt(inputs.limit, 10) || 10, 1), 100);
const include_statuses = Array.isArray(inputs.include_statuses) && inputs.include_statuses.length
  ? inputs.include_statuses
  : [inputs.status || 'active'];

const embedding = Array.isArray(inputs.embedding) && inputs.embedding.length === 1536 ? inputs.embedding : null;

return [{ json: {
  __db: {
    tenant_id:        env.tenant_id,
    query_text:       inputs.query,
    embedding_json:   embedding ? JSON.stringify(embedding) : null,
    include_statuses,
    source_thread_id: inputs.source_thread_id || null,
    entity_id:        inputs.entity_id || null,
    category:         inputs.category || null,
    memory_type:      inputs.memory_type || null,
    tier:             inputs.tier || null,
    limit
  },
  passthrough: { env, step, inputs, used_embedding: !!embedding }
}}];
`;

const sqlSearchSemantic = `WITH params AS (
  SELECT $1::jsonb AS embedding_json,
         $2::uuid  AS tenant_id,
         $3::memory_status_enum[] AS statuses,
         $4::uuid  AS thread_id,
         $5::uuid  AS entity_id,
         $6::text  AS category,
         $7::memory_type_enum AS memory_type,
         $8::memory_tier_enum AS tier,
         $9::int   AS lim
)
SELECT mi.*,
       CASE WHEN (SELECT embedding_json FROM params) IS NOT NULL
            THEN 1 - (mi.embedding <=> ((SELECT embedding_json FROM params)->>'v')::vector)
            ELSE NULL END AS similarity,
       FALSE AS lexical_fallback
FROM public.memory_items mi, params p
WHERE mi.tenant_id = p.tenant_id
  AND mi.embedding IS NOT NULL
  AND p.embedding_json IS NOT NULL
  AND mi.status = ANY(p.statuses)
  AND (p.thread_id   IS NULL OR mi.source_thread_id = p.thread_id)
  AND (p.entity_id   IS NULL OR mi.entity_id        = p.entity_id)
  AND (p.category    IS NULL OR mi.category         = p.category)
  AND (p.memory_type IS NULL OR mi.memory_type      = p.memory_type)
  AND (p.tier        IS NULL OR mi.tier             = p.tier)
ORDER BY mi.embedding <=> ((SELECT embedding_json FROM params)->>'v')::vector ASC
LIMIT (SELECT lim FROM params)
;`;

// Note: the semantic path is executed only when embedding is present. In v1 we
// always run a combined UNION query that returns either semantic ranked rows
// (if embedding supplied, wrapped in a single-element JSON array under key 'v')
// OR lexical fallback rows (when embedding is NULL). This is done to keep the
// handler as a single Postgres node — the Result node inspects
// lexical_fallback column to decide partial vs success.
const sqlSearch = `WITH params AS (
  SELECT $1::text AS q_text,
         $2::uuid AS tenant_id,
         $3::memory_status_enum[] AS statuses,
         $4::uuid AS thread_id,
         $5::uuid AS entity_id,
         $6::text AS category,
         $7::memory_type_enum AS memory_type,
         $8::memory_tier_enum AS tier,
         $9::int  AS lim,
         $10::text AS emb_text
),
semantic AS (
  SELECT mi.*,
         1 - (mi.embedding <=> (p.emb_text)::vector) AS similarity,
         FALSE AS lexical_fallback
  FROM public.memory_items mi, params p
  WHERE p.emb_text IS NOT NULL
    AND mi.tenant_id = p.tenant_id
    AND mi.embedding IS NOT NULL
    AND mi.status = ANY(p.statuses)
    AND (p.thread_id   IS NULL OR mi.source_thread_id = p.thread_id)
    AND (p.entity_id   IS NULL OR mi.entity_id        = p.entity_id)
    AND (p.category    IS NULL OR mi.category         = p.category)
    AND (p.memory_type IS NULL OR mi.memory_type      = p.memory_type)
    AND (p.tier        IS NULL OR mi.tier             = p.tier)
  ORDER BY mi.embedding <=> (p.emb_text)::vector ASC
  LIMIT (SELECT lim FROM params)
),
lexical AS (
  SELECT mi.*,
         NULL::double precision AS similarity,
         TRUE AS lexical_fallback
  FROM public.memory_items mi, params p
  WHERE p.emb_text IS NULL
    AND mi.tenant_id = p.tenant_id
    AND mi.content ILIKE '%' || p.q_text || '%'
    AND mi.status = ANY(p.statuses)
    AND (p.thread_id   IS NULL OR mi.source_thread_id = p.thread_id)
    AND (p.entity_id   IS NULL OR mi.entity_id        = p.entity_id)
    AND (p.category    IS NULL OR mi.category         = p.category)
    AND (p.memory_type IS NULL OR mi.memory_type      = p.memory_type)
    AND (p.tier        IS NULL OR mi.tier             = p.tier)
  ORDER BY mi.created_at DESC
  LIMIT (SELECT lim FROM params)
)
SELECT * FROM semantic
UNION ALL
SELECT * FROM lexical
;`;

const jsSearchResult = String.raw`
const prep = $json;
if (prep && prep._error === true) {
  return [{ json: { _error: true, error_code: prep.error_code, error_message: prep.error_message, missing_fields: prep.missing_fields || [] }}];
}
const rows = $items().map(i => i.json);
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const lexicalFallback = rows.length > 0 && rows.every(r => r.lexical_fallback === true);
const recall_results = rows.map(r => ({
  memory_id: r.id,
  content: r.content,
  memory_type: r.memory_type,
  tier: r.tier,
  status: r.status,
  category: r.category,
  similarity: r.similarity === undefined ? null : r.similarity,
  created_at: r.created_at
}));
const followup_requests = lexicalFallback
  ? [{ type: 'generate_embedding', target: 'search_memory', query: step.inputs.query }]
  : [];
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'analysis',
    status: lexicalFallback ? 'partial' : 'success',
    summary: lexicalFallback ? 'Memory search degraded to lexical fallback (embedding missing).' : 'Memory search completed.',
    observations: [],
    proposals: [],
    actions_executed: [{ action: 'search_memory', details: {
      query: step.inputs.query,
      used_embedding: !lexicalFallback && recall_results.length > 0,
      recall_results
    }}],
    artifacts: [],
    confidence: 1.0,
    needs_followup: followup_requests.length > 0,
    followup_requests
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
`;

const jsRecallPrep = String.raw`
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const filters = ['entity_id','source_thread_id','category','memory_type'];
const present = filters.filter(k => inputs[k] !== undefined && inputs[k] !== null && inputs[k] !== '');
if (present.length === 0) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'recall_memory requires at least one structural filter.', missing_fields: ['filter'] }}];
}
const limit = Math.min(Math.max(parseInt(inputs.limit, 10) || 25, 1), 200);
const include_statuses = Array.isArray(inputs.include_statuses) && inputs.include_statuses.length
  ? inputs.include_statuses
  : [inputs.status || 'active'];
return [{ json: {
  __db: {
    tenant_id:        env.tenant_id,
    include_statuses,
    source_thread_id: inputs.source_thread_id || null,
    entity_id:        inputs.entity_id || null,
    category:         inputs.category || null,
    memory_type:      inputs.memory_type || null,
    tier:             inputs.tier || null,
    limit
  },
  passthrough: { env, step, inputs, applied_filters: present }
}}];
`;

const sqlRecall = `SELECT *
FROM public.memory_items
WHERE tenant_id = $1::uuid
  AND status = ANY($2::memory_status_enum[])
  AND ($3::uuid IS NULL OR source_thread_id = $3::uuid)
  AND ($4::uuid IS NULL OR entity_id        = $4::uuid)
  AND ($5::text IS NULL OR category         = $5::text)
  AND ($6::memory_type_enum IS NULL OR memory_type = $6::memory_type_enum)
  AND ($7::memory_tier_enum IS NULL OR tier        = $7::memory_tier_enum)
ORDER BY created_at DESC
LIMIT $8::int;`;

const jsRecallResult = String.raw`
const prep = $json;
if (prep && prep._error === true) {
  return [{ json: { _error: true, error_code: prep.error_code, error_message: prep.error_message, missing_fields: prep.missing_fields || [] }}];
}
const rows = $items().map(i => i.json);
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const recall_results = rows.map(r => ({
  memory_id: r.id,
  content: r.content,
  memory_type: r.memory_type,
  tier: r.tier,
  status: r.status,
  category: r.category,
  source_thread_id: r.source_thread_id,
  entity_id: r.entity_id,
  created_at: r.created_at
}));
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'analysis',
    status: 'success',
    summary: 'Memory recall completed (' + recall_results.length + ' rows).',
    observations: [],
    proposals: [],
    actions_executed: [{ action: 'recall_memory', details: { recall_results }}],
    artifacts: [],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
`;

const jsPromotePrep = String.raw`
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const missing = [];
if (!inputs.memory_id)        missing.push('memory_id');
if (inputs.promotion_target !== 'long_term') missing.push('promotion_target');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'INVALID_PROMOTION_TARGET', error_message: 'promote_memory requires memory_id and promotion_target=long_term.', missing_fields: missing }}];
}
return [{ json: {
  __db: {
    memory_id:              inputs.memory_id,
    tenant_id:              env.tenant_id,
    corroboration_threshold: 2,
    user_confirmed:         inputs.user_confirmed === true,
    evidence_validated:     inputs.evidence_validated === true
  },
  passthrough: { env, step, inputs }
}}];
`;

const sqlPromote = `WITH target AS (
  SELECT * FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
accept AS (
  SELECT id,
         (corroboration_count >= $3::int OR $4::boolean OR $5::boolean) AS ok,
         tier
  FROM target
),
promoted AS (
  UPDATE public.memory_items m
  SET tier = 'long_term',
      last_reconfirmed_at = now(),
      user_confirmed     = (m.user_confirmed     OR $4::boolean),
      evidence_validated = (m.evidence_validated OR $5::boolean)
  FROM accept
  WHERE m.id = accept.id AND accept.ok AND accept.tier = 'recent'
  RETURNING m.*, TRUE AS promoted, 'accepted'::text AS denial_reason
)
SELECT * FROM promoted
UNION ALL
SELECT t.*, FALSE AS promoted,
       CASE
         WHEN t.tier <> 'recent' THEN 'not_in_recent_tier'
         ELSE 'acceptance_criteria_not_met'
       END AS denial_reason
  FROM target t
 WHERE NOT EXISTS (SELECT 1 FROM promoted)
LIMIT 1;`;

const jsPromoteResult = String.raw`
const prep = $json;
if (prep && prep._error === true) {
  return [{ json: { _error: true, error_code: prep.error_code, error_message: prep.error_message, missing_fields: prep.missing_fields || [] }}];
}
const rows = $items().map(i => i.json);
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
if (!rows || rows.length === 0) {
  return [{ json: { _error: true, error_code: 'INVALID_PROMOTION_TARGET', error_message: 'Target memory not found.', missing_fields: [] }}];
}
const row = rows[0];
const accepted = row.promoted === true;
const details = {
  memory_id: row.id,
  tier: row.tier,
  status: row.status,
  last_reconfirmed_at: row.last_reconfirmed_at,
  denial_reason: accepted ? null : row.denial_reason
};
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: accepted ? 'success' : 'partial',
    summary: accepted ? 'Memory promoted to long_term.' : 'Promotion denied: ' + row.denial_reason,
    observations: [],
    proposals: [],
    actions_executed: [{ action: 'promote_memory', details }],
    artifacts: [{ type: 'memory_id', value: row.id }],
    confidence: 1.0,
    needs_followup: !accepted,
    followup_requests: accepted ? [] : [{ type: 'provide_promotion_evidence', memory_id: row.id, reason: row.denial_reason }]
  },
  module_execution_started: true,
  domain_writes_performed: accepted,
  response_generation_allowed: false
}}];
`;

const jsSupersedePrep = String.raw`
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};

const required = ['supersedes_memory_id','content','memory_type','category','source_thread_id'];
const VALID_TYPES = ['fact','observation','pattern','inference','preference','constraint'];
const missing = required.filter(k => !inputs[k] || (typeof inputs[k] === 'string' && !inputs[k].trim()));
if (!VALID_TYPES.includes(inputs.memory_type) && !missing.includes('memory_type')) missing.push('memory_type');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Memory supersede inputs are incomplete.', missing_fields: missing }}];
}

const category = String(inputs.category).trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
if (!/^[a-z][a-z0-9_]{0,63}$/.test(category)) {
  return [{ json: { _error: true, error_code: 'INVALID_CATEGORY', error_message: 'Category fails ^[a-z][a-z0-9_]{0,63}$.', missing_fields: ['category'] }}];
}

const SUBJECTIVE_RO = [
  /\b(prost|prosti|proasta|proaste)\b/i,
  /\b(dezgustator|dezgustatoare)\b/i,
  /\b(idiot|idioti|idioata|idioate)\b/i,
  /\b(lene[sș](a|e|i)?)\b/i,
  /\b(incompetent(a|e|i)?)\b/i,
  /\b(r[aă]u|rea|r[aă]i|rele)\b.*\b(caracter|om|persoana)\b/i
];
if (['observation','pattern'].includes(inputs.memory_type)) {
  if (SUBJECTIVE_RO.some(rx => rx.test(String(inputs.content)))) {
    return [{ json: { _error: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN', error_message: 'Subjective judgment not allowed under observation/pattern.', missing_fields: [] }}];
  }
}

const confidence = Number.isFinite(inputs.confidence) ? inputs.confidence : 0.800;
const importance = Number.isFinite(inputs.importance) ? inputs.importance : 0.500;
const durability = inputs.durability || 'stable';
const evidence_refs = Array.isArray(inputs.evidence_refs) ? inputs.evidence_refs : [];
const metadata     = (inputs.metadata && typeof inputs.metadata === 'object') ? inputs.metadata : {};

const idempotency_key = 'supersede_memory:' + env.execution_context_id + ':' + step.step_id;

return [{ json: {
  __db: {
    old_id:             inputs.supersedes_memory_id,
    tenant_id:          env.tenant_id,
    memory_type:        inputs.memory_type,
    category,
    content:            inputs.content,
    confidence, importance, durability,
    source_thread_id:   inputs.source_thread_id,
    source_message_id:  inputs.source_message_id || null,
    entity_id:          inputs.entity_id || null,
    evidence_refs:      JSON.stringify(evidence_refs),
    metadata:           JSON.stringify(metadata),
    idempotency_key,
    tier:               inputs.tier || 'recent'
  },
  passthrough: { env, step, inputs, idempotency_key }
}}];
`;

const sqlSupersede = `WITH old_row AS (
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
LIMIT 1;`;

const jsSupersedeResult = String.raw`
const prep = $json;
if (prep && prep._error === true) {
  return [{ json: { _error: true, error_code: prep.error_code, error_message: prep.error_message, missing_fields: prep.missing_fields || [] }}];
}
const rows = $items().map(i => i.json);
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
if (!rows || rows.length === 0 || !rows[0].id) {
  return [{ json: { _error: true, error_code: 'SUPERSEDE_TARGET_INVALID', error_message: 'Old memory not found or already superseded.', missing_fields: [] }}];
}
const row = rows[0];
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: 'success',
    summary: 'Memory superseded successfully.',
    observations: [],
    proposals: [],
    actions_executed: [{ action: 'supersede_memory', details: {
      old_memory_id: row.supersedes_memory_id,
      new_memory_id: row.id,
      tier: row.tier,
      status: row.status,
      created_at: row.created_at,
      idempotency_reused: row.new_insert === false
    }}],
    artifacts: [{ type: 'memory_id', value: row.id }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: true,
  response_generation_allowed: false
}}];
`;

// ----------------------------------------------------------------------------
// Factory helpers
// ----------------------------------------------------------------------------

function mkCode(id, name, position, jsCode) {
  return {
    parameters: { jsCode },
    id, name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position
  };
}

function mkPg(id, name, position, query, queryReplacement) {
  return {
    parameters: {
      operation: 'executeQuery',
      query,
      options: { queryReplacement }
    },
    id, name,
    type: 'n8n-nodes-base.postgres',
    typeVersion: 2.4,
    alwaysOutputData: true,
    continueOnFail: true,
    position,
    credentials: { postgres: PG_CRED }
  };
}

// ----------------------------------------------------------------------------
// Main transform
// ----------------------------------------------------------------------------

const wf = JSON.parse(fs.readFileSync(IN, 'utf8'));

// 1. Repurpose ME_Memory_Store_Result (in-place jsCode rewrite, move x=3248)
const storeResult = wf.nodes.find(n => n.name === 'ME_Memory_Store_Result');
if (!storeResult) throw new Error('ME_Memory_Store_Result not found in input workflow');
storeResult.parameters.jsCode = jsStoreResult;
storeResult.position = [3248, 1040];

// 2. Repurpose ME_Memory_Search_Result (in-place jsCode rewrite, move x=3248)
const searchResult = wf.nodes.find(n => n.name === 'ME_Memory_Search_Result');
if (!searchResult) throw new Error('ME_Memory_Search_Result not found in input workflow');
searchResult.parameters.jsCode = jsSearchResult;
searchResult.position = [3248, 1110];

// 3. Extend ME_Route_Memory_Action (add 3 rules)
const routeMem = wf.nodes.find(n => n.name === 'ME_Route_Memory_Action');
if (!routeMem) throw new Error('ME_Route_Memory_Action not found in input workflow');
const mkRule = (action) => ({
  conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [{
      leftValue: "={{ $('ME_Validate_Dispatcher_Result').first().json.step.inputs.action }}",
      rightValue: action,
      operator: { type: 'string', operation: 'equals' }
    }],
    combinator: 'and'
  },
  renameOutput: true,
  outputKey: action
});
routeMem.parameters.rules = {
  values: [
    mkRule('store_memory'),
    mkRule('search_memory'),
    mkRule('recall_memory'),
    mkRule('promote_memory'),
    mkRule('supersede_memory')
  ]
};
routeMem.parameters.options = { fallbackOutput: 'extra' };

// 4. Build 13 new nodes
const qr = (js) => '={{ ' + js + ' }}';
const newNodes = [
  // store chain
  mkCode('me-phase5mem-store-prep', 'ME_Memory_Store_Prep', [2768, 1040], jsStorePrep),
  mkPg('me-phase5mem-store-db', 'ME_Memory_Store_DB', [3008, 1040], sqlStoreInsert,
    qr(`$json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key]`)),

  // search chain
  mkCode('me-phase5mem-search-prep', 'ME_Memory_Search_Prep', [2768, 1110], jsSearchPrep),
  mkPg('me-phase5mem-search-db', 'ME_Memory_Search_DB', [3008, 1110], sqlSearch,
    qr(`$json._error ? [null,null,['active'],null,null,null,null,null,10,null] : [$json.__db.query_text, $json.__db.tenant_id, $json.__db.include_statuses, $json.__db.source_thread_id, $json.__db.entity_id, $json.__db.category, $json.__db.memory_type, $json.__db.tier, $json.__db.limit, $json.__db.embedding_json]`)),

  // recall chain
  mkCode('me-phase5mem-recall-prep', 'ME_Memory_Recall_Prep', [2768, 1180], jsRecallPrep),
  mkPg('me-phase5mem-recall-db', 'ME_Memory_Recall_DB', [3008, 1180], sqlRecall,
    qr(`$json._error ? [null,['active'],null,null,null,null,null,25] : [$json.__db.tenant_id, $json.__db.include_statuses, $json.__db.source_thread_id, $json.__db.entity_id, $json.__db.category, $json.__db.memory_type, $json.__db.tier, $json.__db.limit]`)),
  mkCode('me-phase5mem-recall-result', 'ME_Memory_Recall_Result', [3248, 1180], jsRecallResult),

  // promote chain
  mkCode('me-phase5mem-promote-prep', 'ME_Memory_Promote_Prep', [2768, 1250], jsPromotePrep),
  mkPg('me-phase5mem-promote-db', 'ME_Memory_Promote_DB', [3008, 1250], sqlPromote,
    qr(`$json._error ? [null,null,2,false,false] : [$json.__db.memory_id, $json.__db.tenant_id, $json.__db.corroboration_threshold, $json.__db.user_confirmed, $json.__db.evidence_validated]`)),
  mkCode('me-phase5mem-promote-result', 'ME_Memory_Promote_Result', [3248, 1250], jsPromoteResult),

  // supersede chain
  mkCode('me-phase5mem-supersede-prep', 'ME_Memory_Supersede_Prep', [2768, 1320], jsSupersedePrep),
  mkPg('me-phase5mem-supersede-db', 'ME_Memory_Supersede_DB', [3008, 1320], sqlSupersede,
    qr(`$json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.old_id, $json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key, $json.__db.tier]`)),
  mkCode('me-phase5mem-supersede-result', 'ME_Memory_Supersede_Result', [3248, 1320], jsSupersedeResult),
];
wf.nodes.push(...newNodes);

// 5. Rewire connections
const conn = wf.connections;

// 5a. ME_Route_Memory_Action now has 5 outputs (instead of 2) + fallback = 6 slots
conn['ME_Route_Memory_Action'] = {
  main: [
    [{ node: 'ME_Memory_Store_Prep',     type: 'main', index: 0 }],
    [{ node: 'ME_Memory_Search_Prep',    type: 'main', index: 0 }],
    [{ node: 'ME_Memory_Recall_Prep',    type: 'main', index: 0 }],
    [{ node: 'ME_Memory_Promote_Prep',   type: 'main', index: 0 }],
    [{ node: 'ME_Memory_Supersede_Prep', type: 'main', index: 0 }],
    [{ node: 'ME_Return_Error',          type: 'main', index: 0 }]
  ]
};

// 5b. new connections per chain
const wire = (from, to) => {
  conn[from] = conn[from] || { main: [] };
  conn[from].main[0] = [{ node: to, type: 'main', index: 0 }];
};

wire('ME_Memory_Store_Prep', 'ME_Memory_Store_DB');
wire('ME_Memory_Store_DB',   'ME_Memory_Store_Result');

wire('ME_Memory_Search_Prep', 'ME_Memory_Search_DB');
wire('ME_Memory_Search_DB',   'ME_Memory_Search_Result');

wire('ME_Memory_Recall_Prep',   'ME_Memory_Recall_DB');
wire('ME_Memory_Recall_DB',     'ME_Memory_Recall_Result');
wire('ME_Memory_Recall_Result', 'ME_Return_Result');

wire('ME_Memory_Promote_Prep',   'ME_Memory_Promote_DB');
wire('ME_Memory_Promote_DB',     'ME_Memory_Promote_Result');
wire('ME_Memory_Promote_Result', 'ME_Return_Result');

wire('ME_Memory_Supersede_Prep',   'ME_Memory_Supersede_DB');
wire('ME_Memory_Supersede_DB',     'ME_Memory_Supersede_Result');
wire('ME_Memory_Supersede_Result', 'ME_Return_Result');

// (ME_Memory_Store_Result → ME_Return_Result already exists; same for Search)

// ----------------------------------------------------------------------------
// Write + report
// ----------------------------------------------------------------------------

fs.writeFileSync(OUT, JSON.stringify(wf, null, 2));

const summary = {
  source: IN,
  output: OUT,
  pre_node_count: 30,
  post_node_count: wf.nodes.length,
  new_nodes: newNodes.map(n => n.id),
  repurposed_nodes: ['me-phase11-me-memory-store-result', 'me-phase11-me-memory-search-result'],
  switch_rule_count: routeMem.parameters.rules.values.length,
};
console.log(JSON.stringify(summary, null, 2));
