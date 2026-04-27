const input = $json || {};
const required = ['status_kind','result_type','execution_context_id','thread_id','tenant_id','state_update_result','allowed_next_stage','response_generation_allowed'];
const missing = required.filter(k => !(k in input));
if (missing.length) {
  return [{ json: {
    status_kind: 'error',
    result_type: 'composition_error',
    error: {
      code: 'INVALID_RESPONSE_COMPOSITION_INPUT',
      message: 'Missing required top-level field(s) for response composition.',
      missing_fields: missing,
      details: { received_keys: Object.keys(input).sort() }
    },
    _valid: false
  }}];
}
if (input.status_kind !== 'success' || input.result_type !== 'state_update_result') {
  return [{ json: {
    status_kind: 'error',
    result_type: 'composition_error',
    error: {
      code: 'INVALID_RESPONSE_COMPOSITION_INPUT',
      message: 'Unsupported envelope for RC.',
      missing_fields: [],
      details: { status_kind: input.status_kind, result_type: input.result_type }
    },
    _valid: false
  }}];
}
if (input.allowed_next_stage !== 'WF-RC-01' || input.response_generation_allowed !== true) {
  return [{ json: {
    status_kind: 'error',
    result_type: 'composition_error',
    error: {
      code: 'COMPOSITION_NOT_ALLOWED',
      message: 'RC is not allowed to compose for this envelope.',
      missing_fields: [],
      details: { allowed_next_stage: input.allowed_next_stage, response_generation_allowed: input.response_generation_allowed }
    },
    _valid: false
  }}];
}
const sur = input.state_update_result || {};
if (!sur.status || !sur.summary) {
  return [{ json: {
    status_kind: 'error',
    result_type: 'composition_error',
    error: {
      code: 'INVALID_RESPONSE_COMPOSITION_INPUT',
      message: 'state_update_result is incomplete.',
      missing_fields: [],
      details: { state_update_result: sur }
    },
    _valid: false
  }}];
}
return [{ json: {
  ...input,
  channel: input.channel || 'telegram',
  locale: input.locale || 'ro',
  _valid: true
}}];