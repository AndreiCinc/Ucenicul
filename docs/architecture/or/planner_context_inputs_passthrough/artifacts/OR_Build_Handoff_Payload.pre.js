
// OR_Build_Handoff_Payload — v1.4 (Phase 10b: + primary_intent passthrough).
// Injects planner_context.user_message_text and planner_context.primary_intent
// when the trigger-message row provides them. No synthesis beyond passthrough.

function safeNode(name) {
  try { const it = $(name).first(); return (it && it.json) ? it.json : {}; }
  catch (e) { return {}; }
}
const verify = safeNode('OR_Verify_Context_Match');
const msgRow = $json || {};

if (verify._valid === 'false') {
  return [{ json: {
    status_kind: 'failed',
    result_type: 'error',
    module_name: 'orchestrator_input_handoff',
    error: {
      code: verify.error_code || 'CONTEXT_MISMATCH',
      message: verify.error_message || 'Context verification failed.',
      missing_fields: Array.isArray(verify.missing_fields) ? verify.missing_fields : []
    }
  }}];
}

const userMessageText = String(
  (msgRow.normalized_content != null ? msgRow.normalized_content :
   (msgRow.content != null ? msgRow.content : ''))
).trim();
const primaryIntent = String(msgRow.intent != null ? msgRow.intent : '').trim();

const plannerContext = {};
if (userMessageText) plannerContext.user_message_text = userMessageText;
if (primaryIntent) plannerContext.primary_intent = primaryIntent;

return [{ json: {
  status_kind: 'success',
  result_type: 'handoff',
  module_name: 'orchestrator_input_handoff',
  payload: {
    tenant_id: String(verify.tenant_id),
    thread_id: String(verify.thread_id),
    execution_id: String(verify.execution_id),
    trigger_message_id: String(verify.trigger_message_id),
    idempotency_key: String(verify.idempotency_key),
    execution_status: String(verify.expected_status),
    planning_allowed: true,
    allowed_next_stage: 'WF-PL-01',
    orchestrator_input: {
      planning_mode: 'plan_only',
      module_execution_allowed: false,
      response_generation_allowed: false,
      domain_writes_allowed: false
    },
    planner_context: plannerContext,
    warnings: Array.isArray(verify.warnings) ? verify.warnings : []
  }
}}];

