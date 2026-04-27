
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
