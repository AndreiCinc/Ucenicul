// OR_Build_Handoff_Payload — v1.5 (OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP 2026-04-26)
// v1.4 base: passthrough user_message_text + primary_intent from messages row.
// v1.5 adds: read envelope_metadata from upstream OR_Extract_Handoff_Input + apply
// strict ALLOWLIST of structured ID keys, validate UUID shape, and write into
// planner_context.inputs. No semantic synthesis. No private/large blob blind passthrough.
function safeNode(name) {
  try { const it = $(name).first(); return (it && it.json) ? it.json : {}; }
  catch (e) { return {}; }
}
const verify = safeNode('OR_Verify_Context_Match');
const handoffIn = safeNode('OR_Extract_Handoff_Input');
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

// OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP — v1.5
// Strict allowlist: only structured UUID-like ID fields can flow from envelope_metadata
// into planner_context.inputs. Unknown keys, non-UUID values, large blobs are dropped.
const ALLOWED_KEYS = new Set([
  'memory_id','target_memory_id','supersedes_memory_id',
  'task_id','entity_id','business_id',
  'source_thread_id','source_message_id'
]);
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const env_meta = (handoffIn.envelope_metadata && typeof handoffIn.envelope_metadata === 'object' && !Array.isArray(handoffIn.envelope_metadata))
  ? handoffIn.envelope_metadata : {};
const inputs = {};
for (const key of Object.keys(env_meta)) {
  if (!ALLOWED_KEYS.has(key)) continue;
  const v = env_meta[key];
  if (typeof v !== 'string') continue;
  if (!UUID_RE.test(v)) continue;
  inputs[key] = v;
}

const plannerContext = {};
if (userMessageText) plannerContext.user_message_text = userMessageText;
if (primaryIntent) plannerContext.primary_intent = primaryIntent;
if (Object.keys(inputs).length) plannerContext.inputs = inputs;

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
