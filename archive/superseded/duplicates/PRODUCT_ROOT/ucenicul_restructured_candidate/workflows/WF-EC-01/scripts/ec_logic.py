"""
ec_logic.py — Pure-Python extraction of WF-EC-01 node logic.

This module exposes the three deterministic transformation nodes of WF-EC-01
so they can be tested without n8n:

    - ec_validate_input(raw)          → EC_Validate_Input
    - ec_build_init_payload(valid)    → EC_Build_Init_Payload
    - ec_shape_return_result(row)     → EC_Return_Result
    - ec_shape_return_error(invalid)  → EC_Return_Error

Parity rule:
    Logic here must mirror `workflows/WF-EC-01_blueprint.json` exactly. Any
    divergence is a stage-level failure and must be logged in FIX_LOG.md.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

REQUIRED_FIELDS: Tuple[str, ...] = ("tenant_id", "thread_id", "trigger_message_id")


def _invalid(code: str, missing: Optional[List[str]], req: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "_valid": "false",
        "_error": code,
        "_missing_fields": missing or [],
        "_request": req,
    }


def ec_validate_input(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Mirror of EC_Validate_Input jsCode."""
    raw = raw or {}

    if isinstance(raw.get("request"), dict):
        r = raw["request"]
        req = {
            "tenant_id": r.get("tenant_id"),
            "thread_id": r.get("thread_id"),
            "trigger_message_id": r.get("trigger_message_id"),
            "resolution_method": r.get("resolution_method"),
            "resolved_at": r.get("resolved_at"),
            "idempotency_key": r.get("idempotency_key") or raw.get("idempotency_key"),
        }
    else:
        req = {
            "tenant_id": raw.get("tenant_id"),
            "thread_id": raw.get("thread_id"),
            "trigger_message_id": raw.get("trigger_message_id"),
            "resolution_method": raw.get("resolution_method"),
            "resolved_at": raw.get("resolved_at"),
            "idempotency_key": raw.get("idempotency_key"),
        }

    missing = [f for f in REQUIRED_FIELDS if req.get(f) in (None, "")]
    if missing:
        return _invalid("INVALID_INPUT", missing, req)

    for f in REQUIRED_FIELDS:
        v = req.get(f)
        if not isinstance(v, str) or not UUID_RE.match(v):
            return _invalid("INVALID_UUID", [f], req)

    if req["resolved_at"]:
        try:
            # Accept ISO-8601 with or without trailing Z
            _ = datetime.fromisoformat(req["resolved_at"].replace("Z", "+00:00"))
        except Exception:
            return _invalid("INVALID_RESOLVED_AT", ["resolved_at"], req)

    idemp = req["idempotency_key"]
    if not isinstance(idemp, str) or not idemp.strip():
        idemp = f"{req['tenant_id']}:{req['trigger_message_id']}:exec_ctx:v1"

    if len(idemp) > 300:
        return _invalid("IDEMPOTENCY_KEY_TOO_LONG", ["idempotency_key"], req)

    return {
        "_valid": "true",
        "tenant_id": req["tenant_id"],
        "thread_id": req["thread_id"],
        "trigger_message_id": req["trigger_message_id"],
        "resolution_method": req["resolution_method"],
        "resolved_at": req["resolved_at"],
        "_idempotency_key": idemp,
    }


def ec_build_init_payload(valid: Dict[str, Any], now: Optional[datetime] = None, ttl_minutes: int = 15) -> Dict[str, Any]:
    """Mirror of EC_Build_Init_Payload jsCode."""
    n = now or datetime.now(timezone.utc)
    expires = n + timedelta(minutes=ttl_minutes)

    return {
        "tenant_id": valid["tenant_id"],
        "thread_id": valid["thread_id"],
        "trigger_message_id": valid["trigger_message_id"],
        "status": "initialized",
        "pending_steps": [],
        "completed_steps": [],
        "idempotency_key": valid["_idempotency_key"],
        "expires_at": expires.isoformat().replace("+00:00", "Z"),
        "resolution_method": valid.get("resolution_method"),
        "resolved_at": valid.get("resolved_at"),
        "_now": n.isoformat().replace("+00:00", "Z"),
    }


def ec_shape_return_result(row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Mirror of EC_Return_Result jsCode."""
    if not row or not row.get("id"):
        return {
            "id": None,
            "tenant_id": None,
            "thread_id": None,
            "trigger_message_id": None,
            "status": "failed",
            "current_goal": None,
            "current_plan_ref": None,
            "pending_steps": [],
            "completed_steps": [],
            "created_at": None,
            "updated_at": None,
            "error": {
                "code": "INTERNAL_LOAD_FAILED",
                "message": "Execution context could not be loaded after upsert",
            },
            "module_name": "execution_context_init",
            "result_type": "error",
            "status_kind": "failed",
        }

    return {
        "id": row["id"],
        "tenant_id": row["tenant_id"],
        "thread_id": row["thread_id"],
        "trigger_message_id": row["trigger_message_id"],
        "status": row["status"],
        "current_goal": row.get("current_goal"),
        "current_plan_ref": row.get("current_plan_ref"),
        "pending_steps": row.get("pending_steps") or [],
        "completed_steps": row.get("completed_steps") or [],
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "error": None,
        "module_name": "execution_context_init",
        "result_type": "state",
        "status_kind": "success",
    }


def ec_shape_return_error(invalid: Dict[str, Any]) -> Dict[str, Any]:
    """Mirror of EC_Return_Error jsCode."""
    req = invalid.get("_request") or {}
    return {
        "id": None,
        "tenant_id": req.get("tenant_id"),
        "thread_id": req.get("thread_id"),
        "trigger_message_id": req.get("trigger_message_id"),
        "status": "failed",
        "current_goal": None,
        "current_plan_ref": None,
        "pending_steps": [],
        "completed_steps": [],
        "created_at": None,
        "updated_at": None,
        "error": {
            "code": invalid.get("_error") or "INVALID_INPUT",
            "missing_fields": invalid.get("_missing_fields") or [],
        },
        "module_name": "execution_context_init",
        "result_type": "error",
        "status_kind": "failed",
    }
