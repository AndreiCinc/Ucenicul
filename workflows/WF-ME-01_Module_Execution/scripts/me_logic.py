from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Tuple


CANONICAL_ERROR_CODES = {
    "INVALID_DISPATCH_INPUT",
    "CONTEXT_MISMATCH",
    "UNSUPPORTED_MODULE",
    "UNSUPPORTED_ACTION",
    "MISSING_REQUIRED_FIELDS",
}


def canonical_module_result(
    *,
    module_name: str,
    step_id: str,
    result_type: str,
    status: str,
    summary: str,
    actions_executed: List[Dict[str, Any]] | None = None,
    artifacts: List[Dict[str, Any]] | None = None,
    observations: List[str] | None = None,
    proposals: List[Dict[str, Any]] | None = None,
    confidence: float = 1.0,
    needs_followup: bool = False,
    followup_requests: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    return {
        "module_name": module_name,
        "step_id": step_id,
        "result_type": result_type,
        "status": status,
        "summary": summary,
        "observations": observations or [],
        "proposals": proposals or [],
        "actions_executed": actions_executed or [],
        "artifacts": artifacts or [],
        "confidence": confidence,
        "needs_followup": needs_followup,
        "followup_requests": followup_requests or [],
    }


def canonical_error(code: str, message: str, *, missing_fields=None, details=None) -> Dict[str, Any]:
    if code not in CANONICAL_ERROR_CODES:
        code = "INVALID_DISPATCH_INPUT"
    return {
        "status_kind": "error",
        "result_type": "module_error",
        "error": {
            "code": code,
            "message": message,
            "missing_fields": missing_fields or [],
            "details": details or {},
        },
    }


def validate_dispatch_envelope(payload: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
    required_top = [
        "status_kind",
        "result_type",
        "execution_context_id",
        "thread_id",
        "tenant_id",
        "dispatcher_input",
    ]
    missing_top = [f for f in required_top if f not in payload]
    if missing_top:
        return False, canonical_error(
            "INVALID_DISPATCH_INPUT",
            "Dispatcher envelope missing required top-level fields.",
            missing_fields=missing_top,
        )

    if payload["status_kind"] != "success" or payload["result_type"] != "dispatch":
        return False, canonical_error(
            "INVALID_DISPATCH_INPUT",
            "Dispatcher envelope must be a canonical success/dispatch payload.",
            details={"status_kind": payload.get("status_kind"), "result_type": payload.get("result_type")},
        )

    di = payload["dispatcher_input"]
    missing_di = [f for f in ["dispatch_allowed", "module_execution_started", "response_generation_allowed", "domain_writes_performed", "step"] if f not in di]
    if missing_di:
        return False, canonical_error(
            "INVALID_DISPATCH_INPUT",
            "Dispatcher input is incomplete.",
            missing_fields=missing_di,
        )

    if not di["dispatch_allowed"]:
        return False, canonical_error("INVALID_DISPATCH_INPUT", "Dispatch is not allowed by upstream guard flags.")
    if di["module_execution_started"]:
        return False, canonical_error("INVALID_DISPATCH_INPUT", "Module execution already started for this dispatch envelope.")
    if di["response_generation_allowed"]:
        return False, canonical_error("INVALID_DISPATCH_INPUT", "Response generation must remain disabled in module execution stage.")
    if di["domain_writes_performed"]:
        return False, canonical_error("INVALID_DISPATCH_INPUT", "Dispatcher envelope already indicates domain writes were performed.")

    step = di["step"]
    missing_step = [f for f in ["step_id", "module_name", "purpose", "inputs", "execution_mode"] if f not in step]
    if missing_step:
        return False, canonical_error(
            "MISSING_REQUIRED_FIELDS",
            "Dispatch step is missing required fields.",
            missing_fields=missing_step,
        )

    return True, {
        "execution_context_id": payload["execution_context_id"],
        "thread_id": payload["thread_id"],
        "tenant_id": payload["tenant_id"],
        "idempotency_key": payload.get("idempotency_key", f"dispatch:{step['step_id']}"),
        "step": deepcopy(step),
    }


def build_task_create_result(envelope: Dict[str, Any]) -> Dict[str, Any]:
    step = envelope["step"]
    inputs = step["inputs"]
    missing = [f for f in ["description"] if f not in inputs or not inputs[f]]
    if missing:
        return canonical_error("MISSING_REQUIRED_FIELDS", "Task create inputs are incomplete.", missing_fields=missing)

    task_id = f"task:{envelope['tenant_id']}:{step['step_id']}"
    return {
        "status_kind": "success",
        "result_type": "module_result",
        "execution_context_id": envelope["execution_context_id"],
        "thread_id": envelope["thread_id"],
        "tenant_id": envelope["tenant_id"],
        "module_result": canonical_module_result(
            module_name="task_module",
            step_id=step["step_id"],
            result_type="execution",
            status="success",
            summary="Task create request prepared successfully.",
            actions_executed=[{
                "action": "create_task",
                "details": {
                    "task_id": task_id,
                    "title": inputs.get("title") or inputs["description"],
                    "description": inputs["description"],
                    "priority": inputs.get("priority", "normal"),
                    "due_type": inputs.get("due_type", "flexible"),
                    "due_date": inputs.get("due_date"),
                    "due_at": inputs.get("due_at"),
                },
            }],
            artifacts=[{"type": "task_id", "value": task_id}],
        ),
        "module_execution_started": True,
        "domain_writes_performed": False,
        "response_generation_allowed": False,
    }


def build_task_list_result(envelope: Dict[str, Any]) -> Dict[str, Any]:
    step = envelope["step"]
    inputs = step["inputs"]
    return {
        "status_kind": "success",
        "result_type": "module_result",
        "execution_context_id": envelope["execution_context_id"],
        "thread_id": envelope["thread_id"],
        "tenant_id": envelope["tenant_id"],
        "module_result": canonical_module_result(
            module_name="task_module",
            step_id=step["step_id"],
            result_type="analysis",
            status="success",
            summary="Task list request prepared successfully.",
            actions_executed=[{
                "action": "list_tasks",
                "details": {
                    "timeframe": inputs.get("timeframe", "all"),
                    "status": inputs.get("status", "open"),
                    "limit": inputs.get("limit", 20),
                },
            }],
            artifacts=[],
        ),
        "module_execution_started": True,
        "domain_writes_performed": False,
        "response_generation_allowed": False,
    }


def build_task_update_result(envelope: Dict[str, Any]) -> Dict[str, Any]:
    step = envelope["step"]
    inputs = step["inputs"]
    missing_target = not inputs.get("task_id") and not inputs.get("title_match")
    if missing_target:
        return canonical_error("MISSING_REQUIRED_FIELDS", "Task update requires task_id or title_match.", missing_fields=["task_id_or_title_match"])

    patch = {k: v for k, v in inputs.items() if k in {"title", "description", "priority", "due_date", "due_at", "status"} and v is not None}
    if not patch:
        return canonical_error("MISSING_REQUIRED_FIELDS", "Task update requires at least one mutable field.", missing_fields=["patch"])

    return {
        "status_kind": "success",
        "result_type": "module_result",
        "execution_context_id": envelope["execution_context_id"],
        "thread_id": envelope["thread_id"],
        "tenant_id": envelope["tenant_id"],
        "module_result": canonical_module_result(
            module_name="task_module",
            step_id=step["step_id"],
            result_type="execution",
            status="success",
            summary="Task update request prepared successfully.",
            actions_executed=[{
                "action": "update_task",
                "details": {
                    "task_id": inputs.get("task_id"),
                    "title_match": inputs.get("title_match"),
                    "patch": patch,
                },
            }],
        ),
        "module_execution_started": True,
        "domain_writes_performed": False,
        "response_generation_allowed": False,
    }


def build_task_complete_result(envelope: Dict[str, Any]) -> Dict[str, Any]:
    step = envelope["step"]
    inputs = step["inputs"]
    if not inputs.get("task_id") and not inputs.get("title_match"):
        return canonical_error("MISSING_REQUIRED_FIELDS", "Task complete requires task_id or title_match.", missing_fields=["task_id_or_title_match"])
    return {
        "status_kind": "success",
        "result_type": "module_result",
        "execution_context_id": envelope["execution_context_id"],
        "thread_id": envelope["thread_id"],
        "tenant_id": envelope["tenant_id"],
        "module_result": canonical_module_result(
            module_name="task_module",
            step_id=step["step_id"],
            result_type="execution",
            status="success",
            summary="Task complete request prepared successfully.",
            actions_executed=[{
                "action": "complete_task",
                "details": {
                    "task_id": inputs.get("task_id"),
                    "title_match": inputs.get("title_match"),
                },
            }],
        ),
        "module_execution_started": True,
        "domain_writes_performed": False,
        "response_generation_allowed": False,
    }


def build_task_delete_result(envelope: Dict[str, Any]) -> Dict[str, Any]:
    step = envelope["step"]
    inputs = step["inputs"]
    if not inputs.get("task_id") and not inputs.get("title_match") and not inputs.get("scope"):
        return canonical_error("MISSING_REQUIRED_FIELDS", "Task delete requires task_id, title_match, or scope.", missing_fields=["task_id_or_title_match_or_scope"])
    return {
        "status_kind": "success",
        "result_type": "module_result",
        "execution_context_id": envelope["execution_context_id"],
        "thread_id": envelope["thread_id"],
        "tenant_id": envelope["tenant_id"],
        "module_result": canonical_module_result(
            module_name="task_module",
            step_id=step["step_id"],
            result_type="execution",
            status="success",
            summary="Task delete request prepared successfully.",
            actions_executed=[{
                "action": "delete_task",
                "details": {
                    "task_id": inputs.get("task_id"),
                    "title_match": inputs.get("title_match"),
                    "scope": inputs.get("scope"),
                },
            }],
        ),
        "module_execution_started": True,
        "domain_writes_performed": False,
        "response_generation_allowed": False,
    }


def simulate_module_execution(payload: Dict[str, Any]) -> Dict[str, Any]:
    ok, envelope = validate_dispatch_envelope(payload)
    if not ok:
        return envelope

    step = envelope["step"]
    module_name = step["module_name"]
    if module_name != "task_module":
        return canonical_error(
            "UNSUPPORTED_MODULE",
            f"WF-ME-01 currently supports task_module only in live-capable mode; got {module_name}.",
            details={"module_name": module_name},
        )

    action = step["inputs"].get("action", "create_task")
    if action == "create_task":
        return build_task_create_result(envelope)
    if action == "list_tasks":
        return build_task_list_result(envelope)
    if action == "update_task":
        return build_task_update_result(envelope)
    if action == "complete_task":
        return build_task_complete_result(envelope)
    if action == "delete_task":
        return build_task_delete_result(envelope)

    return canonical_error(
        "UNSUPPORTED_ACTION",
        f"Unsupported task_module action: {action}.",
        details={"action": action},
    )
