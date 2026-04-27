"""
Build n8n-patch params files for every Code node in MO-01,
plus params for the two Postgres nodes whose query shape we changed.
"""
import json, os

OUT = os.path.dirname(os.path.abspath(__file__))

# ---- Code node bodies (Python, runOnceForAllItems) ----

VALIDATE = r'''
VALID_RESPONSE_STATUSES = {"success", "partial", "failed", "no_action"}
VALID_CHANNELS = {"telegram", "whatsapp"}
TERMINAL_STAGE = "MESSAGE_OUT"

def canonical_error(code, message, details=None):
    return {
        "status_kind": "error",
        "result_type": "message_out_error",
        "error": {"code": code, "message": message, "details": details or {}},
    }

out = []
for item in items:
    payload = dict(item.json)
    required = ["status_kind","result_type","execution_context_id","thread_id","tenant_id",
                "composed_response","output_gateway_allowed","allowed_next_stage",
                "response_generation_allowed","idempotency_key"]
    missing = [k for k in required if k not in payload]
    if missing:
        res = {"_valid": False}
        res.update(canonical_error("INVALID_MESSAGE_OUT_INPUT",
                "Missing required top-level fields.", {"missing_fields": missing}))
        res["payload"] = payload
        out.append({"json": res})
        continue
    flag_errors = {}
    if payload.get("status_kind") != "success": flag_errors["status_kind"] = payload.get("status_kind")
    if payload.get("result_type") != "composed_response": flag_errors["result_type"] = payload.get("result_type")
    if payload.get("allowed_next_stage") != TERMINAL_STAGE: flag_errors["allowed_next_stage"] = payload.get("allowed_next_stage")
    if payload.get("output_gateway_allowed") is not True: flag_errors["output_gateway_allowed"] = payload.get("output_gateway_allowed")
    if payload.get("response_generation_allowed") is not True: flag_errors["response_generation_allowed"] = payload.get("response_generation_allowed")
    composed = payload.get("composed_response") or {}
    if not isinstance(composed, dict):
        flag_errors["composed_response"] = type(composed).__name__
        composed = {}
    rs = composed.get("response_status")
    rt = composed.get("response_text")
    if rs not in VALID_RESPONSE_STATUSES: flag_errors["response_status"] = rs
    if not isinstance(rt, str) or not rt.strip(): flag_errors["response_text"] = rt
    idem = payload.get("idempotency_key")
    if not isinstance(idem, str) or not idem.strip(): flag_errors["idempotency_key"] = idem
    ch = composed.get("channel")
    if ch is not None and ch not in VALID_CHANNELS: flag_errors["channel"] = ch
    if flag_errors:
        res = {"_valid": False}
        res.update(canonical_error("INVALID_MESSAGE_OUT_INPUT",
                "Conflicting or invalid gateway eligibility fields.", flag_errors))
        res["payload"] = payload
        out.append({"json": res})
    else:
        res = {"_valid": True}
        res.update(payload)
        out.append({"json": res})
return out
'''.strip()

VERIFY_LINEAGE = r'''
import hashlib

def canonical_error(code, message, details=None):
    return {
        "status_kind": "error",
        "result_type": "message_out_error",
        "error": {"code": code, "message": message, "details": details or {}},
    }

SUPPORTED_CHANNELS = {"telegram"}

# payload == validator output (passed through)
payload = dict(_("MO_Validate_Composed_Response_Input").first().json)

# exec_context_row from MO_Load_Execution_Context
ec_row = None
try:
    ec_node = _("MO_Load_Execution_Context").all()
    if ec_node:
        jr = ec_node[0].json
        if jr and "id" in jr:
            ec_row = dict(jr)
except Exception:
    ec_row = None

# thread_row from MO_Load_Thread_Context
thread_row = None
try:
    th_node = _("MO_Load_Thread_Context").all()
    if th_node:
        jr = th_node[0].json
        if jr and "id" in jr:
            thread_row = dict(jr)
except Exception:
    thread_row = None

# channel_ctx_row from MO_Load_Channel_Delivery_Context
ctx_row = None
try:
    ch_node = _("MO_Load_Channel_Delivery_Context").all()
    if ch_node:
        jr = ch_node[0].json
        if jr and (jr.get("delivery_target") or jr.get("channel")):
            ctx_row = dict(jr)
except Exception:
    ctx_row = None

# replay_seen from MO_Replay_Guard_Probe
replay_seen = False
try:
    rp_node = _("MO_Replay_Guard_Probe").all()
    if rp_node:
        jr = rp_node[0].json
        if jr and jr.get("id"):
            replay_seen = True
except Exception:
    replay_seen = False

# Compose verdict
if replay_seen:
    out = {"_context_ready": False}
    out.update(canonical_error("REPLAY_BLOCKED",
        "This outbound message has already been processed.",
        {"idempotency_key": payload.get("idempotency_key")}))
    return [{"json": out}]

if not ec_row:
    out = {"_context_ready": False}
    out.update(canonical_error("LINEAGE_MISMATCH",
        "execution_context row not found.",
        {"execution_context_id": payload.get("execution_context_id"),
         "tenant_id": payload.get("tenant_id")}))
    return [{"json": out}]

if str(ec_row.get("tenant_id")) != str(payload.get("tenant_id")):
    out = {"_context_ready": False}
    out.update(canonical_error("LINEAGE_MISMATCH",
        "execution_context tenant does not match payload tenant.",
        {"execution_context_id": payload.get("execution_context_id"),
         "tenant_id": payload.get("tenant_id"),
         "row_tenant_id": ec_row.get("tenant_id")}))
    return [{"json": out}]

if str(ec_row.get("thread_id")) != str(payload.get("thread_id")):
    out = {"_context_ready": False}
    out.update(canonical_error("LINEAGE_MISMATCH",
        "execution_context thread does not match payload thread.",
        {"thread_id": payload.get("thread_id"),
         "row_thread_id": ec_row.get("thread_id")}))
    return [{"json": out}]

if not thread_row:
    out = {"_context_ready": False}
    out.update(canonical_error("LINEAGE_MISMATCH",
        "thread row not found.",
        {"thread_id": payload.get("thread_id"),
         "tenant_id": payload.get("tenant_id")}))
    return [{"json": out}]

if str(thread_row.get("tenant_id")) != str(payload.get("tenant_id")):
    out = {"_context_ready": False}
    out.update(canonical_error("LINEAGE_MISMATCH",
        "thread tenant does not match payload tenant.",
        {"thread_id": payload.get("thread_id"),
         "tenant_id": payload.get("tenant_id"),
         "row_tenant_id": thread_row.get("tenant_id")}))
    return [{"json": out}]

composed = payload["composed_response"]
explicit_target = composed.get("delivery_target")
ctx_target = (ctx_row or {}).get("delivery_target")
channel = composed.get("channel") or (ctx_row or {}).get("channel") or "telegram"

if channel not in SUPPORTED_CHANNELS:
    out = {"_context_ready": False}
    out.update(canonical_error("UNSUPPORTED_CHANNEL",
        "Requested delivery channel is not supported by the live gateway.",
        {"channel": channel}))
    return [{"json": out}]

if not explicit_target and not ctx_target:
    out = {"_context_ready": False}
    out.update(canonical_error("MISSING_DELIVERY_TARGET",
        "No delivery target could be resolved for outbound send.",
        {"channel": channel}))
    return [{"json": out}]

out = {
    "_context_ready": True,
    "channel": channel,
    "delivery_target": explicit_target or ctx_target,
    # keep forward payload + row references
    "execution_context_id": payload["execution_context_id"],
    "thread_id": payload["thread_id"],
    "tenant_id": payload["tenant_id"],
    "idempotency_key": payload["idempotency_key"],
    "composed_response": payload["composed_response"],
}
return [{"json": out}]
'''.strip()

BUILD_DELIVERY_REQUEST = r'''
import hashlib

item = items[0]
v = dict(item.json)  # coming from Verify_Lineage_And_Replay via Route_Context_Ready(ready)
composed = v["composed_response"]
channel = v["channel"]
target = v["delivery_target"]
response_text = composed["response_text"]

req_hash = hashlib.sha256(
    ("{}|{}|{}|{}|{}".format(
        v["execution_context_id"], v["thread_id"], v["tenant_id"],
        v["idempotency_key"], response_text)).encode("utf-8")
).hexdigest()[:12]

resp_hash = hashlib.sha256(response_text.encode("utf-8")).hexdigest()[:16]

out = {
    "execution_context_id": v["execution_context_id"],
    "thread_id": v["thread_id"],
    "tenant_id": v["tenant_id"],
    "channel": channel,
    "delivery_target": target,
    "response_text": response_text,
    "response_text_hash": resp_hash,
    "response_status": composed["response_status"],
    "warnings": composed.get("warnings", []),
    "followup_requests": composed.get("followup_requests", []),
    "idempotency_key": v["idempotency_key"],
    "delivery_request_id": "deliver:{}:{}".format(v["execution_context_id"], req_hash),
}
return [{"json": out}]
'''.strip()

BUILD_DELIVERY_RESULT = r'''
import hashlib

# Entry from MO_Log_Outbound_Message.
# Provider send output is upstream of log write; read it via named node.
log_item = items[0].json if items else {}

provider = {}
try:
    ps = _("MO_Send_Channel_PLACEHOLDER").first().json
    # Telegram node returns a dict with result{} on success
    ok = bool(ps) and ("result" in ps or "message_id" in ps or "ok" in ps)
    if ok:
        mref = None
        r = ps.get("result", ps)
        if isinstance(r, dict):
            mid = r.get("message_id")
            cid = (r.get("chat") or {}).get("id")
            if mid is not None:
                mref = "telegram:{}:{}".format(cid if cid is not None else "", mid)
        provider = {
            "provider_delivery_attempted": True,
            "provider_delivery_succeeded": True,
            "provider_message_ref": mref,
            "provider_error": None,
        }
    else:
        provider = {
            "provider_delivery_attempted": True,
            "provider_delivery_succeeded": False,
            "provider_message_ref": None,
            "provider_error": "PROVIDER_SEND_FAILED",
        }
except Exception as e:
    provider = {
        "provider_delivery_attempted": True,
        "provider_delivery_succeeded": False,
        "provider_message_ref": None,
        "provider_error": "PROVIDER_SEND_FAILED:{}".format(e),
    }

# Log write result — Postgres returning a row ⇒ success; empty ⇒ blocked by unique idem
log_written = bool(log_item) and bool(log_item.get("id"))
log_result = {
    "outbound_log_written": log_written,
    "log_error": None if log_written else "OUTBOUND_LOG_DUPLICATE_OR_FAILED",
}

dr = _("MO_Build_Delivery_Request").first().json

applied, blocked, warnings = [], [], []
if provider.get("provider_delivery_succeeded"):
    applied.append("provider_delivery")
else:
    blocked.append("provider_delivery")
    if provider.get("provider_error"):
        warnings.append(provider["provider_error"])

if log_result["outbound_log_written"]:
    applied.append("outbound_message_log")
else:
    blocked.append("outbound_message_log")
    if log_result.get("log_error"):
        warnings.append(log_result["log_error"])

complete = bool(provider.get("provider_delivery_succeeded") and log_result["outbound_log_written"])
status = "success" if complete else "partial"

out = {
    "status_kind": "success",
    "result_type": "message_out_result",
    "execution_context_id": dr["execution_context_id"],
    "thread_id": dr["thread_id"],
    "tenant_id": dr["tenant_id"],
    "message_out_result": {
        "status": status,
        "channel": dr["channel"],
        "delivery_target": dr["delivery_target"],
        "provider_message_ref": provider.get("provider_message_ref"),
        "applied_write_classes": applied,
        "blocked_write_classes": blocked,
        "warning_count": len(warnings),
        "warnings": warnings,
        "followup_count": len(dr.get("followup_requests", [])),
        "followup_requests": dr.get("followup_requests", []),
        "response_status": dr["response_status"],
        "response_text_hash": dr["response_text_hash"],
    },
    "terminal_stage": True,
    "message_out_completed": complete,
    "provider_delivery_attempted": provider.get("provider_delivery_attempted", False),
    "idempotency_key": dr["idempotency_key"],
}
return [{"json": out}]
'''.strip()

# terminals: pass-through
TERMINAL = 'return [{"json": dict(item.json)} for item in items]'

def wparams(name, code):
    p = {
        "language": "python",
        "mode": "runOnceForAllItems",
        "pythonCode": code,
    }
    with open(os.path.join(OUT, f"{name}.params.json"), "w") as f:
        json.dump(p, f)
    print(f"wrote {name}.params.json ({len(code)} chars)")

wparams("validate", VALIDATE)
wparams("verify_lineage", VERIFY_LINEAGE)
wparams("build_delivery_request", BUILD_DELIVERY_REQUEST)
wparams("build_delivery_result", BUILD_DELIVERY_RESULT)
wparams("terminal", TERMINAL)

# ---- Postgres nodes param patches ----
REPLAY_QUERY = (
    "SELECT id, idempotency_key, channel, delivery_status, created_at "
    "FROM public.outbound_delivery_ledger_claude_mcp "
    "WHERE tenant_id = $1::uuid AND idempotency_key = $2 LIMIT 1;"
)
REPLAY_REPLACEMENT = "={{ [$('MO_Validate_Composed_Response_Input').first().json.tenant_id, $('MO_Validate_Composed_Response_Input').first().json.idempotency_key] }}"

LOG_QUERY = (
    "INSERT INTO public.outbound_delivery_ledger_claude_mcp "
    "(tenant_id, execution_context_id, thread_id, idempotency_key, channel, "
    " delivery_target, response_text_hash, provider_message_ref, delivery_status) "
    "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9) "
    "ON CONFLICT (tenant_id, idempotency_key) DO NOTHING "
    "RETURNING id, tenant_id, idempotency_key, channel, delivery_target, "
    "provider_message_ref, delivery_status, created_at;"
)
# Replacement order must match the query's $1..$9
LOG_REPLACEMENT = (
    "={{ ["
    "$('MO_Build_Delivery_Request').first().json.tenant_id, "
    "$('MO_Build_Delivery_Request').first().json.execution_context_id, "
    "$('MO_Build_Delivery_Request').first().json.thread_id, "
    "$('MO_Build_Delivery_Request').first().json.idempotency_key, "
    "$('MO_Build_Delivery_Request').first().json.channel, "
    "$('MO_Build_Delivery_Request').first().json.delivery_target, "
    "$('MO_Build_Delivery_Request').first().json.response_text_hash, "
    "($('MO_Send_Channel_PLACEHOLDER').first().json.result ? "
    " ('telegram:' + ($('MO_Send_Channel_PLACEHOLDER').first().json.result.chat.id + '') "
    "   + ':' + ($('MO_Send_Channel_PLACEHOLDER').first().json.result.message_id + '')) "
    " : null), "
    "($('MO_Send_Channel_PLACEHOLDER').first().json.ok === true ? 'delivered' : 'attempted')"
    "] }}"
)

# Replay param file
rp = {
    "operation": "executeQuery",
    "query": REPLAY_QUERY,
    "options": { "queryReplacement": REPLAY_REPLACEMENT, "queryBatching": "independently" },
    "alwaysOutputData": True,
}
with open(os.path.join(OUT, "replay_probe.params.json"), "w") as f:
    json.dump(rp, f)
print("wrote replay_probe.params.json")

lg = {
    "operation": "executeQuery",
    "query": LOG_QUERY,
    "options": { "queryReplacement": LOG_REPLACEMENT },
    "alwaysOutputData": True,
}
with open(os.path.join(OUT, "log_outbound.params.json"), "w") as f:
    json.dump(lg, f)
print("wrote log_outbound.params.json")

# Also patch channel_delivery query
ch_params = {
    "operation": "executeQuery",
    "query": (
        "SELECT id AS tenant_id, 'telegram'::text AS channel, "
        "(metadata->>'telegram_chat_id')::text AS delivery_target "
        "FROM public.tenants WHERE id = $1::uuid;"
    ),
    "options": {
        "queryReplacement": "={{ [$('MO_Validate_Composed_Response_Input').first().json.tenant_id] }}",
        "queryBatching": "independently",
    },
    "alwaysOutputData": True,
}
with open(os.path.join(OUT, "channel_delivery.params.json"), "w") as f:
    json.dump(ch_params, f)
print("wrote channel_delivery.params.json")
