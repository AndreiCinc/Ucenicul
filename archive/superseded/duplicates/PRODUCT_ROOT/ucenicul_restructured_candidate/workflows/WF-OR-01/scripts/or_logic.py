"""WF-OR-01 orchestrator-input-handoff logic (Python port).

This module implements the stage-bounded WF-OR-01 EC -> OR adapter in pure
Python so it can be exercised deterministically off-node. The live n8n workflow
under `workflows/WF-OR-01_Orchestrator_Input_Handoff.json` mirrors the same
contract in JavaScript.

Stage scope (see `docs/ucenicul_claude_handoff_hardened/06_STAGE_WF-OR-01.md`):
- accept a canonical WF-EC-01 success result (either payload-wrapped OR the
  FLAT shape emitted by the live `EC_Return_Result`);
- validate and normalize the execution-context handoff payload;
- optionally verify it against a live DB row via `verify_context_match`;
- produce a normalized planner-input envelope or a canonical error envelope.

Forbidden behaviors (enforced by tests):
- no plan generation
- no module dispatch
- no final user-facing response text
- no domain-table writes
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import json
import re

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

REQUIRED_TOP_LEVEL_WRAPPED = ["status_kind", "result_type", "payload"]
REQUIRED_PAYLOAD_FIELDS = [
    "tenant_id",
    "thread_id",
    "execution_id",
    "trigger_message_id",
    "idempotency_key",
    "status",
    "ttl_seconds",
]
REQUIRED_FLAT_FIELDS = [
    "status_kind",
    "result_type",
    "id",
    "tenant_id",
    "thread_id",
    "trigger_message_id",
    "status",
]

CANONICAL_NEXT_STAGE = "WF-PL-01"

FORBIDDEN_PAYLOAD_KEYS = (
    "plan",
    "plan_steps",
    "module_results",
    "response_text",
    "user_response",
    "llm_output",
)


@dataclass
class ValidationResult:
    """Outcome of EC result validation.

    `normalized` contains the internal payload-wrapped shape that the rest of
    the stage works with. When `valid` is False, `code`/`message`/`missing_fields`
    explain the failure in the canonical error-envelope vocabulary.
    """

    valid: bool
    code: Optional[str]
    message: str
    missing_fields: List[str]
    normalized: Optional[Dict[str, Any]] = None
    source_shape: Optional[str] = None  # "wrapped" | "flat" | "chat_input"
    warnings: List[str] = field(default_factory=list)


def _coerce_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _is_uuid_like(value: Any) -> bool:
    return isinstance(value, str) and bool(UUID_RE.match(value))


def _to_obj(raw: Any) -> Any:
    """Unwrap chat-trigger payloads and top-level JSON strings if present."""

    if isinstance(raw, dict):
        if (
            "chatInput" in raw
            and isinstance(raw.get("chatInput"), str)
            and "payload" not in raw
            and "id" not in raw
        ):
            try:
                parsed = json.loads(raw["chatInput"])
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                return raw
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return raw
    return raw


def _detect_shape(candidate: Dict[str, Any]) -> str:
    """Return "wrapped", "flat" or "unknown" for a dict candidate."""

    if isinstance(candidate.get("payload"), dict):
        return "wrapped"
    # The live WF-EC-01 `EC_Return_Result` emits a flat object.
    if "id" in candidate and "status" in candidate and "status_kind" in candidate:
        return "flat"
    return "unknown"


def _normalized_from_wrapped(candidate: Dict[str, Any]) -> Dict[str, Any]:
    payload = candidate["payload"]
    return {
        "status_kind": candidate["status_kind"],
        "result_type": candidate["result_type"],
        "module_name": candidate.get("module_name", "execution_context_init"),
        "warnings": list(candidate.get("warnings") or []),
        "payload": {
            "tenant_id": _coerce_str(payload["tenant_id"]),
            "thread_id": _coerce_str(payload["thread_id"]),
            "execution_id": _coerce_str(payload["execution_id"]),
            "trigger_message_id": _coerce_str(payload["trigger_message_id"]),
            "idempotency_key": _coerce_str(payload["idempotency_key"]),
            "status": _coerce_str(payload["status"]),
            "ttl_seconds": int(payload["ttl_seconds"]),
        },
    }


def _normalized_from_flat(candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Lift the flat EC_Return_Result shape into the stage-internal wrapped form.

    The flat form does not include `idempotency_key` or `ttl_seconds` — the OR
    stage derives a synthetic idempotency key and a neutral TTL so downstream
    handoff logic is uniform. Live DB verification re-hydrates the real values
    via `verify_context_match`.
    """

    synthetic_key = (
        _coerce_str(candidate["tenant_id"])
        + ":"
        + _coerce_str(candidate["trigger_message_id"])
        + ":exec_ctx:v1"
    )
    try:
        ttl = int(candidate.get("ttl_seconds") or 900)
    except Exception:
        ttl = 900
    return {
        "status_kind": candidate["status_kind"],
        "result_type": candidate["result_type"],
        "module_name": candidate.get("module_name", "execution_context_init"),
        "warnings": list(candidate.get("warnings") or []),
        "payload": {
            "tenant_id": _coerce_str(candidate["tenant_id"]),
            "thread_id": _coerce_str(candidate["thread_id"]),
            "execution_id": _coerce_str(candidate["id"]),
            "trigger_message_id": _coerce_str(candidate["trigger_message_id"]),
            "idempotency_key": _coerce_str(
                candidate.get("idempotency_key") or synthetic_key
            ),
            "status": _coerce_str(candidate["status"]),
            "ttl_seconds": ttl,
        },
    }


def validate_ec_result(raw: Any) -> ValidationResult:
    """Accept either the payload-wrapped handoff envelope or the FLAT shape
    emitted by the live WF-EC-01 `EC_Return_Result` node.
    """

    candidate = _to_obj(raw)
    if not isinstance(candidate, dict):
        return ValidationResult(
            False,
            "INVALID_HANDOFF_INPUT",
            "Input is not a JSON object.",
            ["root"],
        )

    shape = _detect_shape(candidate)

    if shape == "wrapped":
        missing = [k for k in REQUIRED_TOP_LEVEL_WRAPPED if k not in candidate]
        payload = candidate.get("payload")
        if not isinstance(payload, dict):
            if "payload" not in missing:
                missing.append("payload")
            payload = {}
        missing.extend(
            f"payload.{k}" for k in REQUIRED_PAYLOAD_FIELDS if k not in payload
        )
        if missing:
            return ValidationResult(
                False,
                "INVALID_HANDOFF_INPUT",
                "Required handoff fields are missing.",
                sorted(set(missing)),
                source_shape="wrapped",
            )
        if candidate["status_kind"] != "success":
            return ValidationResult(
                False,
                "INVALID_HANDOFF_INPUT",
                "status_kind must be success.",
                ["status_kind"],
                source_shape="wrapped",
            )
        if candidate["result_type"] != "state":
            return ValidationResult(
                False,
                "INVALID_HANDOFF_INPUT",
                "result_type must be state.",
                ["result_type"],
                source_shape="wrapped",
            )
        if _coerce_str(payload["status"]) != "initialized":
            return ValidationResult(
                False,
                "NOT_READY_FOR_PLANNING",
                "Execution context is not initialized.",
                ["payload.status"],
                source_shape="wrapped",
            )
        try:
            ttl = int(payload["ttl_seconds"])
        except Exception:
            return ValidationResult(
                False,
                "INVALID_HANDOFF_INPUT",
                "ttl_seconds must be an integer.",
                ["payload.ttl_seconds"],
                source_shape="wrapped",
            )
        if ttl <= 0:
            return ValidationResult(
                False,
                "NOT_READY_FOR_PLANNING",
                "ttl_seconds must be positive.",
                ["payload.ttl_seconds"],
                source_shape="wrapped",
            )
        for key in FORBIDDEN_PAYLOAD_KEYS:
            if key in payload:
                return ValidationResult(
                    False,
                    "INVALID_HANDOFF_INPUT",
                    f"payload contains forbidden key {key!r}.",
                    [f"payload.{key}"],
                    source_shape="wrapped",
                )
        normalized = _normalized_from_wrapped(candidate)
        return ValidationResult(
            True,
            None,
            "Handoff input is valid (wrapped shape).",
            [],
            normalized=normalized,
            source_shape="wrapped",
        )

    if shape == "flat":
        missing = [k for k in REQUIRED_FLAT_FIELDS if k not in candidate]
        if missing:
            return ValidationResult(
                False,
                "INVALID_HANDOFF_INPUT",
                "Required flat EC fields are missing.",
                sorted(set(missing)),
                source_shape="flat",
            )
        if candidate["status_kind"] != "success":
            return ValidationResult(
                False,
                "INVALID_HANDOFF_INPUT",
                "status_kind must be success.",
                ["status_kind"],
                source_shape="flat",
            )
        if candidate["result_type"] != "state":
            return ValidationResult(
                False,
                "INVALID_HANDOFF_INPUT",
                "result_type must be state.",
                ["result_type"],
                source_shape="flat",
            )
        if _coerce_str(candidate["status"]) != "initialized":
            return ValidationResult(
                False,
                "NOT_READY_FOR_PLANNING",
                "Execution context is not initialized.",
                ["status"],
                source_shape="flat",
            )
        err_val = candidate.get("error")
        if err_val not in (None, {}, ""):
            return ValidationResult(
                False,
                "INVALID_HANDOFF_INPUT",
                "Upstream carries a non-null error; cannot hand off.",
                ["error"],
                source_shape="flat",
            )
        normalized = _normalized_from_flat(candidate)
        warnings: List[str] = []
        if "idempotency_key" not in candidate:
            warnings.append("idempotency_key synthesized from flat EC shape")
        if "ttl_seconds" not in candidate:
            warnings.append("ttl_seconds defaulted to 900 from flat EC shape")
        normalized["warnings"] = list(
            dict.fromkeys(list(normalized.get("warnings") or []) + warnings)
        )
        return ValidationResult(
            True,
            None,
            "Handoff input is valid (flat shape adapted).",
            [],
            normalized=normalized,
            source_shape="flat",
            warnings=warnings,
        )

    # Unknown shape — try to tell the caller which fields looked off.
    missing = [k for k in REQUIRED_TOP_LEVEL_WRAPPED if k not in candidate]
    if not missing:
        missing = ["payload or flat-identifier fields"]
    return ValidationResult(
        False,
        "INVALID_HANDOFF_INPUT",
        "Input shape does not match either the payload-wrapped or flat EC result contract.",
        sorted(set(missing)),
        source_shape="unknown",
    )


def extract_handoff_input(validated: Dict[str, Any]) -> Dict[str, Any]:
    payload = validated["payload"]
    return {
        "tenant_id": _coerce_str(payload["tenant_id"]),
        "thread_id": _coerce_str(payload["thread_id"]),
        "execution_id": _coerce_str(payload["execution_id"]),
        "trigger_message_id": _coerce_str(payload["trigger_message_id"]),
        "idempotency_key": _coerce_str(payload["idempotency_key"]),
        "expected_status": _coerce_str(payload["status"]),
        "ttl_seconds": int(payload["ttl_seconds"]),
        "source_module": validated.get("module_name", "execution_context_init"),
        "warnings": list(validated.get("warnings") or []),
    }


def verify_context_match(
    handoff_input: Dict[str, Any],
    db_row: Optional[Dict[str, Any]],
    strict_db_check: bool = True,
) -> Dict[str, Any]:
    """Compare a live DB row against the handoff input. Rejects cross-tenant
    mismatches cleanly; allows non-strict mode for pre-DB test paths.
    """

    base_warnings = list(handoff_input.get("warnings") or [])

    if not db_row:
        if strict_db_check:
            return {
                "ok": False,
                "code": "CONTEXT_MISMATCH",
                "message": "Execution context row was not found.",
                "warnings": base_warnings,
                "mismatched_fields": ["execution_context"],
            }
        return {
            "ok": True,
            "code": None,
            "message": "DB verification skipped.",
            "warnings": base_warnings + ["DB verification skipped."],
            "mismatched_fields": [],
        }

    execution_id = _coerce_str(
        db_row.get("execution_id") or db_row.get("id") or ""
    )
    tenant_id = _coerce_str(db_row.get("tenant_id") or "")
    thread_id = _coerce_str(db_row.get("thread_id") or "")
    trigger_message_id = _coerce_str(db_row.get("trigger_message_id") or "")
    status = _coerce_str(db_row.get("status") or "")
    idempotency_key = _coerce_str(db_row.get("idempotency_key") or "")

    mismatches: List[str] = []
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
            "warnings": base_warnings,
            "mismatched_fields": mismatches,
        }

    warnings = list(base_warnings)
    ttl = db_row.get("ttl_seconds")
    if ttl is not None:
        try:
            if int(ttl) != int(handoff_input["ttl_seconds"]):
                warnings.append("ttl_seconds differs from upstream payload")
        except Exception:
            warnings.append("ttl_seconds could not be compared")

    if (
        idempotency_key
        and idempotency_key != handoff_input["idempotency_key"]
    ):
        warnings.append("idempotency_key reconciled against DB row")

    return {
        "ok": True,
        "code": None,
        "message": "Execution context matches handoff input.",
        "warnings": list(dict.fromkeys(warnings)),
        "mismatched_fields": [],
        "reconciled_idempotency_key": idempotency_key or None,
        "reconciled_ttl_seconds": (int(ttl) if ttl is not None else None),
    }


def build_handoff_payload(
    handoff_input: Dict[str, Any],
    verification: Dict[str, Any],
) -> Dict[str, Any]:
    """Produce the canonical OR stage success envelope."""

    warnings = list(dict.fromkeys(verification.get("warnings", []) or []))
    idempotency_key = (
        verification.get("reconciled_idempotency_key")
        or handoff_input["idempotency_key"]
    )
    ttl = (
        verification.get("reconciled_ttl_seconds")
        if verification.get("reconciled_ttl_seconds") is not None
        else handoff_input["ttl_seconds"]
    )
    envelope = {
        "status_kind": "success",
        "result_type": "handoff",
        "module_name": "orchestrator_input_handoff",
        "payload": {
            "tenant_id": handoff_input["tenant_id"],
            "thread_id": handoff_input["thread_id"],
            "execution_id": handoff_input["execution_id"],
            "trigger_message_id": handoff_input["trigger_message_id"],
            "idempotency_key": idempotency_key,
            "execution_status": handoff_input["expected_status"],
            "ttl_seconds": int(ttl),
            "planning_allowed": True,
            "allowed_next_stage": CANONICAL_NEXT_STAGE,
            "orchestrator_input": {
                "planning_mode": "plan_only",
                "module_execution_allowed": False,
                "response_generation_allowed": False,
                "domain_writes_allowed": False,
            },
            "warnings": warnings,
        },
    }
    return envelope


def build_error_payload(
    code: str,
    message: str,
    missing_fields: Optional[List[str]] = None,
) -> Dict[str, Any]:
    return {
        "status_kind": "failed",
        "result_type": "error",
        "module_name": "orchestrator_input_handoff",
        "error": {
            "code": code,
            "message": message,
            "missing_fields": list(missing_fields or []),
        },
    }


def run_full_pipeline(
    raw_upstream: Any,
    db_row: Optional[Dict[str, Any]] = None,
    strict_db_check: bool = True,
) -> Dict[str, Any]:
    """End-to-end helper used by the `ec_to_or_handoff` test family.

    Returns either the success handoff envelope or the canonical error envelope.
    """

    result = validate_ec_result(raw_upstream)
    if not result.valid:
        return build_error_payload(
            result.code or "INVALID_HANDOFF_INPUT",
            result.message,
            list(result.missing_fields or []),
        )
    handoff_input = extract_handoff_input(result.normalized)
    verification = verify_context_match(
        handoff_input, db_row, strict_db_check=strict_db_check
    )
    if not verification.get("ok"):
        return build_error_payload(
            verification.get("code") or "CONTEXT_MISMATCH",
            verification.get("message") or "Execution context mismatch.",
            list(verification.get("mismatched_fields") or []),
        )
    return build_handoff_payload(handoff_input, verification)
