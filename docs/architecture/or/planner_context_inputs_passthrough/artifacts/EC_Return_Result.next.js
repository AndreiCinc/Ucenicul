// EC_Return_Result — v1.1 (OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP 2026-04-26)
// v1.0 base: read DB row from EC_Load_Existing_Context, emit canonical EC contract.
// v1.1 adds: forward envelope_metadata (read from EC_Validate_Input output) so OR can
// later read it. No DB write; no schema change.
function safeNode(name) {
  try { const it = $(name).first(); return (it && it.json) ? it.json : {}; } catch (e) { return {}; }
}
const validated = safeNode('EC_Validate_Input');
const env_meta = (validated.envelope_metadata && typeof validated.envelope_metadata === 'object' && !Array.isArray(validated.envelope_metadata))
  ? validated.envelope_metadata : {};

const loaded = $('EC_Load_Existing_Context').all();
const src = (loaded[0] && loaded[0].json) || null;

if (!src || !src.id) {
  return [{ json: {
    id: null, tenant_id: null, thread_id: null, trigger_message_id: null,
    status: 'failed', current_goal: null, current_plan_ref: null,
    pending_steps: [], completed_steps: [],
    created_at: null, updated_at: null,
    error: { code: 'INTERNAL_LOAD_FAILED', message: 'Execution context could not be loaded after upsert' },
    module_name: 'execution_context_init', result_type: 'error', status_kind: 'failed',
    envelope_metadata: env_meta
  }}];
}

return [{ json: {
  id: src.id,
  tenant_id: src.tenant_id,
  thread_id: src.thread_id,
  trigger_message_id: src.trigger_message_id,
  status: src.status,
  current_goal: src.current_goal === undefined ? null : src.current_goal,
  current_plan_ref: src.current_plan_ref === undefined ? null : src.current_plan_ref,
  pending_steps: src.pending_steps || [],
  completed_steps: src.completed_steps || [],
  created_at: src.created_at,
  updated_at: src.updated_at,
  error: null,
  module_name: 'execution_context_init',
  result_type: 'state',
  status_kind: 'success',
  envelope_metadata: env_meta
}}];
