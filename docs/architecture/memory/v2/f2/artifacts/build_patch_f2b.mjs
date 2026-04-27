#!/usr/bin/env node
// build_patch_f2b.mjs — F2 addendum fixing the hybrid-search regression.
//
// What F2 (the first rollout) caused:
// - Lexical CTE in ME_Memory_Search_DB was gated by `AND p.emb_text IS NULL`,
//   which was correct *before* F2 because the only way `emb_text` was populated
//   was via caller-supplied embedding. Post-F2 the Embed node produces `emb_text`
//   for every search request, so the lexical CTE is permanently gated out.
// - Since `memory_items.embedding` is still NULL for every row (store-path does
//   not yet compute embeddings), the semantic CTE always returns zero rows.
// - Net effect: every search returns zero rows — a regression vs. pre-F2.
//
// What this patch does (additive + SQL-only):
// 1. ME_Memory_Search_DB.parameters.query
//    - Remove `AND p.emb_text IS NULL` from the lexical CTE so the lexical leg
//      always runs when a q_text is supplied.
//    - Add `AND NOT EXISTS (SELECT 1 FROM semantic s WHERE s.id = mi.id)` to
//      prevent double-counting a row that matches both semantic and lexical.
//    - Semantic CTE is unchanged: it still only runs when `emb_text IS NOT NULL`
//      AND `mi.embedding IS NOT NULL`, so it remains a pure no-op until
//      memory_items rows start getting embeddings.
// 2. ME_Memory_Search_Result.parameters.jsCode
//    - Reads `ME_Memory_Search_Embed_Merge` passthrough for authoritative signals:
//      `embedding_attempted`, `embedding_error`, `used_embedding`.
//    - Redefines `used_embedding` as "an embedding was available AND semantic
//      returned at least one row" (i.e. semantic actually contributed).
//    - `isTrueEmbeddingFallback` = "Embed HTTP was attempted and failed". Only
//      in this case do we emit status=partial and a generate_embedding followup.
//    - Reports `semantic_match_count` / `lexical_match_count` for observability.
//
// Inputs:  WF-ME-01_post_f2_preSQL.json  (live state after F2 rollout — 45 nodes)
// Outputs: WF-ME-01_post_f2b.json         (to be deployed via n8n-patch.mjs replace)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IN  = process.argv[2] || path.join(__dirname, 'WF-ME-01_post_f2_preSQL.json');
const OUT = process.argv[3] || path.join(__dirname, 'WF-ME-01_post_f2b.json');

const wf = JSON.parse(fs.readFileSync(IN, 'utf8'));

// --- Invariants ---
if (wf.name !== 'WF-ME-01 Module Execution') throw new Error('unexpected workflow name: ' + wf.name);
if (!Array.isArray(wf.nodes) || wf.nodes.length !== 45) {
  throw new Error('expected 45 nodes pre-F2b, got ' + (wf.nodes && wf.nodes.length));
}
const db     = wf.nodes.find(n => n.name === 'ME_Memory_Search_DB');
const result = wf.nodes.find(n => n.name === 'ME_Memory_Search_Result');
const embed  = wf.nodes.find(n => n.name === 'ME_Memory_Search_Embed');
const merge  = wf.nodes.find(n => n.name === 'ME_Memory_Search_Embed_Merge');
if (!db || !result || !embed || !merge) throw new Error('F2 nodes missing — re-run F2 first');

// --- SQL mutation on ME_Memory_Search_DB ---
const oldSql = db.parameters.query;

// Guard: must still contain the original gate we intend to remove.
if (!/WHERE p\.emb_text IS NULL\n/.test(oldSql)) {
  throw new Error('lexical CTE gate `WHERE p.emb_text IS NULL` not found — SQL already patched or differs from expected shape');
}

// Replace the lexical WHERE gate + original tenant line with the hybrid logic,
// adding a NOT EXISTS dedupe against the semantic CTE so a row matching both
// legs isn't returned twice.
const newSql = oldSql
  .replace(
    /WHERE p\.emb_text IS NULL\n    AND mi\.tenant_id = p\.tenant_id\n/,
    `WHERE mi.tenant_id = p.tenant_id\n` +
    `    AND NOT EXISTS (SELECT 1 FROM semantic s WHERE s.id = mi.id)\n`
  );

// Confirm the structure is right:
if (!/AND NOT EXISTS \(SELECT 1 FROM semantic s WHERE s\.id = mi\.id\)/.test(newSql)) {
  throw new Error('NOT EXISTS dedupe clause failed to insert');
}
if (/WHERE p\.emb_text IS NULL/.test(newSql)) {
  throw new Error('lexical emb_text gate still present after mutation');
}
// The semantic CTE MUST still contain its own emb_text IS NOT NULL gate.
if (!/WHERE p\.emb_text IS NOT NULL\n/.test(newSql)) {
  throw new Error('semantic CTE emb_text gate missing after mutation (unexpected)');
}
// We must still have two references to mi.tenant_id = p.tenant_id (one per CTE).
const tenantMatches = (newSql.match(/mi\.tenant_id = p\.tenant_id/g) || []).length;
if (tenantMatches !== 2) throw new Error('expected 2 tenant_id predicates in SQL, got ' + tenantMatches);

db.parameters.query = newSql;

// --- Result node jsCode mutation ---
const newJs = `const mergeOut = $('ME_Memory_Search_Embed_Merge').first().json;
if (mergeOut && mergeOut._error === true) {
  return [{ json: {
    _error: true,
    error_code:    mergeOut.error_code,
    error_message: mergeOut.error_message,
    missing_fields: mergeOut.missing_fields || []
  }}];
}

const passthrough       = (mergeOut && mergeOut.passthrough) || {};
const embeddingAvailable = passthrough.used_embedding === true;
const embeddingAttempted = passthrough.embedding_attempted === true;
const embeddingError     = passthrough.embedding_error || null;

const rows = $items()
  .map(i => i.json)
  .filter(r => r && typeof r.id === 'string');

const env  = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;

const semanticMatchCount = rows.filter(r => r.lexical_fallback === false).length;
const lexicalMatchCount  = rows.filter(r => r.lexical_fallback === true).length;

// used_embedding means: an embedding was available AND semantic actually contributed
const usedEmbedding = embeddingAvailable && semanticMatchCount > 0;

// True fallback = HTTP embedding producer was attempted and failed.
// (Not firing when caller supplied embedding, nor when semantic just matched 0 rows.)
const isTrueEmbeddingFallback = embeddingAttempted && embeddingError !== null;

const recall_results = rows.map(r => ({
  memory_id:   r.id,
  content:     r.content,
  memory_type: r.memory_type,
  tier:        r.tier,
  status:      r.status,
  category:    r.category,
  similarity:  r.similarity === undefined ? null : r.similarity,
  created_at:  r.created_at
}));

const resultStatus = isTrueEmbeddingFallback ? 'partial' : 'success';
const summary      = isTrueEmbeddingFallback
  ? 'Memory search degraded to lexical fallback (embedding producer failed).'
  : 'Memory search completed.';

const followup_requests = isTrueEmbeddingFallback
  ? [{ type: 'generate_embedding', target: 'search_memory', query: step.inputs.query, error: embeddingError }]
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
    status: resultStatus,
    summary,
    observations: [],
    proposals: [],
    actions_executed: [{ action: 'search_memory', details: {
      query:                step.inputs.query,
      used_embedding:       usedEmbedding,
      embedding_attempted:  embeddingAttempted,
      embedding_error:      embeddingError,
      semantic_match_count: semanticMatchCount,
      lexical_match_count:  lexicalMatchCount,
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

result.parameters.jsCode = newJs;

// --- Post-build sanity checks ---
if (wf.nodes.length !== 45) throw new Error('post-build node count drifted: ' + wf.nodes.length);
if (!/semantic_match_count/.test(result.parameters.jsCode)) throw new Error('Result jsCode mutation failed');
if (/p\.emb_text IS NULL/.test(db.parameters.query)) throw new Error('lexical gate not removed');

fs.writeFileSync(OUT, JSON.stringify(wf, null, 2));
console.log(JSON.stringify({
  ok: true,
  nodeCount: wf.nodes.length,
  versionId_in: wf.versionId,
  mutations: {
    ME_Memory_Search_DB:     ['removed lexical emb_text gate', 'added NOT EXISTS dedupe against semantic'],
    ME_Memory_Search_Result: ['reads Embed_Merge passthrough', 'emits semantic/lexical counts', 'true-fallback only on embedding_error']
  },
  out: OUT
}, null, 2));
