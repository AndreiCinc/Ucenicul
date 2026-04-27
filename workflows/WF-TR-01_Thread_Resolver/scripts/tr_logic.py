"""
tr_logic.py — Python mirror of the WF-TR-01 Thread Resolver node logic.

Authored 2026-04-19 as part of Phase 3 repair (R9 in PHASE_3_REPAIR_BACKLOG.md).

WF-TR-01 is the pipeline entry stage. Its responsibilities:
  1. Accept an inbound message event from an ingress channel (WhatsApp / Telegram
     / webhook / n8n test harness).
  2. Validate shape and required fields.
  3. Resolve (or create) a thread for (tenant_id, channel, external_user_id).
  4. Register the trigger message and return a WF-EC-01 handoff envelope.

The live runtime is expressed as n8n jsCode + Postgres nodes. This module
mirrors the contract expressed by those nodes so the script-level harness
(tests/test_families.py) can exercise deterministic behaviour.

The module is intentionally conservative:
  * It does NOT mutate any argument in place.
  * It never touches a database — callers supply a thread registry dict.
  * It follows the canonical envelope contract documented in
    docs/architecture/Architecture_Spec_v3_Ucenicul.md.
"""

from __future__ import annotations

import hashlib
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Contract constants
# ---------------------------------------------------------------------------

CANONICAL_NEXT_STAGE = "WF-EC-01"
MY_STAGE = "WF-TR-01"

VALID_CHANNELS = {"whatsapp", "telegram", "webhook", "harness"}

REQUIRED_EVENT_FIELDS: Tuple[str, ...] = (
    "tenant_id",
    "channel",
    "external_user_id",
    "message_text",
    "received_at",
    "external_message_id",
)


# ---------------------------------------------------------------------------
# Result wrapper
# ---------------------------------------------------------------------------

@dataclass
class Result:
    ok: bool
    payload: Dict[str, Any] = field(default_factory=dict)


def _err(code: str, message: str, **extra: Any) -> Result:
    return Result(ok=False, payload={
        "error": {"code": code, "message": message, **extra},
        "status_kind": "error",
        "result_type": "error",
    })


def _ok(**payload: Any) -> Result:
    return Result(ok=True, payload=dict(payload))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _deterministic_uuid(*parts: str) -> str:
    """Generate a deterministic UUIDv5 for the given components."""
    name = ":".join(str(p) for p in parts)
    return str(uuid.uuid5(uuid.NAMESPACE_URL, name))


def _thread_key(tenant_id: str, channel: str, external_user_id: str) -> str:
    return f"{tenant_id}::{channel}::{external_user_id}"


def _idempotency_key(tenant_id: str, external_message_id: str) -> str:
    return f"tr:{tenant_id}:{external_message_id}:v1"


# ---------------------------------------------------------------------------
# Fixture builders (used by the harness)
# ---------------------------------------------------------------------------

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"


def sample_event(
    channel: str = "whatsapp",
    tenant_id: str = _DEFAULT_TENANT,
    external_user_id: str = "user-100",
    message_text: str = "Salut, trebuie sa il sun pe Ion",
    external_message_id: Optional[str] = None,
    received_at: str = "2026-04-19T10:00:00Z",
    **overrides: Any,
) -> Dict[str, Any]:
    if external_message_id is None:
        external_message_id = f"ext-{hashlib.sha1(message_text.encode()).hexdigest()[:10]}"
    event = {
        "tenant_id": tenant_id,
        "channel": channel,
        "external_user_id": external_user_id,
        "message_text": message_text,
        "received_at": received_at,
        "external_message_id": external_message_id,
    }
    event.update(overrides)
    return event


def sample_thread_registry(prepopulate: bool = False, event: Optional[Dict[str, Any]] = None) -> Dict[str, Dict[str, Any]]:
    registry: Dict[str, Dict[str, Any]] = {}
    if prepopulate and event is not None:
        key = _thread_key(event["tenant_id"], event["channel"], event["external_user_id"])
        registry[key] = {
            "thread_id": _deterministic_uuid("thread", key),
            "tenant_id": event["tenant_id"],
            "channel": event["channel"],
            "external_user_id": event["external_user_id"],
            "state": "active",
            "last_message_at": event["received_at"],
        }
    return registry


# ---------------------------------------------------------------------------
# validate_event
# ---------------------------------------------------------------------------

def validate_event(event: Any) -> Result:
    if not isinstance(event, dict):
        return _err("INVALID_EVENT", "event must be a dict")
    for fld in REQUIRED_EVENT_FIELDS:
        if fld not in event or event.get(fld) in (None, ""):
            return _err(
                "INVALID_EVENT",
                f"missing required field: {fld}",
                missing_fields=[fld],
            )
    if event["channel"] not in VALID_CHANNELS:
        return _err(
            "INVALID_EVENT",
            f"unsupported channel: {event['channel']!r}",
            supported=sorted(VALID_CHANNELS),
        )
    # Very loose tenant_id shape check (uuid-like).
    tid = event["tenant_id"]
    if not isinstance(tid, str) or len(tid) < 8:
        return _err("INVALID_EVENT", "tenant_id must be a non-empty string")
    return _ok(event=event)


# ---------------------------------------------------------------------------
# resolve_thread
# ---------------------------------------------------------------------------

def resolve_thread(
    event: Dict[str, Any],
    thread_registry: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    key = _thread_key(event["tenant_id"], event["channel"], event["external_user_id"])
    existing = thread_registry.get(key)
    if existing is not None:
        row = deepcopy(existing)
        row["last_message_at"] = event["received_at"]
        row["_resolution"] = "reused"
        return row
    row = {
        "thread_id": _deterministic_uuid("thread", key),
        "tenant_id": event["tenant_id"],
        "channel": event["channel"],
        "external_user_id": event["external_user_id"],
        "state": "active",
        "last_message_at": event["received_at"],
        "_resolution": "created",
    }
    return row


# ---------------------------------------------------------------------------
# register_trigger_message
# ---------------------------------------------------------------------------

def register_trigger_message(event: Dict[str, Any], thread_row: Dict[str, Any]) -> Dict[str, Any]:
    trigger_message_id = _deterministic_uuid(
        "message",
        event["tenant_id"],
        thread_row["thread_id"],
        event["external_message_id"],
    )
    return {
        "trigger_message_id": trigger_message_id,
        "thread_id": thread_row["thread_id"],
        "tenant_id": event["tenant_id"],
        "channel": event["channel"],
        "external_message_id": event["external_message_id"],
        "message_text": event["message_text"],
        "received_at": event["received_at"],
    }


# ---------------------------------------------------------------------------
# build_handoff_envelope
# ---------------------------------------------------------------------------

def build_handoff_envelope(
    event: Dict[str, Any],
    thread_row: Dict[str, Any],
    message_row: Dict[str, Any],
) -> Dict[str, Any]:
    idempotency_key = _idempotency_key(event["tenant_id"], event["external_message_id"])
    return {
        "status_kind": "success",
        "result_type": "thread_resolution",
        "module_name": "thread_resolver",
        "tenant_id": event["tenant_id"],
        "thread_id": thread_row["thread_id"],
        "trigger_message_id": message_row["trigger_message_id"],
        "allowed_next_stage": CANONICAL_NEXT_STAGE,
        "execution_context_init_allowed": True,
        "response_generation_allowed": False,
        "domain_writes_performed": False,
        "idempotency_key": idempotency_key,
        "payload": {
            "thread_row": thread_row,
            "message_row": message_row,
            "event": {
                "channel": event["channel"],
                "external_user_id": event["external_user_id"],
                "external_message_id": event["external_message_id"],
                "received_at": event["received_at"],
            },
        },
    }


# ---------------------------------------------------------------------------
# build_error_envelope
# ---------------------------------------------------------------------------

def build_error_envelope(error_payload: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "status_kind": "error",
        "result_type": "error",
        "module_name": "thread_resolver",
        "allowed_next_stage": None,
        "execution_context_init_allowed": False,
        "response_generation_allowed": False,
        "tenant_id": event.get("tenant_id") if isinstance(event, dict) else None,
        "thread_id": None,
        "trigger_message_id": None,
        "error": error_payload.get("error", {}),
    }


# ---------------------------------------------------------------------------
# process — end-to-end entrypoint (mirrors the n8n node chain)
# ---------------------------------------------------------------------------

def process(
    event: Any,
    thread_registry: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    registry = thread_registry if thread_registry is not None else {}
    validation = validate_event(event)
    if not validation.ok:
        return build_error_envelope(validation.payload, event if isinstance(event, dict) else {})
    ev = validation.payload["event"]
    thread_row = resolve_thread(ev, registry)
    message_row = register_trigger_message(ev, thread_row)
    return build_handoff_envelope(ev, thread_row, message_row)


__all__ = [
    "CANONICAL_NEXT_STAGE",
    "MY_STAGE",
    "VALID_CHANNELS",
    "REQUIRED_EVENT_FIELDS",
    "Result",
    "sample_event",
    "sample_thread_registry",
    "validate_event",
    "resolve_thread",
    "register_trigger_message",
    "build_handoff_envelope",
    "build_error_envelope",
    "process",
]
