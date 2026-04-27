// ME_Build_RA_Envelope — v1.1 (B11-RA: wrap module_error envelopes into a
// canonical failed module_batch so that RA-01 aggregates instead of rejecting
// with INVALID_AGGREGATION_INPUT). Preserves the v1.0 success-path behavior.
function safeNode(name) {
  try { const it = $(name).first(); return (it && it.json) ? it.json : {}; } catch (e) { return {}; }
}
const src = $json;
const ctx = safeNode('ME_Validate_Dispatcher_Result');

if (src && src.status_kind === 'success' && src.result_type === 'module_result') {
  const mr = src.module_result || {};
  return [{ json: {
    status_kind: 'success',
    result_type: 'module_batch',
    execution_context_id: src.execution_context_id,
    thread_id: src.thread_id,
    tenant_id: src.tenant_id,
    aggregation_input: {
      aggregation_allowed: true,
      response_generation_allowed: false,
      module_execution_completed: true,
      domain_writes_performed: !!src.domain_writes_performed,
      module_results: [mr],
      expected_step_ids: [mr.step_id]
    }
  }}];
}

if (src && src.status_kind === 'error' && src.result_type === 'module_error') {
  const err = src.error || {};
  const step = (ctx && ctx.step) || {};
  const stepId = String(step.step_id || 'step_error');
  const moduleName = String(step.module_name || src.module_name || 'module_execution');
  const missingFields = Array.isArray(err.missing_fields) ? err.missing_fields : [];
  const details = (err.details && typeof err.details === 'object') ? err.details : {};
  const failedResult = {
    module_name: moduleName,
    step_id: stepId,
    result_type: 'module_result',
    status: 'failed',
    summary: String(err.message || 'Module execution failed.'),
    actions_executed: [],
    artifacts: [],
    observations: [{
      type: 'module_error',
      code: String(err.code || 'MODULE_ERROR'),
      message: String(err.message || ''),
      missing_fields: missingFields,
      details: details
    }],
    proposals: [],
    confidence: 0,
    needs_followup: true,
    followup_requests: [{
      reason: 'module_error',
      code: String(err.code || 'MODULE_ERROR'),
      missing_fields: missingFields,
      details: details
    }]
  };
  return [{ json: {
    status_kind: 'success',
    result_type: 'module_batch',
    execution_context_id: String(ctx.execution_context_id || ''),
    thread_id: String(ctx.thread_id || ''),
    tenant_id: String(ctx.tenant_id || ''),
    aggregation_input: {
      aggregation_allowed: true,
      response_generation_allowed: false,
      module_execution_completed: true,
      domain_writes_performed: false,
      module_results: [failedResult],
      expected_step_ids: [stepId]
    }
  }}];
}

return [{ json: src }];
