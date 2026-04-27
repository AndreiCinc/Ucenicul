// ME_Task_Create_Prep — v1.1 (AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP 2026-04-25)
// v1.0 base: validate inputs, parse priority + due fields, build idempotency_key.
// v1.1 adds: post-extraction ambiguity guard mirroring ME_Improvement_Capture_Prep
// (AMBIGUOUS_OR_EMPTY_FEEDBACK pattern). Rejects bare reminder verbs, demonstrative-
// only goals, and content shorter than MIN_TASK_LEN after defense-in-depth strip.
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};
const description = (inputs.description != null ? String(inputs.description) : '').trim();
const title       = (inputs.title       != null ? String(inputs.title)       : '').trim();
if (!description && !title) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS',
    error_message: 'Task create requires title or description.',
    missing_fields: ['title_or_description'] } }];
}

// AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP — guard #1: ambiguous / empty / pronoun-only.
function asciiFold(s) {
  return String(s).toLowerCase()
    .replace(/[\u0219\u015F]/g, 's')
    .replace(/[\u021B\u0163]/g, 't')
    .replace(/\u0103/g, 'a')
    .replace(/\u00E2/g, 'a')
    .replace(/\u00EE/g, 'i')
    .replace(/\u00E3/g, 'a');
}
const MIN_TASK_LEN = 6;
const rawEffective = (description || title || '').trim();
let effective = asciiFold(rawEffective)
  .replace(/[!.?,;:\s]+$/, '')
  .replace(/^\s*(?:aminteste[\-\s]?(?:ma|mi|ne)|reminder|remind\s+(?:me|us))\s*[:\-\u2013,]?\s*/i, '')
  .replace(/^\s*(?:fa|do|make|create|creeaza|creaza|adauga|seteaza)\s*[:\-\u2013,]?\s*/i, '')
  .replace(/^\s*(?:task|to[\-\s]?do|todo)\s*[:\-\u2013]\s*/i, '')
  .replace(/[!.?,;:\s]+$/, '')
  .trim();
if (!effective || effective.length < MIN_TASK_LEN) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_TASK',
    error_message: 'Task content is empty or too short \u2014 please specify what to do.',
    missing_fields: ['title_or_description'],
    needs_followup: true }}];
}
const DEMONSTRATIVE_ONLY = /^(?:chestia|cestia|the\s+thing|something|ceva|asta|aceasta|aia|acea|aceea|that|this)(?:\s+(?:asta|aceasta|aia|acea|aceea|that|this))?(?:\s+(?:pentru|for)\s+(?:mine|me|noi|us))?$/i;
if (DEMONSTRATIVE_ONLY.test(effective)) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_TASK',
    error_message: 'Task has no concrete object (only demonstrative pronouns) \u2014 please specify what to do.',
    missing_fields: ['title_or_description'],
    needs_followup: true }}];
}

const ALLOWED_PRIORITY = new Set(['low','normal','high','urgent']);
const ALLOWED_DUE_TYPE = new Set(['flexible','date','datetime']);
let priority = (inputs.priority != null ? String(inputs.priority).toLowerCase() : '').trim();
if (!ALLOWED_PRIORITY.has(priority)) priority = 'normal';
function uuidOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return s;
  return null;
}
function dateOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
function tsOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
let due_date = dateOrNull(inputs.due_date);
let due_at   = tsOrNull(inputs.due_at);
let due_type = (inputs.due_type != null ? String(inputs.due_type).toLowerCase() : '').trim();
if (!ALLOWED_DUE_TYPE.has(due_type)) {
  if (due_at) due_type = 'datetime';
  else if (due_date) due_type = 'date';
  else due_type = 'flexible';
}
if (due_type === 'datetime' && !due_at) due_type = due_date ? 'date' : 'flexible';
if (due_type === 'date' && !due_date) due_type = due_at ? 'datetime' : 'flexible';
if (due_type === 'flexible') { /* keep both possibly null */ }
const business_id = uuidOrNull(inputs.business_id);
const entity_id   = uuidOrNull(inputs.entity_id);
const sourceVal   = (inputs.source != null ? String(inputs.source) : '').trim() || null;
let userMeta = {};
if (inputs.metadata && typeof inputs.metadata === 'object' && !Array.isArray(inputs.metadata)) {
  userMeta = inputs.metadata;
}
const idempotency_key = `idem:create_task:${env.execution_context_id}:${step.step_id}`;
return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    business_id: business_id,
    entity_id: entity_id,
    title: title || description.slice(0, 240),
    description: description || null,
    priority: priority,
    due_type: due_type,
    due_date: due_date,
    due_at: due_at,
    source: sourceVal,
    metadata: JSON.stringify(userMeta || {}),
    idempotency_key: idempotency_key
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id
  }
}}];
