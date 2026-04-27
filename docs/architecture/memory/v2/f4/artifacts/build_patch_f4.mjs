#!/usr/bin/env node
// build_patch_f4.mjs
// Deterministic generator for the F4 `patch-node` params payload.
// Output: docs/architecture/memory/v2/f4/artifacts/patchF4_params.json
// Rollout channel: n8n-patch.mjs patch-node uq26nh1grIpnHju0 ME_Memory_Promote_Result --params <this file>
//
// Contract (see design_f4_denial_vocabulary.md):
//   - Preserve Prep error propagation + "Target memory not found" fallback unchanged.
//   - details.denial_reason = row.denial_reason verbatim (no null-on-accept).
//   - On accept, compute acceptance_signals array from:
//       corroboration      : row.corroboration_count >= db.corroboration_threshold
//       user_confirmed     : (db.user_confirmed === true) || (row.user_confirmed === true)
//       evidence_validated : (db.evidence_validated === true) || (row.evidence_validated === true)
//     where `db` = Prep's `__db` block (this call's inputs, authoritative for attribution),
//     OR'd with the row's post-UPDATE values (pre-existing history that already satisfied
//     the predicate prior to this call).
//   - artifacts: always emit {type:'memory_id', value:row.id} and {type:'denial_reason', value:row.denial_reason, promoted:accepted};
//     on accept additionally {type:'acceptance_signals', value:acceptance_signals}.
//   - details.acceptance_signals mirrors artifacts (empty array on denial).
//   - followup_requests[0].reason continues to use row.denial_reason on denial.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_PATH = resolve(__dirname, 'patchF4_params.json');

const jsCode = `
const prep = $json;
if (prep && prep._error === true) {
  return [{ json: { _error: true, error_code: prep.error_code, error_message: prep.error_message, missing_fields: prep.missing_fields || [] }}];
}
const rows = $items().map(i => i.json).filter(r => r && typeof r.id === 'string');
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
if (!rows || rows.length === 0) {
  return [{ json: { _error: true, error_code: 'INVALID_PROMOTION_TARGET', error_message: 'Target memory not found.', missing_fields: [] }}];
}
const row = rows[0];
const accepted = row.promoted === true;
const prepOut = $('ME_Memory_Promote_Prep').first().json;
const db = (prepOut && prepOut.__db) || {};
const corrThreshold = typeof db.corroboration_threshold === 'number' ? db.corroboration_threshold : 2;
const corrCount = typeof row.corroboration_count === 'number' ? row.corroboration_count : 0;
const acceptance_signals = [];
if (accepted) {
  if (corrCount >= corrThreshold) acceptance_signals.push('corroboration');
  if (db.user_confirmed === true || row.user_confirmed === true) acceptance_signals.push('user_confirmed');
  if (db.evidence_validated === true || row.evidence_validated === true) acceptance_signals.push('evidence_validated');
}
const details = {
  memory_id: row.id,
  tier: row.tier,
  status: row.status,
  last_reconfirmed_at: row.last_reconfirmed_at,
  denial_reason: row.denial_reason,
  acceptance_signals
};
const artifacts = [
  { type: 'memory_id', value: row.id },
  { type: 'denial_reason', value: row.denial_reason, promoted: accepted }
];
if (accepted) {
  artifacts.push({ type: 'acceptance_signals', value: acceptance_signals });
}
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
    artifacts,
    confidence: 1.0,
    needs_followup: !accepted,
    followup_requests: accepted ? [] : [{ type: 'provide_promotion_evidence', memory_id: row.id, reason: row.denial_reason }]
  },
  module_execution_started: true,
  domain_writes_performed: accepted,
  response_generation_allowed: false
}}];
`;

// Sanity: reject if the jsCode silently loses required tokens.
const requiredTokens = [
  'ME_Memory_Promote_Prep',
  'ME_Validate_Dispatcher_Result',
  'acceptance_signals',
  'denial_reason',
  'promote_memory',
  'domain_writes_performed: accepted'
];
for (const t of requiredTokens) {
  if (!jsCode.includes(t)) {
    console.error('build_patch_f4: missing required token in jsCode:', t);
    process.exit(1);
  }
}

// Reject if the old null-on-accept pattern still appears.
if (/denial_reason: accepted \? null/.test(jsCode)) {
  console.error('build_patch_f4: old null-on-accept pattern leaked into new jsCode');
  process.exit(1);
}

const params = { jsCode };
writeFileSync(OUT_PATH, JSON.stringify(params, null, 2) + '\n');
console.log('wrote', OUT_PATH, 'size=', JSON.stringify(params).length);
