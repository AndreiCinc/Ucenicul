
// OR_Validate_EC_Result — v1.1 (accepts wrapped OR flat EC output)
// Source of truth for the flat shape: WF-EC-01 EC_Return_Result.
const input = $json;
let candidate = input;
if (typeof input.chatInput === 'string' && !input.payload && !input.id) {
  try {
    candidate = JSON.parse(input.chatInput);
  } catch (e) {
    candidate = input;
  }
}
function invalid(code, message, missing) {
  return [{ json: {
    _valid: 'false',
    error_code: code,
    error_message: message,
    missing_fields: (missing && missing.length ? missing : ['root'])
  }}];
}
if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
  return invalid('INVALID_HANDOFF_INPUT', 'Input is not a JSON object.', ['root']);
}
const shape = (candidate.payload && typeof candidate.payload === 'object')
  ? 'wrapped'
  : ((candidate.id && candidate.status && candidate.status_kind) ? 'flat' : 'unknown');
let normalizedPayload = null;
let sourceShape = shape;
let warnings = [];
if (shape === 'wrapped') {
  const requiredTop = ['status_kind', 'result_type', 'payload'];
  const requiredPayload = ['tenant_id', 'thread_id', 'execution_id', 'trigger_message_id', 'idempotency_key', 'status', 'ttl_seconds'];
  const missing = [];
  for (const key of requiredTop) { if (!(key in candidate)) missing.push(key); }
  const payload = candidate.payload;
  for (const key of requiredPayload) { if (!(key in payload)) missing.push(`payload.${key}`); }
  if (missing.length) return invalid('INVALID_HANDOFF_INPUT', 'Required handoff fields are missing.', [...new Set(missing)].sort());
  if (candidate.status_kind !== 'success') return invalid('INVALID_HANDOFF_INPUT', 'status_kind must be success.', ['status_kind']);
  if (candidate.result_type !== 'state') return invalid('INVALID_HANDOFF_INPUT', 'result_type must be state.', ['result_type']);
  if (String(payload.status) !== 'initialized') return invalid('NOT_READY_FOR_PLANNING', 'Execution context is not initialized.', ['payload.status']);
  const ttl = Number(payload.ttl_seconds);
  if (!Number.isFinite(ttl) || ttl <= 0) return invalid('NOT_READY_FOR_PLANNING', 'ttl_seconds must be positive.', ['payload.ttl_seconds']);
  normalizedPayload = {
    tenant_id: String(payload.tenant_id),
    thread_id: String(payload.thread_id),
    execution_id: String(payload.execution_id),
    trigger_message_id: String(payload.trigger_message_id),
    idempotency_key: String(payload.idempotency_key),
    status: String(payload.status),
    ttl_seconds: ttl
  };
} else if (shape === 'flat') {
  const requiredFlat = ['status_kind', 'result_type', 'id', 'tenant_id', 'thread_id', 'trigger_message_id', 'status'];
  const missing = [];
  for (const key of requiredFlat) { if (!(key in candidate)) missing.push(key); }
  if (missing.length) return invalid('INVALID_HANDOFF_INPUT', 'Required flat EC fields are missing.', [...new Set(missing)].sort());
  if (candidate.status_kind !== 'success') return invalid('INVALID_HANDOFF_INPUT', 'status_kind must be success.', ['status_kind']);
  if (candidate.result_type !== 'state') return invalid('INVALID_HANDOFF_INPUT', 'result_type must be state.', ['result_type']);
  if (String(candidate.status) !== 'initialized') return invalid('NOT_READY_FOR_PLANNING', 'Execution context is not initialized.', ['status']);
  if (candidate.error && Object.keys(candidate.error).length) return invalid('INVALID_HANDOFF_INPUT', 'Upstream carries a non-null error.', ['error']);
  const syntheticKey = String(candidate.tenant_id) + ':' + String(candidate.trigger_message_id) + ':exec_ctx:v1';
  normalizedPayload = {
    tenant_id: String(candidate.tenant_id),
    thread_id: String(candidate.thread_id),
    execution_id: String(candidate.id),
    trigger_message_id: String(candidate.trigger_message_id),
    idempotency_key: String(candidate.idempotency_key || syntheticKey),
    status: String(candidate.status),
    ttl_seconds: Number(candidate.ttl_seconds || 900)
  };
  if (!('idempotency_key' in candidate)) warnings.push('idempotency_key synthesized from flat EC shape');
  if (!('ttl_seconds' in candidate)) warnings.push('ttl_seconds defaulted to 900 from flat EC shape');
} else {
  return invalid('INVALID_HANDOFF_INPUT', 'Input shape does not match wrapped or flat EC contract.', ['payload or flat-identifier fields']);
}
return [{ json: {
  _valid: 'true',
  _source_shape: sourceShape,
  _normalized_ec_result: {
    status_kind: 'success',
    result_type: 'state',
    module_name: candidate.module_name || 'execution_context_init',
    warnings: (Array.isArray(candidate.warnings) ? candidate.warnings.slice() : []).concat(warnings),
    payload: normalizedPayload
  }
}}];

