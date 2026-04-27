"""Build JS (jsCode) versions of all MO-01 Code nodes — Python runner unavailable."""
import json, os
OUT = os.path.dirname(os.path.abspath(__file__))

VALIDATE_JS = r'''
const VALID_STATUSES = new Set(["success","partial","failed","no_action"]);
const VALID_CHANNELS = new Set(["telegram","whatsapp"]);
const TERMINAL_STAGE = "MESSAGE_OUT";

function canonicalError(code,message,details){
  return { status_kind:"error", result_type:"message_out_error",
           error:{ code, message, details: details || {} } };
}

const input = $input.first().json;
const payload = input;
const required = ["status_kind","result_type","execution_context_id","thread_id","tenant_id",
                  "composed_response","output_gateway_allowed","allowed_next_stage",
                  "response_generation_allowed","idempotency_key"];
const missing = required.filter(k => !(k in payload));
if (missing.length){
  return [{ json: Object.assign({ _valid:false, payload },
    canonicalError("INVALID_MESSAGE_OUT_INPUT","Missing required top-level fields.",{missing_fields:missing})) }];
}

const flags = {};
if (payload.status_kind !== "success") flags.status_kind = payload.status_kind;
if (payload.result_type !== "composed_response") flags.result_type = payload.result_type;
if (payload.allowed_next_stage !== TERMINAL_STAGE) flags.allowed_next_stage = payload.allowed_next_stage;
if (payload.output_gateway_allowed !== true) flags.output_gateway_allowed = payload.output_gateway_allowed;
if (payload.response_generation_allowed !== true) flags.response_generation_allowed = payload.response_generation_allowed;

const composed = (payload.composed_response && typeof payload.composed_response === "object") ? payload.composed_response : {};
if (!payload.composed_response || typeof payload.composed_response !== "object") flags.composed_response = typeof payload.composed_response;

const rs = composed.response_status;
const rt = composed.response_text;
if (!VALID_STATUSES.has(rs)) flags.response_status = rs;
if (typeof rt !== "string" || !rt.trim()) flags.response_text = rt;

const idem = payload.idempotency_key;
if (typeof idem !== "string" || !idem.trim()) flags.idempotency_key = idem;

const ch = composed.channel;
if (ch != null && !VALID_CHANNELS.has(ch)) flags.channel = ch;

if (Object.keys(flags).length){
  return [{ json: Object.assign({ _valid:false, payload },
    canonicalError("INVALID_MESSAGE_OUT_INPUT","Conflicting or invalid gateway eligibility fields.",flags)) }];
}

return [{ json: Object.assign({ _valid: true }, payload) }];
'''.strip()

VERIFY_JS = r'''
function canonicalError(code,message,details){
  return { status_kind:"error", result_type:"message_out_error",
           error:{ code, message, details: details || {} } };
}
const SUPPORTED = new Set(["telegram"]);

const payload = $('MO_Validate_Composed_Response_Input').first().json;

// Pull row results — each is the first output item of the named node
function firstRowOrNull(name){
  try {
    const r = $(name).all();
    if (!r || !r.length) return null;
    const j = r[0].json;
    if (!j || typeof j !== "object") return null;
    return j;
  } catch(e){ return null; }
}

const ecRow = firstRowOrNull("MO_Load_Execution_Context");
const thRow = firstRowOrNull("MO_Load_Thread_Context");
const ctxRow = firstRowOrNull("MO_Load_Channel_Delivery_Context");
const replayRow = firstRowOrNull("MO_Replay_Guard_Probe");

// Postgres node returns {} for zero rows with alwaysOutputData — detect by required keys
const ecOk = ecRow && ecRow.id;
const thOk = thRow && thRow.id;
const replaySeen = !!(replayRow && replayRow.id);

if (replaySeen){
  return [{ json: Object.assign({ _context_ready:false },
    canonicalError("REPLAY_BLOCKED","This outbound message has already been processed.",
      { idempotency_key: payload.idempotency_key })) }];
}
if (!ecOk){
  return [{ json: Object.assign({ _context_ready:false },
    canonicalError("LINEAGE_MISMATCH","execution_context row not found.",
      { execution_context_id: payload.execution_context_id, tenant_id: payload.tenant_id })) }];
}
if (String(ecRow.tenant_id) !== String(payload.tenant_id)){
  return [{ json: Object.assign({ _context_ready:false },
    canonicalError("LINEAGE_MISMATCH","execution_context tenant does not match payload tenant.",
      { execution_context_id: payload.execution_context_id, tenant_id: payload.tenant_id, row_tenant_id: ecRow.tenant_id })) }];
}
if (String(ecRow.thread_id) !== String(payload.thread_id)){
  return [{ json: Object.assign({ _context_ready:false },
    canonicalError("LINEAGE_MISMATCH","execution_context thread does not match payload thread.",
      { thread_id: payload.thread_id, row_thread_id: ecRow.thread_id })) }];
}
if (!thOk){
  return [{ json: Object.assign({ _context_ready:false },
    canonicalError("LINEAGE_MISMATCH","thread row not found.",
      { thread_id: payload.thread_id, tenant_id: payload.tenant_id })) }];
}
if (String(thRow.tenant_id) !== String(payload.tenant_id)){
  return [{ json: Object.assign({ _context_ready:false },
    canonicalError("LINEAGE_MISMATCH","thread tenant does not match payload tenant.",
      { thread_id: payload.thread_id, tenant_id: payload.tenant_id, row_tenant_id: thRow.tenant_id })) }];
}

const composed = payload.composed_response;
const explicitTarget = composed.delivery_target;
const ctxTarget = ctxRow ? ctxRow.delivery_target : null;
const channel = composed.channel || (ctxRow && ctxRow.channel) || "telegram";

if (!SUPPORTED.has(channel)){
  return [{ json: Object.assign({ _context_ready:false },
    canonicalError("UNSUPPORTED_CHANNEL","Requested delivery channel is not supported by the live gateway.",
      { channel })) }];
}
if (!explicitTarget && !ctxTarget){
  return [{ json: Object.assign({ _context_ready:false },
    canonicalError("MISSING_DELIVERY_TARGET","No delivery target could be resolved for outbound send.",
      { channel })) }];
}

return [{ json: {
  _context_ready: true,
  channel,
  delivery_target: explicitTarget || ctxTarget,
  execution_context_id: payload.execution_context_id,
  thread_id: payload.thread_id,
  tenant_id: payload.tenant_id,
  idempotency_key: payload.idempotency_key,
  composed_response: payload.composed_response,
}}];
'''.strip()

BUILD_REQ_JS = r'''
const crypto = require('crypto');
const v = $input.first().json;
const composed = v.composed_response;
const channel = v.channel;
const target = v.delivery_target;
const responseText = composed.response_text;

const reqKey = [v.execution_context_id, v.thread_id, v.tenant_id, v.idempotency_key, responseText].join("|");
const reqHash = crypto.createHash('sha256').update(reqKey).digest('hex').slice(0,12);
const respHash = crypto.createHash('sha256').update(responseText).digest('hex').slice(0,16);

return [{ json: {
  execution_context_id: v.execution_context_id,
  thread_id: v.thread_id,
  tenant_id: v.tenant_id,
  channel,
  delivery_target: target,
  response_text: responseText,
  response_text_hash: respHash,
  response_status: composed.response_status,
  warnings: composed.warnings || [],
  followup_requests: composed.followup_requests || [],
  idempotency_key: v.idempotency_key,
  delivery_request_id: `deliver:${v.execution_context_id}:${reqHash}`,
}}];
'''.strip()

BUILD_RESULT_JS = r'''
const logItem = $input.first().json || {};

let provider = { provider_delivery_attempted: true, provider_delivery_succeeded: false,
                 provider_message_ref: null, provider_error: "PROVIDER_SEND_FAILED" };
try {
  const ps = $('MO_Send_Channel_PLACEHOLDER').first().json;
  if (ps && (ps.ok === true || (ps.result && ps.result.message_id))){
    const r = ps.result || ps;
    const mid = r.message_id;
    const cid = r.chat && r.chat.id;
    provider = {
      provider_delivery_attempted: true,
      provider_delivery_succeeded: true,
      provider_message_ref: (mid != null) ? `telegram:${cid != null ? cid : ''}:${mid}` : null,
      provider_error: null,
    };
  }
} catch(e){
  provider = { provider_delivery_attempted: true, provider_delivery_succeeded: false,
               provider_message_ref: null, provider_error: `PROVIDER_SEND_FAILED:${e.message||e}` };
}

const logWritten = !!(logItem && logItem.id);
const logResult = {
  outbound_log_written: logWritten,
  log_error: logWritten ? null : "OUTBOUND_LOG_DUPLICATE_OR_FAILED",
};

const dr = $('MO_Build_Delivery_Request').first().json;
const applied = [], blocked = [], warnings = [];
if (provider.provider_delivery_succeeded) applied.push("provider_delivery");
else { blocked.push("provider_delivery"); if (provider.provider_error) warnings.push(provider.provider_error); }
if (logResult.outbound_log_written) applied.push("outbound_message_log");
else { blocked.push("outbound_message_log"); if (logResult.log_error) warnings.push(logResult.log_error); }

const complete = !!(provider.provider_delivery_succeeded && logResult.outbound_log_written);
const status = complete ? "success" : "partial";

return [{ json: {
  status_kind: "success",
  result_type: "message_out_result",
  execution_context_id: dr.execution_context_id,
  thread_id: dr.thread_id,
  tenant_id: dr.tenant_id,
  message_out_result: {
    status,
    channel: dr.channel,
    delivery_target: dr.delivery_target,
    provider_message_ref: provider.provider_message_ref,
    applied_write_classes: applied,
    blocked_write_classes: blocked,
    warning_count: warnings.length,
    warnings,
    followup_count: (dr.followup_requests || []).length,
    followup_requests: dr.followup_requests || [],
    response_status: dr.response_status,
    response_text_hash: dr.response_text_hash,
  },
  terminal_stage: true,
  message_out_completed: complete,
  provider_delivery_attempted: provider.provider_delivery_attempted,
  idempotency_key: dr.idempotency_key,
}}];
'''.strip()

TERMINAL_JS = 'return items.map(i => ({ json: i.json }));'

def wp(name, code):
    p = { "language": "javaScript", "jsCode": code }
    with open(os.path.join(OUT, f"{name}.params.json"), "w") as f:
        json.dump(p, f)
    print(f"wrote {name}.params.json ({len(code)} chars)")

wp("validate_js", VALIDATE_JS)
wp("verify_js", VERIFY_JS)
wp("build_req_js", BUILD_REQ_JS)
wp("build_result_js", BUILD_RESULT_JS)
wp("terminal_js", TERMINAL_JS)
