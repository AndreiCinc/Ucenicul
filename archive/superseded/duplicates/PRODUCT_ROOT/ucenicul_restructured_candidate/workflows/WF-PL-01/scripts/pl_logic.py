from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


MODULE_REGISTRY: List[Dict[str, Any]] = [
    {
        "module_name": "task_module",
        "module_type": "executor",
        "capabilities": [
            "create_task",
            "list_tasks",
            "update_task",
            "complete_task",
            "delete_task",
        ],
    },
    {
        "module_name": "reminder_module",
        "module_type": "executor",
        "capabilities": [
            "create_reminder",
            "list_reminders",
            "update_reminder",
            "cancel_reminder",
        ],
    },
    {
        "module_name": "memory_module",
        "module_type": "executor",
        "capabilities": [
            "store_memory",
            "search_memory",
        ],
    },
    {
        "module_name": "improvement_module",
        "module_type": "executor",
        "capabilities": [
            "capture_feedback",
        ],
    },
    {
        "module_name": "watcher_module_basic",
        "module_type": "observer",
        "capabilities": [
            "produce_observation",
        ],
    },
]

ACTION_TO_MODULE = {
    "create_task": "task_module",
    "list_tasks": "task_module",
    "update_task": "task_module",
    "complete_task": "task_module",
    "delete_task": "task_module",
    "create_reminder": "reminder_module",
    "list_reminders": "reminder_module",
    "update_reminder": "reminder_module",
    "cancel_reminder": "reminder_module",
    "store_memory": "memory_module",
    "search_memory": "memory_module",
    "capture_feedback": "improvement_module",
    "observe": "watcher_module_basic",
}

INTENT_TO_ACTION = {
    "create_task": "create_task",
    "list_tasks": "list_tasks",
    "update_task": "update_task",
    "complete_task": "complete_task",
    "delete_task": "delete_task",
    "create_reminder": "create_reminder",
    "list_reminders": "list_reminders",
    "update_reminder": "update_reminder",
    "cancel_reminder": "cancel_reminder",
    "search_memory": "search_memory",
    "save_suggestion": "capture_feedback",
}


@dataclass
class ValidationResult:
    valid: bool
    code: Optional[str]
    message: Optional[str]
    missing_fields: List[str]
    normalized: Optional[Dict[str, Any]] = None


def _fail(code: str, message: str, missing_fields: Optional[List[str]] = None) -> ValidationResult:
    return ValidationResult(
        valid=False,
        code=code,
        message=message,
        missing_fields=missing_fields or [],
        normalized=None,
    )


def validate_or_handoff(candidate: Any) -> ValidationResult:
    if not isinstance(candidate, dict):
        return _fail("INVALID_HANDOFF_INPUT", "Input is not a JSON object.", ["root"])

    required_top = ["status_kind", "result_type", "payload"]
    missing = [k for k in required_top if k not in candidate]
    if missing:
        return _fail("INVALID_HANDOFF_INPUT", "Required handoff fields are missing.", missing)

    payload = candidate.get("payload")
    if not isinstance(payload, dict):
        return _fail("INVALID_HANDOFF_INPUT", "payload must be an object.", ["payload"])

    required_payload = [
        "tenant_id",
        "thread_id",
        "execution_id",
        "trigger_message_id",
        "idempotency_key",
        "execution_status",
        "planning_allowed",
        "allowed_next_stage",
        "orchestrator_input",
    ]
    missing += [f"payload.{k}" for k in required_payload if k not in payload]
    if missing:
        return _fail("INVALID_HANDOFF_INPUT", "Required handoff payload fields are missing.", sorted(set(missing)))

    if candidate["status_kind"] != "success":
        return _fail("INVALID_HANDOFF_INPUT", "status_kind must be success.", ["status_kind"])
    if candidate["result_type"] != "handoff":
        return _fail("INVALID_HANDOFF_INPUT", "result_type must be handoff.", ["result_type"])
    if not payload["planning_allowed"]:
        return _fail("INVALID_HANDOFF_INPUT", "planning_allowed must be true.", ["payload.planning_allowed"])
    if str(payload["allowed_next_stage"]) != "WF-PL-01":
        return _fail("INVALID_HANDOFF_INPUT", "allowed_next_stage must be WF-PL-01.", ["payload.allowed_next_stage"])
    if str(payload["execution_status"]) != "initialized":
        return _fail("CONTEXT_MISMATCH", "Execution context is not initialized.", ["payload.execution_status"])

    normalized = {
        "status_kind": "success",
        "result_type": "handoff",
        "module_name": candidate.get("module_name", "orchestrator_input_handoff"),
        "payload": {
            "tenant_id": str(payload["tenant_id"]),
            "thread_id": str(payload["thread_id"]),
            "execution_id": str(payload["execution_id"]),
            "trigger_message_id": str(payload["trigger_message_id"]),
            "idempotency_key": str(payload["idempotency_key"]),
            "execution_status": str(payload["execution_status"]),
            "planning_allowed": True,
            "allowed_next_stage": "WF-PL-01",
            "orchestrator_input": copy.deepcopy(payload.get("orchestrator_input", {})),
            "planner_context": copy.deepcopy(payload.get("planner_context") or candidate.get("planner_context") or {}),
            "warnings": list(payload.get("warnings", [])),
        },
    }
    return ValidationResult(True, None, None, [], normalized)


def extract_planning_input(normalized: Dict[str, Any]) -> Dict[str, Any]:
    payload = normalized["payload"]
    return {
        "tenant_id": payload["tenant_id"],
        "thread_id": payload["thread_id"],
        "execution_id": payload["execution_id"],
        "trigger_message_id": payload["trigger_message_id"],
        "idempotency_key": payload["idempotency_key"],
        "execution_status": payload["execution_status"],
        "planner_context": copy.deepcopy(payload.get("planner_context") or {}),
        "warnings": list(payload.get("warnings", [])),
    }


def verify_context_match(handoff: Dict[str, Any], row: Optional[Dict[str, Any]], strict_db_check: bool = True) -> Dict[str, Any]:
    if row is None:
        if strict_db_check:
            return {
                "ok": False,
                "code": "CONTEXT_MISMATCH",
                "message": "Execution context row was not found or is incomplete.",
                "missing_fields": ["execution_context"],
            }
        return {
            "ok": True,
            "warnings": ["Execution context row not re-read; relying on upstream handoff only."],
        }

    for key in ("execution_id", "tenant_id", "thread_id"):
        if str(row.get(key) or "") != str(handoff.get(key) or ""):
            return {
                "ok": False,
                "code": "CONTEXT_MISMATCH",
                "message": f"{key} does not match canonical execution context.",
                "missing_fields": [key],
            }

    if str(row.get("status") or "") != str(handoff.get("execution_status") or ""):
        return {
            "ok": False,
            "code": "CONTEXT_MISMATCH",
            "message": "Execution status does not match canonical execution context.",
            "missing_fields": ["status"],
        }

    return {
        "ok": True,
        "warnings": [],
    }


def load_module_registry() -> List[Dict[str, Any]]:
    return copy.deepcopy(MODULE_REGISTRY)


def build_planner_input(handoff: Dict[str, Any], verified: Dict[str, Any], registry: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not verified.get("ok"):
        return {
            "_context_ready": "false",
            "error_code": verified.get("code", "CONTEXT_MISMATCH"),
            "error_message": verified.get("message", "Execution context verification failed."),
            "missing_fields": verified.get("missing_fields", []),
        }

    planner_context = copy.deepcopy(handoff.get("planner_context") or {})
    goal = str(planner_context.get("goal") or "").strip()
    user_message_text = str(planner_context.get("user_message_text") or "").strip()
    primary_intent = str(planner_context.get("primary_intent") or "").strip()
    requested_actions = copy.deepcopy(planner_context.get("requested_actions") or [])

    if not goal and user_message_text:
        goal = f"Handle user request: {user_message_text[:120]}"
    if not goal:
        return {
            "_context_ready": "false",
            "error_code": "INSUFFICIENT_PLANNING_CONTEXT",
            "error_message": "Planning goal is missing.",
            "missing_fields": ["planner_context.goal or planner_context.user_message_text"],
        }

    if not requested_actions and primary_intent:
        action = INTENT_TO_ACTION.get(primary_intent)
        if action:
            requested_actions = [{
                "action": action,
                "module_name": ACTION_TO_MODULE.get(action),
                "purpose": f"Handle intent {primary_intent}",
                "inputs": copy.deepcopy(planner_context.get("inputs") or {}),
            }]

    if not requested_actions:
        return {
            "_context_ready": "false",
            "error_code": "INSUFFICIENT_PLANNING_CONTEXT",
            "error_message": "No requested actions or mappable primary intent are available.",
            "missing_fields": ["planner_context.requested_actions or planner_context.primary_intent"],
        }

    return {
        "_context_ready": "true",
        "tenant_id": handoff["tenant_id"],
        "thread_id": handoff["thread_id"],
        "execution_id": handoff["execution_id"],
        "trigger_message_id": handoff["trigger_message_id"],
        "idempotency_key": handoff["idempotency_key"],
        "goal": goal,
        "primary_intent": primary_intent or "multi_action_request",
        "user_message_text": user_message_text,
        "requested_actions": requested_actions,
        "module_registry": registry,
        "warnings": list(handoff.get("warnings", [])) + list(verified.get("warnings", [])),
    }


def generate_plan(planner_input: Dict[str, Any]) -> Dict[str, Any]:
    if str(planner_input.get("_context_ready")) != "true":
        return build_error_payload(
            planner_input.get("error_code", "PLAN_BUILD_FAILED"),
            planner_input.get("error_message", "Planner input is not ready."),
            planner_input.get("missing_fields", []),
        )

    steps = []
    requested_actions = planner_input.get("requested_actions", [])
    for idx, action in enumerate(requested_actions, start=1):
        action_name = str(action.get("action") or "").strip()
        module_name = str(action.get("module_name") or ACTION_TO_MODULE.get(action_name) or "").strip()
        if not module_name:
            return build_error_payload(
                "PLAN_BUILD_FAILED",
                f"Could not resolve module for action {action_name!r}.",
                [f"requested_actions[{idx-1}].module_name"],
            )
        steps.append({
            "step_id": f"step_{idx:02d}_{action_name or 'action'}",
            "module_name": module_name,
            "purpose": str(action.get("purpose") or f"Execute {action_name}"),
            "inputs": copy.deepcopy(action.get("inputs") or {}),
            "depends_on": copy.deepcopy(action.get("depends_on") or []),
            "execution_mode": str(action.get("execution_mode") or "sequential"),
            "expected_outputs": copy.deepcopy(action.get("expected_outputs") or []),
            "replan_if": copy.deepcopy(action.get("replan_if") or ["failed"]),
            "failure_policy": str(action.get("failure_policy") or "continue_with_notice"),
            "status": "pending",
        })

    return {
        "status_kind": "success",
        "result_type": "plan",
        "module_name": "plan_generation",
        "payload": {
            "plan_id": f"plan:{planner_input['execution_id']}:v1",
            "execution_id": planner_input["execution_id"],
            "thread_id": planner_input["thread_id"],
            "goal": planner_input["goal"],
            "primary_intent": planner_input["primary_intent"],
            "reasoning_summary": f"Generated {len(steps)} bounded step(s) from the validated orchestrator handoff.",
            "steps": steps,
            "allowed_next_stage": "WF-DI-01",
            "dispatcher_input": {
                "dispatch_allowed": True,
                "module_execution_started": False,
                "response_generation_allowed": False,
                "domain_writes_performed": False,
            },
            "warnings": planner_input.get("warnings", []),
        },
    }


def build_error_payload(code: str, message: str, missing_fields: Optional[List[str]] = None) -> Dict[str, Any]:
    return {
        "status_kind": "failed",
        "result_type": "error",
        "module_name": "plan_generation",
        "error": {
            "code": code,
            "message": message,
            "missing_fields": list(missing_fields or []),
        },
    }


def run_full_pipeline(raw_input: Dict[str, Any], db_row: Optional[Dict[str, Any]], strict_db_check: bool = True) -> Dict[str, Any]:
    validated = validate_or_handoff(raw_input)
    if not validated.valid:
        return build_error_payload(validated.code or "INVALID_HANDOFF_INPUT", validated.message or "Invalid input.", validated.missing_fields)

    handoff = extract_planning_input(validated.normalized)
    verified = verify_context_match(handoff, db_row, strict_db_check=strict_db_check)
    registry = load_module_registry()
    planner_input = build_planner_input(handoff, verified, registry)
    if str(planner_input.get("_context_ready")) != "true":
        return build_error_payload(
            planner_input.get("error_code", "INSUFFICIENT_PLANNING_CONTEXT"),
            planner_input.get("error_message", "Planner input is incomplete."),
            planner_input.get("missing_fields", []),
        )
    return generate_plan(planner_input)
