// EC_Validate_Input — v1.0
// Purpose: Validate and adapt the inbound ExecutionContextInitRequest.
// Accepts both flat and nested shapes.
// Nested: { request: { tenant_id, thread_id, trigger_message_id, resolution_method, resolved_at, idempotency_key } }
// Flat:   { tenant_id, thread_id, trigger_message_id, resolution_method, resolved_at, idempotency_key }
// Output: validated request with _valid='true' (string) or _valid='false' with _error.

const items = $input.all();
const raw = (items[0] && items[0].json) || {};

// Adapter: detect nested vs flat
let req;
if (raw.request && typeof raw.request === 'object') {
  req = {
    tenant_id: raw.request.tenant_id,
    thread_id: raw.request.thread_id,
    trigger_message_id: raw.request.trigger_message_id,
    resolution_method: raw.request.resolution_method,
    resolved_at: raw.request.resolved_at,
    idempotency_key: raw.request.idempotency_key || raw.idempotency_key || null
  };
} else {
  req = {
    tenant_id: raw.tenant_id,
    thread_id: raw.thread_id,
    trigger_message_id: raw.trigger_message_id,
    resolution_method: raw.resolution_method || null,
    resolved_at: raw.resolved_at || null,
    idempotency_key: raw.idempotency_key || null
  };
}

// UUID v4/any-variant permissive regex (aligned with PostgreSQL uuid cast)
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function invalid(code, missing) {
  return [{
    json: {
      _valid: 'false',
      _error: code,
      _missing_fields: missing || [],
      _request: req
    }
  }];
}

const required = ['tenant_id', 'thread_id', 'trigger_message_id'];
const missing = required.filter(f => req[f] === undefined || req[f] === null || req[f] === '');
if (missing.length > 0) {
  return invalid('INVALID_INPUT', missing);
}

for (const f of required) {
  if (typeof req[f] !== 'string' || !UUID_RE.test(req[f])) {
    return invalid('INVALID_UUID', [f]);
  }
}

// Optional resolved_at: if provided, must be valid ISO 8601-ish
if (req.resolved_at && isNaN(Date.parse(req.resolved_at))) {
  return invalid('INVALID_RESOLVED_AT', ['resolved_at']);
}

// Derive idempotency_key deterministically if not provided
const idemp = req.idempotency_key && String(req.idempotency_key).trim().length > 0
  ? String(req.idempotency_key)
  : (req.tenant_id + ':' + req.trigger_message_id + ':exec_ctx:v1');

// Guard VARCHAR(300) upper bound on idempotency_key
if (idemp.length > 300) {
  return invalid('IDEMPOTENCY_KEY_TOO_LONG', ['idempotency_key']);
}

return [{
  json: {
    _valid: 'true',
    tenant_id: req.tenant_id,
    thread_id: req.thread_id,
    trigger_message_id: req.trigger_message_id,
    resolution_method: req.resolution_method || null,
    resolved_at: req.resolved_at || null,
    _idempotency_key: idemp
  }
}];

