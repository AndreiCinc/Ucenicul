// ME_Memory_Store_Prep — v1.1 (AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP 2026-04-25)
// v1.0 base: validate required + memory_type + category + subjective-judgment guard.
// v1.1 adds: AMBIGUOUS_OR_EMPTY_MEMORY guard (length + pure-demonstrative) BEFORE the
// subjective-judgment block, so demonstrative-only memories like "asta" are rejected
// regardless of memory_type.
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

// AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP — guard #2: ambiguous / empty / pronoun-only memory.
function asciiFold(s) {
  return String(s).toLowerCase()
    .replace(/[\u0219\u015F]/g, 's')
    .replace(/[\u021B\u0163]/g, 't')
    .replace(/\u0103/g, 'a')
    .replace(/\u00E2/g, 'a')
    .replace(/\u00EE/g, 'i')
    .replace(/\u00E3/g, 'a');
}
const MIN_MEMORY_LEN = 6;
const rawMemEffective = String(inputs.content).trim();
let effective = asciiFold(rawMemEffective)
  .replace(/[!.?,;:\s]+$/, '')
  .replace(/^\s*(?:tine\s+minte\s+(?:ca\s+)?|retine\s+(?:ca\s+)?|noteaza\s+(?:ca\s+)?|salveaza\s+(?:ca\s+)?|memoreaza\s+(?:ca\s+)?|inregistreaza\s+(?:ca\s+)?|remember\s+(?:that\s+)?|note\s+(?:that\s+)?|save\s+(?:that\s+)?|memo(?:rize)?\s+(?:that\s+)?)/i, '')
  .replace(/[!.?,;:\s]+$/, '')
  .trim();
if (!effective || effective.length < MIN_MEMORY_LEN) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_MEMORY',
    error_message: 'Memory content is empty or too short for durable storage \u2014 please specify what to remember.',
    missing_fields: ['content'],
    needs_followup: true }}];
}
const PURE_DEMONSTRATIVE = /^(?:chestia|cestia|the\s+thing|something|ceva|asta|aceasta|aia|acea|aceea|that|this)(?:\s+(?:asta|aceasta|aia|acea|aceea|that|this))?\s*$/i;
if (PURE_DEMONSTRATIVE.test(effective)) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_MEMORY',
    error_message: 'Memory content is purely demonstrative \u2014 please specify what to remember.',
    missing_fields: ['content'],
    needs_followup: true }}];
}

const SUBJECTIVE_RO = [
  /\b(prost|prosti|proasta|proaste)\b/i,
  /\b(dezgustator|dezgustatoare)\b/i,
  /\b(idiot|idioti|idioata|idioate)\b/i,
  /\b(lene[s\u0219](a|e|i)?)\b/i,
  /\b(incompetent(a|e|i)?)\b/i,
  /\b(r[\u0103a]u|rea|r[\u0103a]i|rele)\b.*\b(caracter|om|persoana)\b/i
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
    return [{ json: { _error: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN', error_message: 'Subjective character judgments not allowed under observation/pattern.', missing_fields: [] }}];
  }
}

const confidence = Number.isFinite(inputs.confidence) ? inputs.confidence : 0.800;
const importance = Number.isFinite(inputs.importance) ? inputs.importance : 0.500;
const durability = inputs.durability || 'stable';
const evidence_refs = Array.isArray(inputs.evidence_refs) ? inputs.evidence_refs : [];
const metadata     = (inputs.metadata && typeof inputs.metadata === 'object') ? inputs.metadata : {};

const VALID_TIERS = ['recent','long_term'];
const tier = (typeof inputs.tier === 'string' && VALID_TIERS.includes(inputs.tier)) ? inputs.tier : 'recent';
const user_confirmed = (inputs.user_confirmed === true || inputs.user_confirmed === false) ? inputs.user_confirmed : false;
const corroboration_count = (Number.isInteger(inputs.corroboration_count) && inputs.corroboration_count >= 1) ? inputs.corroboration_count : 1;
const evidence_validated = (inputs.evidence_validated === true || inputs.evidence_validated === false) ? inputs.evidence_validated : false;

const idempotency_key = 'store_memory:' + env.execution_context_id + ':' + step.step_id;

return [{ json: {
  __db: {
    tenant_id:           env.tenant_id,
    memory_type:         inputs.memory_type,
    category,
    content:             inputs.content,
    confidence, importance, durability,
    source_thread_id:    inputs.source_thread_id,
    source_message_id:   inputs.source_message_id || null,
    entity_id:           inputs.entity_id || null,
    evidence_refs:       JSON.stringify(evidence_refs),
    metadata:            JSON.stringify(metadata),
    idempotency_key,
    tier,
    user_confirmed,
    corroboration_count,
    evidence_validated
  },
  passthrough: { env, step, inputs, idempotency_key }
}}];
