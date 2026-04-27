#!/usr/bin/env node
// build_patch_f5.mjs
// Deterministic generator for the F5 `patch-node` params payloads.
//
// Outputs:
//   docs/architecture/memory/v2/f5/artifacts/patchF5_store_prep_params.json
//   docs/architecture/memory/v2/f5/artifacts/patchF5_supersede_prep_params.json
//
// Rollout channel (per node, equivalent to F4 template):
//   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
//     patch-node uq26nh1grIpnHju0 ME_Memory_Store_Prep \
//     --params docs/architecture/memory/v2/f5/artifacts/patchF5_store_prep_params.json
//   (repeat for ME_Memory_Supersede_Prep)
//
// Contract (see patch_plan_f5.md §2–§4):
//   - Preserve v1 required-field validation + category validation unchanged.
//   - Resolve locale from step.inputs.locale:
//       * non-string / missing / empty => 'ro'
//       * normalized primary subtag in {ro, en} => that locale
//       * anything else => 'ro' (safety fallback)
//   - Subjective guard fires only on observation/pattern memory_type.
//   - LOCALE_LISTS.ro = v1 six-regex list (byte-identical).
//   - LOCALE_LISTS.en = new eight-regex list (see patch_plan_f5.md §3).
//   - No HTTP, no credential, no schema, no SQL.
//   - __db + passthrough blocks preserved byte-for-byte from v1.
//
// Per operator decision MEMORY_V2_F5_OPERATOR_DECISION_20260421.md:
//   Option A only, {ro, en} only, ro fallback on missing/unknown, sub-ms guard, self-contained.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Shared fragments -----------------------------------------------------

// v1 Romanian regex list — MUST stay byte-identical to preserve existing behaviour.
const SUBJECTIVE_RO_LITERAL = `const SUBJECTIVE_RO = [
  /\\b(prost|prosti|proasta|proaste)\\b/i,
  /\\b(dezgustator|dezgustatoare)\\b/i,
  /\\b(idiot|idioti|idioata|idioate)\\b/i,
  /\\b(lene[sș](a|e|i)?)\\b/i,
  /\\b(incompetent(a|e|i)?)\\b/i,
  /\\b(r[aă]u|rea|r[aă]i|rele)\\b.*\\b(caracter|om|persoana)\\b/i
];`;

// New English regex list — seed per patch_plan_f5.md §3.
const SUBJECTIVE_EN_LITERAL = `const SUBJECTIVE_EN = [
  /\\b(stupid|dumb|dumber|dumbest)\\b/i,
  /\\b(idiot|idiots|idiotic)\\b/i,
  /\\b(moron|morons|moronic|imbecile|imbeciles)\\b/i,
  /\\b(lazy|lazier|laziest)\\b/i,
  /\\b(incompetent|incompetents)\\b/i,
  /\\b(disgusting|revolting|repulsive)\\b/i,
  /\\b(worthless|pathetic|useless)\\b/i,
  /\\b(bad|evil|nasty|rotten|awful)\\s+(person|character|human|guy|people)\\b/i
];`;

// Locale resolution + guard block — shared between store + supersede Prep nodes.
const LOCALE_AND_GUARD = `${SUBJECTIVE_RO_LITERAL}
${SUBJECTIVE_EN_LITERAL}
const LOCALE_LISTS = { ro: SUBJECTIVE_RO, en: SUBJECTIVE_EN };
const SUPPORTED_LOCALES = ['ro', 'en'];
const rawLocale = (inputs && typeof inputs.locale === 'string') ? inputs.locale : '';
const normLocale = rawLocale.trim().toLowerCase().split(/[-_]/)[0];
const locale = SUPPORTED_LOCALES.includes(normLocale) ? normLocale : 'ro';
if (['observation','pattern'].includes(inputs.memory_type)) {
  const list = LOCALE_LISTS[locale];
  if (list.some(rx => rx.test(String(inputs.content)))) {
    return [{ json: { _error: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN', error_message: __GUARD_MESSAGE__, missing_fields: [] }}];
  }
}`;

// --- ME_Memory_Store_Prep jsCode ------------------------------------------

const storeJsCode = `
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

${LOCALE_AND_GUARD.replace('__GUARD_MESSAGE__', "'Subjective character judgments not allowed under observation/pattern.'")}

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

// --- ME_Memory_Supersede_Prep jsCode --------------------------------------

const supersedeJsCode = `
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

${LOCALE_AND_GUARD.replace('__GUARD_MESSAGE__', "'Subjective judgment not allowed under observation/pattern.'")}

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

// --- Build-time guards ----------------------------------------------------

function assertTokens(label, js, tokens) {
  for (const t of tokens) {
    if (!js.includes(t)) {
      console.error(`build_patch_f5: ${label} missing required token: ${t}`);
      process.exit(1);
    }
  }
}

// Canonical v1 RO regex lines — each of these six literals MUST appear verbatim
// in each emitted jsCode. Guards against accidental lexicon regression.
const RO_REGEX_CANARIES = [
  '/\\b(prost|prosti|proasta|proaste)\\b/i',
  '/\\b(dezgustator|dezgustatoare)\\b/i',
  '/\\b(idiot|idioti|idioata|idioate)\\b/i',
  '/\\b(lene[sș](a|e|i)?)\\b/i',
  '/\\b(incompetent(a|e|i)?)\\b/i',
  '/\\b(r[aă]u|rea|r[aă]i|rele)\\b.*\\b(caracter|om|persoana)\\b/i'
];

const SHARED_F5_TOKENS = [
  'ME_Validate_Dispatcher_Result',
  'SUBJECTIVE_RO',
  'SUBJECTIVE_EN',
  'LOCALE_LISTS',
  'SUPPORTED_LOCALES',
  "SUPPORTED_LOCALES.includes(normLocale) ? normLocale : 'ro'",
  "['observation','pattern'].includes(inputs.memory_type)",
  'SUBJECTIVE_JUDGMENT_FORBIDDEN'
];

for (const c of RO_REGEX_CANARIES) {
  if (!storeJsCode.includes(c) || !supersedeJsCode.includes(c)) {
    console.error('build_patch_f5: RO regex canary missing (v1 behaviour regression):', c);
    process.exit(1);
  }
}

assertTokens('store', storeJsCode, SHARED_F5_TOKENS.concat([
  'MISSING_REQUIRED_FIELDS',
  "'Memory store inputs are incomplete.'",
  "'store_memory:' + env.execution_context_id + ':' + step.step_id",
  "'Subjective character judgments not allowed under observation/pattern.'"
]));

assertTokens('supersede', supersedeJsCode, SHARED_F5_TOKENS.concat([
  'MISSING_REQUIRED_FIELDS',
  "'Memory supersede inputs are incomplete.'",
  "'supersede_memory:' + env.execution_context_id + ':' + step.step_id",
  "'Subjective judgment not allowed under observation/pattern.'",
  'supersedes_memory_id',
  'old_id:             inputs.supersedes_memory_id'
]));

// Reject if English list accidentally contains a pure ro token (safety: EN list should be English-only).
if (/\bprost\b/.test(SUBJECTIVE_EN_LITERAL) || /\bdezgustator\b/.test(SUBJECTIVE_EN_LITERAL)) {
  console.error('build_patch_f5: EN list contains RO-only token');
  process.exit(1);
}

// --- Write outputs --------------------------------------------------------

const storeOut = resolve(__dirname, 'patchF5_store_prep_params.json');
const supersedeOut = resolve(__dirname, 'patchF5_supersede_prep_params.json');

writeFileSync(storeOut, JSON.stringify({ jsCode: storeJsCode }, null, 2) + '\n');
writeFileSync(supersedeOut, JSON.stringify({ jsCode: supersedeJsCode }, null, 2) + '\n');

console.log('wrote', storeOut, 'size=', JSON.stringify({ jsCode: storeJsCode }).length);
console.log('wrote', supersedeOut, 'size=', JSON.stringify({ jsCode: supersedeJsCode }).length);
