// ME_Improvement_Capture_Prep — v1.0
// Validates inputs, normalizes feedback content, applies a light category
// heuristic for telemetry, and emits the __db payload consumed by
// ME_Improvement_Capture_DB. ME_Improvement_Capture_Result reads __ctx and
// the DB row to compose the canonical envelope.
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};

// Accept either feedback_content (canonical PL output for save_suggestion)
// or raw feedback aliases.
let content = '';
if (inputs.feedback_content != null && String(inputs.feedback_content).trim()) {
  content = String(inputs.feedback_content);
} else if (inputs.feedback != null && String(inputs.feedback).trim()) {
  content = String(inputs.feedback);
} else if (inputs.content != null && String(inputs.content).trim()) {
  content = String(inputs.content);
}
content = String(content).trim();

const MIN_LEN = 4;
if (!content || content.length < MIN_LEN) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_FEEDBACK',
    error_message: 'Feedback content is empty or too short to capture meaningfully.',
    missing_fields: !content ? ['feedback_content'] : [] }}];
}

// Strip leading verb prefix in case PL did not (defensive).
content = content.replace(/^\s*(?:sugestie|propunere|feedback)\s*[:\-–]\s*/i, '');
content = content.replace(/^\s*(?:am\s+o\s+sugestie|am\s+o\s+propunere)\s*[:\-–]?\s*/i, '');
content = content.trim();
if (!content || content.length < MIN_LEN) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_FEEDBACK',
    error_message: 'Feedback content is empty after normalization.',
    missing_fields: ['feedback_content'] }}];
}

// Light category heuristic for downstream telemetry. Stored in __ctx; not
// persisted to the DB (no metadata column on improvement_requests).
const lower = content.toLowerCase();
let category = 'other';
if (/\b(bug|eroare|error|crash|broken|crap[aă]|nu\s+funct|defect|nu\s+merge|stric)\b/.test(lower)) category = 'bug';
else if (/\b(feature|functie|funcționalitate|adaug[aă]|imbun[aă]t|implement|please\s+add|add\s+(?:a\s+)?(?:new|the))\b/.test(lower)) category = 'feature';
else if (/\b(ux|user\s+experience|ui|interfa[țt]|usability|usable|design|prea\s+greu|prea\s+complicat|confuz)\b/.test(lower)) category = 'ux';
else if (/\b(automatiz|automate|integrat|integrate|connect(?:are)?|sync|webhook)\b/.test(lower)) category = 'automation';

// requested_feature is the structured ask (NOT NULL); user_message is the raw input.
// PL v2.2 emits both feedback_content (cleaned) and user_message (raw goal). If
// PL didn't emit user_message, fall back to the cleaned content.
const requested_feature = content;
const user_message = (inputs.user_message != null && String(inputs.user_message).trim())
  ? String(inputs.user_message).trim()
  : content;

return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    requested_feature: requested_feature,
    user_message: user_message
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id,
    category: category
  }
}}];
