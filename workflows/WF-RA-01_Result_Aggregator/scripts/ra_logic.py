from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Tuple


CANONICAL_ERROR_CODES = {
    "INVALID_AGGREGATION_INPUT",
    "CONTEXT_MISMATCH",
    "MISSING_REQUIRED_FIELDS",
    "MISSING_MODULE_RESULTS",
    "DUPLICATE_STEP_IDS",
}


PERMITTED_RESULT_STATUSES = {"success", "partial", "failed", "no_action"}


def canonical_error(code: str, message: str, *, missing_fields=None, details=None) -> Dict[str, Any]:
    if code not in CANONICAL_ERROR_CODES:
        code = "INVALID_AGGREGATION_INPUT"
    return {
        "status_kind": "error",
        "result_type": "aggregation_error",
        "error": {
            "code": code,
            "message": message,
            "missing_fields": missing_fields or [],
            "details": details or {},
        },
    }


def validate_aggregation_envelope(payload: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
    required_top = [
        "status_kind",
        "result_type",
        "execution_context_id",
        "thread_id",
        "tenant_id",
        "aggregation_input",
    ]
    missing_top = [f for f in required_top if f not in payload]
    if missing_top:
        return False, canonical_error(
            "INVALID_AGGREGATION_INPUT",
            "Aggregation envelope missing required top-level fields.",
            missing_fields=missing_top,
        )

    if payload["status_kind"] != "success" or payload["result_type"] != "module_batch":
        return False, canonical_error(
            "INVALID_AGGREGATION_INPUT",
            "Aggregation envelope must be a canonical success/module_batch payload.",
            details={"status_kind": payload.get("status_kind"), "result_type": payload.get("result_type")},
        )

    ai = payload["aggregation_input"]
    missing_ai = [f for f in [
        "aggregation_allowed",
        "response_generation_allowed",
        "module_execution_completed",
        "domain_writes_performed",
        "module_results",
        "expected_step_ids",
    ] if f not in ai]
    if missing_ai:
        return False, canonical_error(
            "INVALID_AGGREGATION_INPUT",
            "Aggregation input is incomplete.",
            missing_fields=missing_ai,
        )

    if not ai["aggregation_allowed"]:
        return False, canonical_error("INVALID_AGGREGATION_INPUT", "Aggregation is not allowed by upstream guard flags.")
    if ai["response_generation_allowed"]:
        return False, canonical_error("INVALID_AGGREGATION_INPUT", "Response generation must remain disabled in aggregation stage.")
    if not ai["module_execution_completed"]:
        return False, canonical_error("INVALID_AGGREGATION_INPUT", "Module execution must be completed before aggregation.")
    if ai["domain_writes_performed"]:
        return False, canonical_error("INVALID_AGGREGATION_INPUT", "Aggregation stage must start from a no-write batch envelope.")

    module_results = ai["module_results"]
    expected_step_ids = ai["expected_step_ids"]
    if not isinstance(module_results, list) or not module_results:
        return False, canonical_error("MISSING_MODULE_RESULTS", "Aggregation requires a non-empty module_results list.")
    if not isinstance(expected_step_ids, list) or not expected_step_ids:
        return False, canonical_error("MISSING_REQUIRED_FIELDS", "Aggregation requires expected_step_ids.", missing_fields=["expected_step_ids"])

    seen = set()
    normalized_results = []
    for idx, result in enumerate(module_results):
        missing_result = [f for f in [
            "module_name", "step_id", "result_type", "status", "summary", "actions_executed",
            "artifacts", "observations", "proposals", "confidence", "needs_followup", "followup_requests"
        ] if f not in result]
        if missing_result:
            return False, canonical_error(
                "MISSING_REQUIRED_FIELDS",
                f"Module result at index {idx} is incomplete.",
                missing_fields=missing_result,
            )
        if result["status"] not in PERMITTED_RESULT_STATUSES:
            return False, canonical_error(
                "INVALID_AGGREGATION_INPUT",
                f"Invalid module result status at index {idx}.",
                details={"status": result["status"]},
            )
        step_id = result["step_id"]
        if step_id in seen:
            return False, canonical_error(
                "DUPLICATE_STEP_IDS",
                "Duplicate step_id detected in module batch.",
                details={"step_id": step_id},
            )
        seen.add(step_id)
        normalized_results.append(deepcopy(result))

    missing_steps = [s for s in expected_step_ids if s not in seen]
    if missing_steps:
        return False, canonical_error(
            "MISSING_MODULE_RESULTS",
            "Expected step results are missing from the module batch.",
            missing_fields=missing_steps,
        )

    return True, {
        "execution_context_id": payload["execution_context_id"],
        "thread_id": payload["thread_id"],
        "tenant_id": payload["tenant_id"],
        "expected_step_ids": list(expected_step_ids),
        "module_results": normalized_results,
        "idempotency_key": payload.get("idempotency_key", f"aggregate:{payload['execution_context_id']}"),
    }


def rollup_status(results: List[Dict[str, Any]]) -> str:
    statuses = [r["status"] for r in results]
    if all(s == "success" for s in statuses):
        return "success"
    if all(s == "failed" for s in statuses):
        return "failed"
    if all(s == "no_action" for s in statuses):
        return "no_action"
    if any(s == "failed" for s in statuses):
        return "partial"
    if any(s == "partial" for s in statuses):
        return "partial"
    return "partial"


def aggregate_module_results(envelope: Dict[str, Any]) -> Dict[str, Any]:
    results = envelope["module_results"]
    status = rollup_status(results)

    actions_executed: List[Dict[str, Any]] = []
    artifacts: List[Dict[str, Any]] = []
    observations: List[str] = []
    proposals: List[Dict[str, Any]] = []
    followup_requests: List[Dict[str, Any]] = []
    module_names: List[str] = []
    per_status_counts = {"success": 0, "partial": 0, "failed": 0, "no_action": 0}

    total_confidence = 0.0
    for result in results:
        module_names.append(result["module_name"])
        per_status_counts[result["status"]] += 1
        total_confidence += float(result.get("confidence", 0.0))
        actions_executed.extend(deepcopy(result.get("actions_executed", [])))
        artifacts.extend(deepcopy(result.get("artifacts", [])))
        observations.extend(list(result.get("observations", [])))
        proposals.extend(deepcopy(result.get("proposals", [])))
        if result.get("needs_followup"):
            followup_requests.extend(deepcopy(result.get("followup_requests", [])))

    avg_confidence = round(total_confidence / len(results), 4)
    summary = f"Aggregated {len(results)} module result(s) with rollup status {status}."

    return {
        "status_kind": "success",
        "result_type": "aggregated_result",
        "execution_context_id": envelope["execution_context_id"],
        "thread_id": envelope["thread_id"],
        "tenant_id": envelope["tenant_id"],
        "aggregated_result": {
            "status": status,
            "summary": summary,
            "module_results_count": len(results),
            "module_names": module_names,
            "per_status_counts": per_status_counts,
            "actions_executed": actions_executed,
            "artifacts": artifacts,
            "observations": observations,
            "proposals": proposals,
            "confidence": avg_confidence,
            "needs_followup": bool(followup_requests),
            "followup_requests": followup_requests,
            "expected_step_ids": list(envelope["expected_step_ids"]),
            "returned_step_ids": [r["step_id"] for r in results],
        },
        "state_update_allowed": True,
        "response_generation_allowed": False,
        "domain_writes_performed": False,
        "allowed_next_stage": "WF-SU-01",
    }
