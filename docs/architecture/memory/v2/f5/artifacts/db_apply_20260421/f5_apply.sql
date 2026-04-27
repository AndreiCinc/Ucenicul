
BEGIN;

-- Precondition: workflow pristine at fc43f6bc baseline
-- Forces tx rollback via division-by-zero if any invariant fails.
SELECT CASE WHEN (
  "versionId" = 'fc43f6bc-6f25-4588-afda-edadb55735ff'
  AND jsonb_array_length(nodes::jsonb) = 45
  AND (nodes::jsonb #>> '{30,name}') = 'ME_Memory_Store_Prep'
  AND (nodes::jsonb #>> '{40,name}') = 'ME_Memory_Supersede_Prep'
  AND length((nodes::jsonb #>> '{30,parameters,jsCode}')) = 2624
  AND length((nodes::jsonb #>> '{40,parameters,jsCode}')) = 2751
  AND ((settings::jsonb) ? 'availableInMCP')
  AND ((settings::jsonb) ? 'timeSavedMode')
) THEN 1 ELSE 1/0 END AS preflight FROM workflow_entity WHERE id = 'uq26nh1grIpnHju0';

-- Surgical UPDATE
UPDATE workflow_entity SET
  nodes = (
    jsonb_set(
      jsonb_set(nodes::jsonb, '{30,parameters,jsCode}', to_jsonb($F5STORE$
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
$F5STORE$::text)),
      '{40,parameters,jsCode}', to_jsonb($F5SUP$
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
$F5SUP$::text)
    )
  )::json,
  settings = ((settings::jsonb) - 'availableInMCP' - 'timeSavedMode')::json,
  "versionId" = 'b8e2f194-0263-46d9-8306-1534cc7c31fe',
  "updatedAt" = (now() AT TIME ZONE 'UTC')
WHERE id = 'uq26nh1grIpnHju0';

-- Postcondition: new jsCode landed, 2 keys stripped, 3 keys preserved, 45 nodes still
SELECT CASE WHEN (
  "versionId" = 'b8e2f194-0263-46d9-8306-1534cc7c31fe'
  AND jsonb_array_length(nodes::jsonb) = 45
  AND length((nodes::jsonb #>> '{30,parameters,jsCode}')) = 3362
  AND length((nodes::jsonb #>> '{40,parameters,jsCode}')) = 3490
  AND (nodes::jsonb #>> '{30,parameters,jsCode}') LIKE '%SUBJECTIVE_EN%'
  AND (nodes::jsonb #>> '{40,parameters,jsCode}') LIKE '%SUBJECTIVE_EN%'
  AND (nodes::jsonb #>> '{30,parameters,jsCode}') LIKE '%SUBJECTIVE_RO%'
  AND (nodes::jsonb #>> '{40,parameters,jsCode}') LIKE '%SUBJECTIVE_RO%'
  AND NOT ((settings::jsonb) ? 'availableInMCP')
  AND NOT ((settings::jsonb) ? 'timeSavedMode')
  AND ((settings::jsonb) ? 'binaryMode')
  AND ((settings::jsonb) ? 'executionOrder')
  AND ((settings::jsonb) ? 'callerPolicy')
) THEN 1 ELSE 1/0 END AS postflight FROM workflow_entity WHERE id = 'uq26nh1grIpnHju0';

COMMIT;
