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