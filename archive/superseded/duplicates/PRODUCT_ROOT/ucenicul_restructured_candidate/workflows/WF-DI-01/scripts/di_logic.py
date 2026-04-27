from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


MODULE_REGISTRY: List[Dict[str, Any]] = [
    {
        "module_name": "task_module",
        "module_type": "executor",
        "capabilities": ["create_task", "list_tasks", "update_task", "complete_task", "delete_task"],
    },
    {
        "module_name": "reminder_module",
        "module_type": "executor",
        "capabilities": ["create_reminder", "list_reminders", "update_reminder", "cancel_reminder"],
    },
    {
        "module_name": "memory_module",
        "module_type": "executor",
        "capabilities": ["store_memory", "search_memory"],
    },
    {
        "module_name": "improvement_module",
        "module_type": "executor",
        "capabilities": ["capture_feedback"],
    },
    {
        "module_name": "watcher_module_basic",
        "module_type": "observer",
        "capabilities": ["produce_observation"],
    },
]

ALLOWED_NEXT_STAGE = "WF-ME-01"


@dataclass
class ValidationResult:
    valid: bool
    code: Optional[str]
    message: Optional[str]
    missing_fields: List[str]
    normalized: Optional[Dict[str, Any]] = None


def _fail(code: str, message: str, missing_fields: Optional[List[str]] = None) -> ValidationResult:
    return ValidationResult(False, code, message, missing_fields or [], None)


def validate_plan_result(candidate: Any) -> ValidationResult:
    if not isinstance(candidate, dict):
        return _fail("INVALID_HANDOFF_INPUT", "Input is not a JSON object.", ["root"])

    required_top = ["status_kind", "result_type", "payload"]
    missing = [k for k in required_top if k not in candidate]
    if missing:
        return _fail("INVALID_HANDOFF_INPUT", "Required plan fields are missing.", missing)

    payload = candidate.get("payload")
    if not isinstance(payload, dict):
        return _fail("INVALID_HANDOFF_INPUT", "payload must be an object.", ["payload"])

    required_payload = [
        "tenant_id",
        "thread_id",
        "execution_id",
        "trigger_message_id",
        "idempotency_key",
        "plan_id",
        "goal",
        "primary_intent",
        "steps",
        "dispatcher_input",
    ]
    missing = [f"payload.{k}" for k in required_payload if k not in payload]
    if missing:
        return _fail("INVALID_HANDOFF_INPUT", "Required plan payload fields are missing.", missing)

    if candidate.get("status_kind") != "success":
        return _fail("INVALID_HANDOFF_INPUT", "status_kind must be success.", ["status_kind"])
    if candidate.get("result_type") != "plan":
        return _fail("INVALID_HANDOFF_INPUT", "result_type must be plan.", ["result_type"])

    steps = payload.get("steps")
    if not isinstance(steps, list) or not steps:
        return _fail("INVALID_PLAN", "steps must be a non-empty array.", ["payload.steps"])

    dispatcher_input = payload.get("dispatcher_input") or {}
    if dispatcher_input.get("dispatch_allowed") is not True:
        return _fail("INVALID_PLAN", "dispatch_allowed must be true.", ["payload.dispatcher_input.dispatch_allowed"])
    if dispatcher_input.get("module_execution_started") is not False:
        return _fail("INVALID_PLAN", "module_execution_started must be false.", ["payload.dispatcher_input.module_execution_started"])
    if dispatcher_input.get("response_generation_allowed") is not False:
        return _fail("INVALID_PLAN", "response_generation_allowed must be false.", ["payload.dispatcher_input.response_generation_allowed"])
    if dispatcher_input.get("domain_writes_performed") is not False:
        return _fail("INVALID_PLAN", "domain_writes_performed must be false.", ["payload.dispatcher_input.domain_writes_performed"])

    normalized_steps = []
    for index, step in enumerate(steps):
        if not isinstance(step, dict):
            return _fail("INVALID_PLAN", f"Step {index} is not an object.", [f"payload.steps[{index}]"])
        required_step = ["step_id", "module_name", "purpose", "inputs", "depends_on", "execution_mode", "expected_outputs", "replan_if", "failure_policy", "status"]
        missing_step = [f"payload.steps[{index}].{k}" for k in required_step if k not in step]
        if missing_step:
            return _fail("INVALID_PLAN", f"Step {index} is missing required fields.", missing_step)
        if step.get("status") != "pending":
            return _fail("INVALID_PLAN", f"Step {index} status must be pending.", [f"payload.steps[{index}].status"])
        if step.get("execution_mode") not in {"sequential", "parallel"}:
            return _fail("INVALID_PLAN", f"Step {index} execution_mode invalid.", [f"payload.steps[{index}].execution_mode"])
        normalized_steps.append(
            {
                "step_id": str(step["step_id"]),
                "module_name": str(step["module_name"]),
                "purpose": str(step["purpose"]),
                "inputs": copy.deepcopy(step.get("inputs") or {}),
                "depends_on": [str(x) for x in step.get("depends_on") or []],
                "execution_mode": str(step["execution_mode"]),
                "expected_outputs": [str(x) for x in step.get("expected_outputs") or []],
                "replan_if": [str(x) for x in step.get("replan_if") or []],
                "failure_policy": str(step.get("failure_policy") or "continue_with_notice"),
                "status": "pending",
            }
        )

    normalized = {
        "status_kind": "success",
        "result_type": "plan",
        "module_name": candidate.get("module_name", "plan_generation"),
        "payload": {
            "tenant_id": str(payload["tenant_id"]),
            "thread_id": str(payload["thread_id"]),
            "execution_id": str(payload["execution_id"]),
            "trigger_message_id": str(payload["trigger_message_id"]),
            "idempotency_key": str(payload["idempotency_key"]),
            "plan_id": str(payload["plan_id"]),
            "goal": str(payload["goal"]),
            "primary_intent": str(payload["primary_intent"]),
            "steps": normalized_steps,
            "dispatcher_input": {
                "dispatch_allowed": True,
                "module_execution_started": False,
                "response_generation_allowed": False,
                "domain_writes_performed": False,
            },
            "warnings": list(payload.get("warnings", [])),
        },
    }
    return ValidationResult(True, None, None, [], normalized)


def extract_dispatch_input(normalized: Dict[str, Any]) -> Dict[str, Any]:
    payload = normalized["payload"]
    return {
        "tenant_id": payload["tenant_id"],
        "thread_id": payload["thread_id"],
        "execution_id": payload["execution_id"],
        "trigger_message_id": payload["trigger_message_id"],
        "idempotency_key": payload["idempotency_key"],
        "plan_id": payload["plan_id"],
        "goal": payload["goal"],
        "primary_intent": payload["primary_intent"],
        "steps": copy.deepcopy(payload["steps"]),
        "dispatcher_input": copy.deepcopy(payload["dispatcher_input"]),
        "warnings": list(payload.get("warnings", [])),
    }


def verify_context_match(dispatch_input: Dict[str, Any], row: Optional[Dict[str, Any]], strict_db_check: bool = True) -> Dict[str, Any]:
    if row is None:
        if strict_db_check:
            return {
                "ok": False,
                "code": "CONTEXT_MISMATCH",
                "message": "Execution context row was not found or is incomplete.",
                "missing_fields": ["execution_context"],
            }
        return {"ok": True, "warnings": ["No DB row re-read; relying on upstream plan envelope only."]}

    for key in ("execution_id", "tenant_id", "thread_id"):
        if str(row.get(key) or "") != str(dispatch_input.get(key) or ""):
            return {
                "ok": False,
                "code": "CONTEXT_MISMATCH",
                "message": f"{key} does not match canonical execution context.",
                "missing_fields": [key],
            }
    if str(row.get("status") or "") != "initialized":
        return {
            "ok": False,
            "code": "CONTEXT_MISMATCH",
            "message": "Execution context is not initialized.",
            "missing_fields": ["status"],
        }
    return {"ok": True, "warnings": []}


def load_module_registry() -> List[Dict[str, Any]]:
    return copy.deepcopy(MODULE_REGISTRY)


def _registry_lookup(registry: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {item["module_name"]: item for item in registry}


def build_ready_steps(dispatch_input: Dict[str, Any], verified: Dict[str, Any], registry: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not verified.get("ok"):
        return {
            "_context_ready": "false",
            "error_code": verified.get("code", "CONTEXT_MISMATCH"),
            "error_message": verified.get("message", "Context verification failed."),
            "missing_fields": list(verified.get("missing_fields", [])),
        }

    steps = dispatch_input.get("steps") or []
    reg = _registry_lookup(registry)
    step_ids = {step["step_id"] for step in steps}

    ready_sequential = []
    ready_parallel = []
    warnings = list(dispatch_input.get("warnings", [])) + list(verified.get("warnings", []))

    for step in steps:
        if step["module_name"] not in reg:
            return {
                "_context_ready": "false",
                "error_code": "UNKNOWN_MODULE",
                "error_message": f"Module {step['module_name']} is not present in the capability registry.",
                "missing_fields": [f"module_registry.{step['module_name']}"]
            }
        unknown_dependencies = [dep for dep in step.get("depends_on", []) if dep not in step_ids]
        if unknown_dependencies:
            return {
                "_context_ready": "false",
                "error_code": "INVALID_PLAN",
                "error_message": f"Step {step['step_id']} depends on unknown steps.",
                "missing_fields": [f"depends_on.{dep}" for dep in unknown_dependencies],
            }
        module_request = {
            "execution_context_id": dispatch_input["execution_id"],
            "thread_id": dispatch_input["thread_id"],
            "step_id": step["step_id"],
            "module_name": step["module_name"],
            "purpose": step["purpose"],
            "inputs": copy.deepcopy(step.get("inputs") or {}),
            "idempotency_key": f"{dispatch_input['idempotency_key']}:{step['step_id']}:dispatch:v1",
        }
        target = ready_parallel if step["execution_mode"] == "parallel" and not step.get("depends_on") else ready_sequential
        target.append({
            "step_id": step["step_id"],
            "execution_mode": step["execution_mode"],
            "depends_on": list(step.get("depends_on") or []),
            "module_request": module_request,
        })

    groups = []
    if ready_parallel:
        groups.append({
            "group_id": "group:parallel:001",
            "execution_mode": "parallel",
            "step_ids": [item["step_id"] for item in ready_parallel],
            "module_requests": [item["module_request"] for item in ready_parallel],
        })
    for index, item in enumerate(ready_sequential, start=1):
        groups.append({
            "group_id": f"group:sequential:{index:03d}",
            "execution_mode": "sequential",
            "step_ids": [item["step_id"]],
            "module_requests": [item["module_request"]],
        })

    return {
        "_context_ready": "true",
        "dispatch_input": copy.deepcopy(dispatch_input),
        "ready_groups": groups,
        "warnings": warnings,
    }


def build_dispatch_payload(ready: Dict[str, Any]) -> Dict[str, Any]:
    if ready.get("_context_ready") != "true":
        return build_error_payload(
            ready.get("error_code", "CONTEXT_MISMATCH"),
            ready.get("error_message", "Dispatcher context verification failed."),
            ready.get("missing_fields", []),
        )

    dispatch_input = ready["dispatch_input"]
    dispatch_id = f"dispatch:{dispatch_input['plan_id']}:v1"
    return {
        "status_kind": "success",
        "result_type": "dispatch",
        "module_name": "dispatcher",
        "payload": {
            "tenant_id": dispatch_input["tenant_id"],
            "thread_id": dispatch_input["thread_id"],
            "execution_id": dispatch_input["execution_id"],
            "plan_id": dispatch_input["plan_id"],
            "dispatch_id": dispatch_id,
            "allowed_next_stage": ALLOWED_NEXT_STAGE,
            "ready_groups": copy.deepcopy(ready["ready_groups"]),
            "dispatch_guard": {
                "dispatch_allowed": True,
                "module_execution_started": False,
                "response_generation_allowed": False,
                "domain_writes_performed": False,
            },
            "warnings": list(ready.get("warnings", [])),
        },
    }


def build_error_payload(code: str, message: str, missing_fields: Optional[List[str]] = None) -> Dict[str, Any]:
    return {
        "status_kind": "failed",
        "result_type": "error",
        "module_name": "dispatcher",
        "error": {
            "code": code,
            "message": message,
            "missing_fields": list(missing_fields or []),
        },
    }


def run_full_pipeline(candidate: Any, row: Optional[Dict[str, Any]], strict_db_check: bool = True) -> Dict[str, Any]:
    validation = validate_plan_result(candidate)
    if not validation.valid:
        return build_error_payload(validation.code or "INVALID_HANDOFF_INPUT", validation.message or "Invalid input.", validation.missing_fields)

    dispatch_input = extract_dispatch_input(validation.normalized)
    verified = verify_context_match(dispatch_input, row, strict_db_check=strict_db_check)
    registry = load_module_registry()
    ready = build_ready_steps(dispatch_input, verified, registry)
    return build_dispatch_payload(ready)
