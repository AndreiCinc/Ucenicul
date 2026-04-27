
const prep = $json;
if (prep && prep._error === true) {
  return [{ json: { _error: true, error_code: prep.error_code, error_message: prep.error_message, missing_fields: prep.missing_fields || [] }}];
}
const rawRows = $items().map(i => i.json);
const rows = rawRows.filter(r => r && typeof r === 'object' && typeof r.id === 'string');
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const recall_results = rows.map(r => ({
  memory_id: r.id,
  content: r.content,
  memory_type: r.memory_type,
  tier: r.tier,
  status: r.status,
  category: r.category,
  source_thread_id: r.source_thread_id,
  entity_id: r.entity_id,
  created_at: r.created_at
}));
const row_count = recall_results.length;
const row_word = row_count === 1 ? 'row' : 'rows';
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'analysis',
    status: 'success',
    summary: 'Memory recall completed (' + row_count + ' ' + row_word + ').',
    observations: [],
    proposals: [],
    actions_executed: [{ action: 'recall_memory', details: { recall_results }}],
    artifacts: [],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
