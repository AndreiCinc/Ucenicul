
const input = $json;
if (input && input._error === true) {
  return [{ json: {
    _error: true,
    error_code: input.error_code,
    error_message: input.error_message,
    missing_fields: input.missing_fields || []
  }}];
}
const dbRows = $items().map(i => i.json);
const row = dbRows && dbRows[0];
if (!row || !row.id) {
  return [{ json: { _error: true, error_code: 'DB_WRITE_FAILED', error_message: 'memory_items insert returned no row', missing_fields: [] }}];
}
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: 'success',
    summary: 'Memory store completed.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'store_memory',
      details: {
        memory_id: row.id,
        tier: row.tier,
        status: row.status,
        memory_type: row.memory_type,
        category: row.category,
        durability: row.durability,
        source_thread_id: row.source_thread_id,
        created_at: row.created_at,
        idempotency_reused: row.inserted === false
      }
    }],
    artifacts: [{ type: 'memory_id', value: row.id }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: true,
  response_generation_allowed: false
}}];

