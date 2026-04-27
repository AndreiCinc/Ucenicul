"""
WF-RC-01 canonical deterministic logic.

Response Composer consumes the downstream envelope from WF-SU-01 and produces
one final user-facing response envelope for Message Out / Output Gateway.

This module is intentionally pure and deterministic so that it can be tested
off-node and translated into n8n Code nodes without ambiguity.
"""
from __future__ import annotations

import hashlib
from copy import deepcopy
from typing import Any, Dict, List, Optional

REQUIRED_TOP_LEVEL_FIELDS = [
    "status_kind",
    "result_type",
    "execution_context_id",
    "thread_id",
    "tenant_id",
    "state_update_result",
    "allowed_next_stage",
    "response_generation_allowed",
]

ALLOWED_STATUS_KIND = {"success"}
ALLOWED_RESULT_TYPE = {"state_update_result"}
ALLOWED_NEXT_STAGE = "WF-RC-01"
ALLOWED_ROLLUP_STATUS = {"success", "partial", "failed", "no_action"}
ALLOWED_CHANNELS = {"telegram", "whatsapp", "web"}
ALLOWED_LOCALES = {"ro", "en"}

ERROR_INVALID_INPUT = "INVALID_RESPONSE_COMPOSITION_INPUT"
ERROR_LINEAGE_MISMATCH = "LINEAGE_MISMATCH"
ERROR_COMPOSITION_NOT_ALLOWED = "COMPOSITION_NOT_ALLOWED"

WRITE_CLASS_LABELS_RO = {
    "execution_state_update": "starea execuției",
    "thread_state_update": "firul de lucru",
    "memory_candidate_persistence": "candidații de memorie",
    "audit_persistence": "auditul intern",
    "domain_event_write": "scriere de eveniment de domeniu",
}
WRITE_CLASS_LABELS_EN = {
    "execution_state_update": "execution state",
    "thread_state_update": "thread context",
    "memory_candidate_persistence": "memory candidates",
    "audit_persistence": "audit trail",
    "domain_event_write": "domain event write",
}


def _copy(value: Any) -> Any:
    return deepcopy(value)


def canonical_error(code: str, message: str, *, details: Optional[Dict[str, Any]] = None, missing_fields: Optional[List[str]] = None) -> Dict[str, Any]:
    return {
        "status_kind": "error",
        "result_type": "composition_error",
        "error": {
            "code": code,
            "message": message,
            "missing_fields": missing_fields or [],
            "details": details or {},
        },
    }


def validate_state_update_input(payload: Dict[str, Any]) -> Dict[str, Any]:
    payload = _copy(payload or {})
    missing = [f for f in REQUIRED_TOP_LEVEL_FIELDS if f not in payload]
    if missing:
        return canonical_error(
            ERROR_INVALID_INPUT,
            "Missing required top-level field(s) for response composition.",
            missing_fields=missing,
            details={"received_keys": sorted(payload.keys())},
        )

    if payload["status_kind"] not in ALLOWED_STATUS_KIND:
        return canonical_error(
            ERROR_INVALID_INPUT,
            "Unsupported status_kind for RC input.",
            details={"status_kind": payload["status_kind"]},
        )
    if payload["result_type"] not in ALLOWED_RESULT_TYPE:
        return canonical_error(
            ERROR_INVALID_INPUT,
            "Unsupported result_type for RC input.",
            details={"result_type": payload["result_type"]},
        )
    if payload["allowed_next_stage"] != ALLOWED_NEXT_STAGE:
        return canonical_error(
            ERROR_COMPOSITION_NOT_ALLOWED,
            "allowed_next_stage does not permit WF-RC-01.",
            details={"allowed_next_stage": payload["allowed_next_stage"]},
        )
    if payload["response_generation_allowed"] is not True:
        return canonical_error(
            ERROR_COMPOSITION_NOT_ALLOWED,
            "response_generation_allowed must be true before RC may compose.",
            details={"response_generation_allowed": payload["response_generation_allowed"]},
        )

    state_update_result = payload.get("state_update_result")
    if not isinstance(state_update_result, dict):
        return canonical_error(
            ERROR_INVALID_INPUT,
            "state_update_result must be an object.",
            details={"state_update_result_type": type(state_update_result).__name__},
        )

    if state_update_result.get("status") not in ALLOWED_ROLLUP_STATUS:
        return canonical_error(
            ERROR_INVALID_INPUT,
            "state_update_result.status is invalid.",
            details={"status": state_update_result.get("status")},
        )

    if not isinstance(state_update_result.get("summary"), str) or not state_update_result["summary"].strip():
        return canonical_error(
            ERROR_INVALID_INPUT,
            "state_update_result.summary must be a non-empty string.",
            details={"summary": state_update_result.get("summary")},
        )

    channel = payload.get("channel", "telegram")
    locale = payload.get("locale", "ro")
    if channel not in ALLOWED_CHANNELS:
        return canonical_error(
            ERROR_INVALID_INPUT,
            "Unsupported channel for RC.",
            details={"channel": channel},
        )
    if locale not in ALLOWED_LOCALES:
        return canonical_error(
            ERROR_INVALID_INPUT,
            "Unsupported locale for RC.",
            details={"locale": locale},
        )

    payload["channel"] = channel
    payload["locale"] = locale
    payload["state_update_result"].setdefault("applied_write_classes", [])
    payload["state_update_result"].setdefault("blocked_write_classes", [])
    payload["state_update_result"].setdefault("warnings", [])
    payload["state_update_result"].setdefault("followup_requests", [])
    payload["state_update_result"].setdefault("user_visible_facts", [])
    payload["state_update_result"].setdefault("actions_acknowledged", [])
    payload["_valid"] = True
    return payload


def verify_lineage(payload: Dict[str, Any], execution_context_row: Optional[Dict[str, Any]] = None, thread_row: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = _copy(payload or {})
    if payload.get("status_kind") == "error":
        return payload

    if not execution_context_row:
        return canonical_error(
            ERROR_LINEAGE_MISMATCH,
            "execution_context row not found.",
            details={
                "execution_context_id": payload.get("execution_context_id"),
                "tenant_id": payload.get("tenant_id"),
            },
        )

    if execution_context_row.get("tenant_id") != payload.get("tenant_id"):
        return canonical_error(
            ERROR_LINEAGE_MISMATCH,
            "execution_context tenant mismatch.",
            details={
                "execution_context_id": payload.get("execution_context_id"),
                "tenant_id": payload.get("tenant_id"),
                "row_tenant_id": execution_context_row.get("tenant_id"),
            },
        )

    if execution_context_row.get("thread_id") != payload.get("thread_id"):
        return canonical_error(
            ERROR_LINEAGE_MISMATCH,
            "execution_context thread mismatch.",
            details={
                "execution_context_id": payload.get("execution_context_id"),
                "thread_id": payload.get("thread_id"),
                "row_thread_id": execution_context_row.get("thread_id"),
            },
        )

    if thread_row is not None:
        if thread_row.get("tenant_id") != payload.get("tenant_id"):
            return canonical_error(
                ERROR_LINEAGE_MISMATCH,
                "thread tenant mismatch.",
                details={
                    "thread_id": payload.get("thread_id"),
                    "tenant_id": payload.get("tenant_id"),
                    "row_tenant_id": thread_row.get("tenant_id"),
                },
            )
        if thread_row.get("id") != payload.get("thread_id"):
            return canonical_error(
                ERROR_LINEAGE_MISMATCH,
                "thread row mismatch.",
                details={
                    "thread_id": payload.get("thread_id"),
                    "row_id": thread_row.get("id"),
                },
            )

    payload["_context_ready"] = True
    payload["_execution_context_row"] = execution_context_row
    payload["_thread_row"] = thread_row or {}
    return payload


def build_composition_input(payload: Dict[str, Any]) -> Dict[str, Any]:
    payload = _copy(payload or {})
    if payload.get("status_kind") == "error":
        return payload

    sur = payload["state_update_result"]
    thread_row = payload.get("_thread_row", {}) or {}
    return {
        "execution_context_id": payload["execution_context_id"],
        "thread_id": payload["thread_id"],
        "tenant_id": payload["tenant_id"],
        "channel": payload.get("channel", "telegram"),
        "locale": payload.get("locale", "ro"),
        "status": sur["status"],
        "summary": sur["summary"].strip(),
        "applied_write_classes": list(sur.get("applied_write_classes", [])),
        "blocked_write_classes": list(sur.get("blocked_write_classes", [])),
        "warnings": list(sur.get("warnings", [])),
        "followup_requests": list(sur.get("followup_requests", [])),
        "user_visible_facts": list(sur.get("user_visible_facts", [])),
        "actions_acknowledged": list(sur.get("actions_acknowledged", [])),
        "thread_title": thread_row.get("title"),
        "thread_summary": thread_row.get("summary"),
    }


def _labels(write_classes: List[str], locale: str) -> List[str]:
    labels = WRITE_CLASS_LABELS_RO if locale == "ro" else WRITE_CLASS_LABELS_EN
    return [labels.get(wc, wc) for wc in write_classes]


def _normalize_warning(w: Any) -> str:
    if isinstance(w, dict):
        code = w.get("code")
        message = w.get("message")
        if code and message:
            return f"{code}: {message}"
        if message:
            return str(message)
        return json_safe(w)
    return str(w)


def json_safe(value: Any) -> str:
    text = str(value)
    return text.replace("\n", " ").strip()


def compose_response(comp: Dict[str, Any]) -> Dict[str, Any]:
    locale = comp["locale"]
    status = comp["status"]
    applied = _labels(comp.get("applied_write_classes", []), locale)
    blocked = _labels(comp.get("blocked_write_classes", []), locale)
    warnings = [_normalize_warning(w) for w in comp.get("warnings", [])]
    followups = [_normalize_warning(f) for f in comp.get("followup_requests", [])]
    facts = [json_safe(x) for x in comp.get("user_visible_facts", []) if str(x).strip()]
    actions = [json_safe(x) for x in comp.get("actions_acknowledged", []) if str(x).strip()]
    summary = comp["summary"]

    lines: List[str] = []

    if locale == "ro":
        if status == "success":
            lines.append("Am finalizat actualizarea și pot continua cu răspunsul final.")
        elif status == "partial":
            lines.append("Am finalizat doar parțial actualizarea necesară înainte de răspuns.")
        elif status == "failed":
            lines.append("Nu am putut finaliza corect pregătirea răspunsului.")
        elif status == "no_action":
            lines.append("Am verificat starea curentă. Nu a fost necesară nicio acțiune suplimentară.")
        lines.append(summary)
        if actions:
            lines.append("Acțiuni confirmate: " + "; ".join(actions) + ".")
        if applied:
            lines.append("Aplicat: " + ", ".join(applied) + ".")
        if blocked:
            lines.append("Blocat sau rămas neaplicat: " + ", ".join(blocked) + ".")
        if facts:
            lines.append("Context util: " + "; ".join(facts) + ".")
        if warnings:
            lines.append("Atenționări: " + "; ".join(warnings) + ".")
        if followups:
            lines.append("Mai am nevoie de clarificări pentru: " + "; ".join(followups) + ".")
    else:
        if status == "success":
            lines.append("I completed the required preparation and can proceed with the final response.")
        elif status == "partial":
            lines.append("I completed the preparation only partially before the final response.")
        elif status == "failed":
            lines.append("I could not complete the response preparation correctly.")
        elif status == "no_action":
            lines.append("I checked the current state. No additional action was required.")
        lines.append(summary)
        if actions:
            lines.append("Confirmed actions: " + "; ".join(actions) + ".")
        if applied:
            lines.append("Applied: " + ", ".join(applied) + ".")
        if blocked:
            lines.append("Blocked or not applied: " + ", ".join(blocked) + ".")
        if facts:
            lines.append("Useful context: " + "; ".join(facts) + ".")
        if warnings:
            lines.append("Warnings: " + "; ".join(warnings) + ".")
        if followups:
            lines.append("I still need clarification for: " + "; ".join(followups) + ".")

    final_response_text = "\n".join(line for line in lines if line and line.strip())
    return {
        "final_response_text": final_response_text,
        "response_status": status,
        "includes_followups": bool(followups),
        "includes_warnings": bool(warnings),
        "followup_count": len(followups),
        "warning_count": len(warnings),
        "channel": comp["channel"],
        "locale": locale,
    }


def build_output_envelope(payload: Dict[str, Any], composed: Dict[str, Any]) -> Dict[str, Any]:
    base = {
        "status_kind": "success",
        "result_type": "composed_response",
        "execution_context_id": payload["execution_context_id"],
        "thread_id": payload["thread_id"],
        "tenant_id": payload["tenant_id"],
        "composed_response": composed,
        "output_gateway_allowed": True,
        "allowed_next_stage": "MESSAGE_OUT",
        "response_generation_allowed": True,
    }
    digest = hashlib.sha256(
        (
            payload["execution_context_id"]
            + "|"
            + payload["thread_id"]
            + "|"
            + payload["tenant_id"]
            + "|"
            + composed["response_status"]
            + "|"
            + composed["final_response_text"]
        ).encode("utf-8")
    ).hexdigest()[:16]
    base["idempotency_key"] = f"compose:{payload['execution_context_id']}:{digest}"
    return base


def run_rc(payload: Dict[str, Any], execution_context_row: Optional[Dict[str, Any]] = None, thread_row: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    step1 = validate_state_update_input(payload)
    if step1.get("status_kind") == "error":
        return step1
    step2 = verify_lineage(step1, execution_context_row=execution_context_row, thread_row=thread_row)
    if step2.get("status_kind") == "error":
        return step2
    comp = build_composition_input(step2)
    composed = compose_response(comp)
    return build_output_envelope(step1, composed)
