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