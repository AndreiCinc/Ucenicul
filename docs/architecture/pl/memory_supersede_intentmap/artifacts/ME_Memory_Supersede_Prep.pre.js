
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
const SUBJECTIVE_EN = [
  /\b(stupid|dumb|dumber|dumbest)\b/i,
  /\b(idiot|idiots|idiotic)\b/i,
  /\b(moron|morons|moronic|imbecile|imbeciles)\b/i,
  /\b(lazy|lazier|laziest)\b/i,
  /\b(incompetent|incompetents)\b/i,
  /\b(disgusting|revolting|repulsive)\b/i,
  /\b(worthless|pathetic|useless)\b/i,
  /\b(bad|evil|nasty|rotten|awful)\s+(person|character|human|guy|people)\b/i
];
const LOCALE_LISTS = { ro: SUBJECTIVE_RO, en: SUBJECTIVE_EN };
const SUPPORTED_LOCALES = ['ro', 'en'];
const rawLocale = (inputs && typeof inputs.locale === 'string') ? inputs.locale : '';
const normLocale = rawLocale.trim().toLowerCase().split(/[-_]/)[0];
const locale = SUPPORTED_LOCALES.includes(normLocale) ? normLocale : 'ro';
if (['observation','pattern'].includes(inputs.memory_type)) {
  const list = LOCALE_LISTS[locale];
  if (list.some(rx => rx.test(String(inputs.content)))) {
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

