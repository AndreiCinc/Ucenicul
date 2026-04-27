// EC_Validate_Input — v1.1 (OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP 2026-04-26)
// v1.0 base: validate + adapt nested/flat shape; UUID + idempotency_key checks.
// v1.1 adds: preserve `envelope_metadata` from upstream so EC_Return_Result can
// forward it to OR. Object only; non-object becomes {}. No mutation; no DB write.
const items = $input.all();
const raw = (items[0] && items[0].json) || {};

let req;
if (raw.request && typeof raw.request === 'object') {
  req = {
    tenant_id: raw.request.tenant_id,
    thread_id: raw.request.thread_id,
    trigger_message_id: raw.request.trigger_message_id,
    resolution_method: raw.request.resolution_method,
    resolved_at: raw.request.resolved_at,
    idempotency_key: raw.request.idempotency_key || raw.idempotency_key || null,
    envelope_metadata: raw.request.envelope_metadata || raw.envelope_metadata || {}
  };
} else {
  req = {
    tenant_id: raw.tenant_id,
    thread_id: raw.thread_id,
    trigger_message_id: raw.trigger_message_id,
    resolution_method: raw.resolution_method || null,
    resolved_at: raw.resolved_at || null,
    idempotency_key: raw.idempotency_key || null,
    envelope_metadata: raw.envelope_metadata || {}
  };
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function invalid(code, missing) {
  return [{ json: { _valid: 'false', _error: code, _missing_fields: missing || [], _request: req } }];
}
const required = ['tenant_id', 'thread_id', 'trigger_message_id'];
const missing = required.filter(f => req[f] === undefined || req[f] === null || req[f] === '');
if (missing.length > 0) return invalid('INVALID_INPUT', missing);
for (const f of required) {
  if (typeof req[f] !== 'string' || !UUID_RE.test(req[f])) return invalid('INVALID_UUID', [f]);
}
if (req.resolved_at && isNaN(Date.parse(req.resolved_at))) return invalid('INVALID_RESOLVED_AT', ['resolved_at']);

const idemp = req.idempotency_key && String(req.idempotency_key).trim().length > 0
  ? String(req.idempotency_key)
  : (req.tenant_id + ':' + req.trigger_message_id + ':exec_ctx:v1');
if (idemp.length > 300) return invalid('IDEMPOTENCY_KEY_TOO_LONG', ['idempotency_key']);

// v1.1: scrub envelope_metadata to a plain object.
const env_meta = (req.envelope_metadata && typeof req.envelope_metadata === 'object' && !Array.isArray(req.envelope_metadata))
  ? req.envelope_metadata : {};

return [{ json: {
  _valid: 'true',
  tenant_id: req.tenant_id,
  thread_id: req.thread_id,
  trigger_message_id: req.trigger_message_id,
  resolution_method: req.resolution_method || null,
  resolved_at: req.resolved_at || null,
  _idempotency_key: idemp,
  envelope_metadata: env_meta
}}];
