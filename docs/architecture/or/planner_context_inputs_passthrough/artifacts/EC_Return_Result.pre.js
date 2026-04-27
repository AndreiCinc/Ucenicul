// EC_Return_Result — v1.0
// Reads the canonical row from EC_Load_Existing_Context and shapes the canonical
// ExecutionContext output contract.
// Note: reads via $('EC_Load_Existing_Context') to avoid coupling to upstream
// branching semantics. Classifies empty row as INTERNAL_LOAD_FAILED.

const loaded = $('EC_Load_Existing_Context').all();
const src = (loaded[0] && loaded[0].json) || null;

if (!src || !src.id) {
  return [{
    json: {
      id: null,
      tenant_id: null,
      thread_id: null,
      trigger_message_id: null,
      status: 'failed',
      current_goal: null,
      current_plan_ref: null,
      pending_steps: [],
      completed_steps: [],
      created_at: null,
      updated_at: null,
      error: {
        code: 'INTERNAL_LOAD_FAILED',
        message: 'Execution context could not be loaded after upsert'
      },
      module_name: 'execution_context_init',
      result_type: 'error',
      status_kind: 'failed'
    }
  }];
}

return [{
  json: {
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
    status_kind: 'success'
  }
}];

