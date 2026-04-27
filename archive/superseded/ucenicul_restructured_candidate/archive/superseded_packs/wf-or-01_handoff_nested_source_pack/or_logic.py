from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import json

REQUIRED_TOP_LEVEL = ["status_kind", "result_type", "payload"]
REQUIRED_PAYLOAD_FIELDS = [
    "tenant_id",
    "thread_id",
    "execution_id",
    "trigger_message_id",
    "idempotency_key",
    "status",
    "ttl_seconds",
]


@dataclass
class ValidationResult:
    valid: bool
    code: Optional[str]
    message: str
    missing_fields: List[str]
    normalized: Optional[Dict[str, Any]] = None


def _to_obj(raw: Any) -> Any:
    if isinstance(raw, dict):
        if "chatInput" in raw and isinstance(raw.get("chatInput"), str) and "payload" not in raw:
            try:
                return json.loads(raw["chatInput"])
            except Exception:
                return raw
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return raw
    return raw


def validate_ec_result(raw: Any) -> ValidationResult:
    candidate = _to_obj(raw)
    if not isinstance(candidate, dict):
        return ValidationResult(False, "INVALID_HANDOFF_INPUT", "Input is not a JSON object.", ["root"])

    missing = [field for field in REQUIRED_TOP_LEVEL if field not in candidate]
    payload = candidate.get("payload")
    if not isinstance(payload, dict):
        if "payload" not in missing:
            missing.append("payload")
        payload = {}

    missing.extend([f"payload.{field}" for field in REQUIRED_PAYLOAD_FIELDS if field not in payload])

    if missing:
        return ValidationResult(False, "INVALID_HANDOFF_INPUT", "Required handoff fields are missing.", sorted(set(missing)))

    if candidate["status_kind"] != "success":
        return ValidationResult(False, "INVALID_HANDOFF_INPUT", "status_kind must be success.", ["status_kind"])
    if candidate["result_type"] != "state":
        return ValidationResult(False, "INVALID_HANDOFF_INPUT", "result_type must be state.", ["result_type"])
    if payload["status"] != "initialized":
        return ValidationResult(False, "NOT_READY_FOR_PLANNING", "Execution context is not initialized.", ["payload.status"])

    try:
        ttl = int(payload["ttl_seconds"])
    except Exception:
        return ValidationResult(False, "INVALID_HANDOFF_INPUT", "ttl_seconds must be an integer.", ["payload.ttl_seconds"])
    if ttl <= 0:
        return ValidationResult(False, "NOT_READY_FOR_PLANNING", "ttl_seconds must be positive.", ["payload.ttl_seconds"])

    normalized = {
        "status_kind": "success",
        "result_type": "state",
        "module_name": candidate.get("module_name", "execution_context_init"),
        "warnings": candidate.get("warnings", []),
        "payload": {
            "tenant_id": str(payload["tenant_id"]),
            "thread_id": str(payload["thread_id"]),
            "execution_id": str(payload["execution_id"]),
            "trigger_message_id": str(payload["trigger_message_id"]),
            "idempotency_key": str(payload["idempotency_key"]),
            "status": str(payload["status"]),
            "ttl_seconds": ttl,
        },
    }
    return ValidationResult(True, None, "Handoff input is valid.", [], normalized)


def extract_handoff_input(validated: Dict[str, Any]) -> Dict[str, Any]:
    payload = validated["payload"]
    return {
        "tenant_id": str(payload["tenant_id"]),
        "thread_id": str(payload["thread_id"]),
        "execution_id": str(payload["execution_id"]),
        "trigger_message_id": str(payload["trigger_message_id"]),
        "idempotency_key": str(payload["idempotency_key"]),
        "expected_status": str(payload["status"]),
        "ttl_seconds": int(payload["ttl_seconds"]),
        "source_module": validated.get("module_name", "execution_context_init"),
    }


def verify_context_match(handoff_input: Dict[str, Any], db_row: Optional[Dict[str, Any]], strict_db_check: bool = True) -> Dict[str, Any]:
    if not db_row:
        if strict_db_check:
            return {"ok": False, "code": "CONTEXT_MISMATCH", "message": "Execution context row was not found.", "warnings": []}
        return {"ok": True, "code": None, "message": "DB verification skipped.", "warnings": ["DB verification skipped."]}

    execution_id = str(db_row.get("execution_id") or db_row.get("id") or "")
    tenant_id = str(db_row.get("tenant_id") or "")
    thread_id = str(db_row.get("thread_id") or "")
    trigger_message_id = str(db_row.get("trigger_message_id") or "")
    status = str(db_row.get("status") or "")

    mismatches = []
    if execution_id and execution_id != handoff_input["execution_id"]:
        mismatches.append("execution_id")
    if tenant_id and tenant_id != handoff_input["tenant_id"]:
        mismatches.append("tenant_id")
    if thread_id and thread_id != handoff_input["thread_id"]:
        mismatches.append("thread_id")
    if trigger_message_id and trigger_message_id != handoff_input["trigger_message_id"]:
        mismatches.append("trigger_message_id")
    if status and status != handoff_input["expected_status"]:
        mismatches.append("status")

    if mismatches:
        return {
            "ok": False,
            "code": "CONTEXT_MISMATCH",
            "message": f"Execution context mismatch detected: {', '.join(mismatches)}.",
            "warnings": [],
        }

    warnings = []
    ttl = db_row.get("ttl_seconds")
    if ttl is not None:
        try:
            if int(ttl) != int(handoff_input["ttl_seconds"]):
                warnings.append("ttl_seconds differs from upstream payload")
        except Exception:
            warnings.append("ttl_seconds could not be compared")

    return {"ok": True, "code": None, "message": "Execution context matches handoff input.", "warnings": warnings}


def build_handoff_payload(handoff_input: Dict[str, Any], verification: Dict[str, Any]) -> Dict[str, Any]:
    warnings = list(dict.fromkeys(verification.get("warnings", [])))
    return {
        "status_kind": "success",
        "result_type": "handoff",
        "module_name": "orchestrator_input_handoff",
        "payload": {
            "tenant_id": handoff_input["tenant_id"],
            "thread_id": handoff_input["thread_id"],
            "execution_id": handoff_input["execution_id"],
            "trigger_message_id": handoff_input["trigger_message_id"],
            "idempotency_key": handoff_input["idempotency_key"],
            "execution_status": handoff_input["expected_status"],
            "planning_allowed": True,
            "allowed_next_stage": "WF-PL-01",
            "orchestrator_input": {
                "planning_mode": "plan_only",
                "module_execution_allowed": False,
                "response_generation_allowed": False,
                "domain_writes_allowed": False,
            },
            "warnings": warnings,
        },
    }


def build_error_payload(code: str, message: str, missing_fields: Optional[List[str]] = None) -> Dict[str, Any]:
    return {
        "status_kind": "failed",
        "result_type": "error",
        "module_name": "orchestrator_input_handoff",
        "error": {
            "code": code,
            "message": message,
            "missing_fields": missing_fields or [],
        },
    }
