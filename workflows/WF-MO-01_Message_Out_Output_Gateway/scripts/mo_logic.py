"""
WF-MO-01 deterministic logic — Message Out / Output Gateway.

Semantic rules:
- consume only RC-owned `composed_response`
- validate gateway eligibility
- verify lineage + replay + delivery target
- build a delivery request without mutating the response text
- report terminal delivery truth honestly
"""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Any, Dict, List, Optional

VALID_RESPONSE_STATUSES = {"success", "partial", "failed", "no_action"}
VALID_CHANNELS = {"telegram", "whatsapp"}
SUPPORTED_CHANNELS = {"telegram"}
TERMINAL_STAGE = "MESSAGE_OUT"


def canonical_error(code: str, message: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {
        "status_kind": "error",
        "result_type": "message_out_error",
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
    }


def _missing_top_level(payload: Dict[str, Any]) -> List[str]:
    required = [
        "status_kind",
        "result_type",
        "execution_context_id",
        "thread_id",
        "tenant_id",
        "composed_response",
        "output_gateway_allowed",
        "allowed_next_stage",
        "response_generation_allowed",
        "idempotency_key",
    ]
    return [k for k in required if k not in payload]


def validate_input(payload: Dict[str, Any]) -> Dict[str, Any]:
    missing = _missing_top_level(payload)
    if missing:
        return {
            "_valid": False,
            **canonical_error(
                "INVALID_MESSAGE_OUT_INPUT",
                "Missing required top-level fields.",
                {"missing_fields": missing},
            ),
        }

    flag_errors = {}
    if payload.get("status_kind") != "success":
        flag_errors["status_kind"] = payload.get("status_kind")
    if payload.get("result_type") != "composed_response":
        flag_errors["result_type"] = payload.get("result_type")
    if payload.get("allowed_next_stage") != TERMINAL_STAGE:
        flag_errors["allowed_next_stage"] = payload.get("allowed_next_stage")
    if payload.get("output_gateway_allowed") is not True:
        flag_errors["output_gateway_allowed"] = payload.get("output_gateway_allowed")
    if payload.get("response_generation_allowed") is not True:
        flag_errors["response_generation_allowed"] = payload.get("response_generation_allowed")

    composed = payload.get("composed_response", {})
    if not isinstance(composed, dict):
        flag_errors["composed_response"] = type(composed).__name__
        composed = {}

    response_status = composed.get("response_status")
    response_text = composed.get("response_text")
    if response_status not in VALID_RESPONSE_STATUSES:
        flag_errors["response_status"] = response_status
    if not isinstance(response_text, str) or not response_text.strip():
        flag_errors["response_text"] = response_text


    idem = payload.get("idempotency_key")
    if not isinstance(idem, str) or not idem.strip():
        flag_errors["idempotency_key"] = idem

    channel = composed.get("channel")
    if channel is not None and channel not in VALID_CHANNELS:
        flag_errors["channel"] = channel

    if flag_errors:
        return {
            "_valid": False,
            **canonical_error(
                "INVALID_MESSAGE_OUT_INPUT",
                "Conflicting or invalid gateway eligibility fields.",
                flag_errors,
            ),
        }

    return {
        "_valid": True,
        "payload": payload,
    }


def verify_lineage_and_replay(
    payload: Dict[str, Any],
    execution_context_row: Optional[Dict[str, Any]],
    thread_row: Optional[Dict[str, Any]],
    channel_ctx_row: Optional[Dict[str, Any]],
    replay_seen: bool = False,
) -> Dict[str, Any]:
    if replay_seen:
        return {
            "_context_ready": False,
            **canonical_error(
                "REPLAY_BLOCKED",
                "This outbound message has already been processed.",
                {"idempotency_key": payload.get("idempotency_key")},
            ),
        }

    if not execution_context_row:
        return {
            "_context_ready": False,
            **canonical_error(
                "LINEAGE_MISMATCH",
                "execution_context row not found.",
                {
                    "execution_context_id": payload.get("execution_context_id"),
                    "tenant_id": payload.get("tenant_id"),
                },
            ),
        }

    if execution_context_row.get("tenant_id") != payload.get("tenant_id"):
        return {
            "_context_ready": False,
            **canonical_error(
                "LINEAGE_MISMATCH",
                "execution_context tenant does not match payload tenant.",
                {
                    "execution_context_id": payload.get("execution_context_id"),
                    "tenant_id": payload.get("tenant_id"),
                    "row_tenant_id": execution_context_row.get("tenant_id"),
                },
            ),
        }

    if execution_context_row.get("thread_id") != payload.get("thread_id"):
        return {
            "_context_ready": False,
            **canonical_error(
                "LINEAGE_MISMATCH",
                "execution_context thread does not match payload thread.",
                {
                    "thread_id": payload.get("thread_id"),
                    "row_thread_id": execution_context_row.get("thread_id"),
                },
            ),
        }

    if not thread_row:
        return {
            "_context_ready": False,
            **canonical_error(
                "LINEAGE_MISMATCH",
                "thread row not found.",
                {"thread_id": payload.get("thread_id"), "tenant_id": payload.get("tenant_id")},
            ),
        }

    if thread_row.get("tenant_id") != payload.get("tenant_id"):
        return {
            "_context_ready": False,
            **canonical_error(
                "LINEAGE_MISMATCH",
                "thread tenant does not match payload tenant.",
                {
                    "thread_id": payload.get("thread_id"),
                    "tenant_id": payload.get("tenant_id"),
                    "row_tenant_id": thread_row.get("tenant_id"),
                },
            ),
        }

    composed = payload["composed_response"]
    explicit_target = composed.get("delivery_target")
    ctx_target = None if not channel_ctx_row else channel_ctx_row.get("delivery_target")
    channel = composed.get("channel") or (channel_ctx_row or {}).get("channel") or "telegram"

    if channel not in SUPPORTED_CHANNELS:
        return {
            "_context_ready": False,
            **canonical_error(
                "UNSUPPORTED_CHANNEL",
                "Requested delivery channel is not supported by the live gateway.",
                {"channel": channel},
            ),
        }

    if not explicit_target and not ctx_target:
        return {
            "_context_ready": False,
            **canonical_error(
                "MISSING_DELIVERY_TARGET",
                "No delivery target could be resolved for outbound send.",
                {"channel": channel},
            ),
        }

    return {
        "_context_ready": True,
        "channel": channel,
        "delivery_target": explicit_target or ctx_target,
        "execution_context_row": execution_context_row,
        "thread_row": thread_row,
        "channel_ctx_row": channel_ctx_row or {},
    }


def build_delivery_request(payload: Dict[str, Any], verified: Dict[str, Any]) -> Dict[str, Any]:
    composed = payload["composed_response"]
    channel = verified["channel"]
    target = verified["delivery_target"]
    response_text = composed["response_text"]

    request_hash = sha256(
        f"{payload['execution_context_id']}|{payload['thread_id']}|{payload['tenant_id']}|{payload['idempotency_key']}|{response_text}".encode("utf-8")
    ).hexdigest()[:12]

    return {
        "execution_context_id": payload["execution_context_id"],
        "thread_id": payload["thread_id"],
        "tenant_id": payload["tenant_id"],
        "channel": channel,
        "delivery_target": target,
        "response_text": response_text,
        "response_status": composed["response_status"],
        "warnings": composed.get("warnings", []),
        "followup_requests": composed.get("followup_requests", []),
        "idempotency_key": payload["idempotency_key"],
        "delivery_request_id": f"deliver:{payload['execution_context_id']}:{request_hash}",
    }


def simulate_provider_send(delivery_request: Dict[str, Any], success: bool = True, provider_ref: Optional[str] = None) -> Dict[str, Any]:
    if not success:
        return {
            "provider_delivery_attempted": True,
            "provider_delivery_succeeded": False,
            "provider_message_ref": None,
            "provider_error": "PROVIDER_SEND_FAILED",
        }
    return {
        "provider_delivery_attempted": True,
        "provider_delivery_succeeded": True,
        "provider_message_ref": provider_ref or f"provider:{delivery_request['delivery_request_id']}",
        "provider_error": None,
    }


def simulate_log_write(delivery_request: Dict[str, Any], success: bool = True) -> Dict[str, Any]:
    if not success:
        return {
            "outbound_log_written": False,
            "log_error": "OUTBOUND_LOG_WRITE_FAILED",
        }
    return {
        "outbound_log_written": True,
        "log_error": None,
    }


def build_delivery_result(
    payload: Dict[str, Any],
    delivery_request: Dict[str, Any],
    provider_result: Dict[str, Any],
    log_result: Dict[str, Any],
) -> Dict[str, Any]:
    applied = []
    blocked = []
    warnings = []

    if provider_result.get("provider_delivery_succeeded"):
        applied.append("provider_delivery")
    else:
        blocked.append("provider_delivery")
        if provider_result.get("provider_error"):
            warnings.append(provider_result["provider_error"])

    if log_result.get("outbound_log_written"):
        applied.append("outbound_message_log")
    else:
        blocked.append("outbound_message_log")
        if log_result.get("log_error"):
            warnings.append(log_result["log_error"])

    complete = bool(provider_result.get("provider_delivery_succeeded") and log_result.get("outbound_log_written"))
    status = "success" if complete else "partial"

    return {
        "status_kind": "success",
        "result_type": "message_out_result",
        "execution_context_id": payload["execution_context_id"],
        "thread_id": payload["thread_id"],
        "tenant_id": payload["tenant_id"],
        "message_out_result": {
            "status": status,
            "channel": delivery_request["channel"],
            "delivery_target": delivery_request["delivery_target"],
            "provider_message_ref": provider_result.get("provider_message_ref"),
            "applied_write_classes": applied,
            "blocked_write_classes": blocked,
            "warning_count": len(warnings),
            "warnings": warnings,
            "followup_count": len(delivery_request.get("followup_requests", [])),
            "followup_requests": delivery_request.get("followup_requests", []),
            "response_status": delivery_request["response_status"],
            "response_text_hash": sha256(delivery_request["response_text"].encode("utf-8")).hexdigest()[:16],
        },
        "terminal_stage": True,
        "message_out_completed": complete,
        "provider_delivery_attempted": provider_result.get("provider_delivery_attempted", False),
        "idempotency_key": payload["idempotency_key"],
    }


def build_provider_placeholder_result(delivery_request: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "provider_delivery_attempted": False,
        "provider_delivery_succeeded": False,
        "provider_message_ref": None,
        "provider_error": "PROVIDER_SEND_PLACEHOLDER_NOT_REPLACED",
    }