// ra_logic_js.mjs — line-for-line JS port of WF-RA-01 ra_logic.py guard clauses
// that matter for the V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE mission.
// Source of truth: workflows/WF-RA-01_Result_Aggregator/scripts/ra_logic.py

export const CANONICAL_ERROR_CODES = new Set([
  "INVALID_AGGREGATION_INPUT",
  "CONTEXT_MISMATCH",
  "MISSING_REQUIRED_FIELDS",
  "MISSING_MODULE_RESULTS",
  "DUPLICATE_STEP_IDS",
]);

export const PERMITTED_RESULT_STATUSES = new Set([
  "success",
  "partial",
  "failed",
  "no_action",
]);

export function canonicalError(code, message, { missing_fields = [], details = {} } = {}) {
  const codeFinal = CANONICAL_ERROR_CODES.has(code) ? code : "INVALID_AGGREGATION_INPUT";
  return {
    status_kind: "error",
    result_type: "aggregation_error",
    error: {
      code: codeFinal,
      message,
      missing_fields,
      details,
    },
  };
}

export function validateAggregationEnvelope(payload) {
  const requiredTop = [
    "status_kind",
    "result_type",
    "execution_context_id",
    "thread_id",
    "tenant_id",
    "aggregation_input",
  ];
  const missingTop = requiredTop.filter((f) => !(f in payload));
  if (missingTop.length) {
    return [false, canonicalError(
      "INVALID_AGGREGATION_INPUT",
      "Aggregation envelope missing required top-level fields.",
      { missing_fields: missingTop }
    )];
  }

  if (payload.status_kind !== "success" || payload.result_type !== "module_batch") {
    return [false, canonicalError(
      "INVALID_AGGREGATION_INPUT",
      "Aggregation envelope must be a canonical success/module_batch payload.",
      { details: { status_kind: payload.status_kind, result_type: payload.result_type } }
    )];
  }

  const ai = payload.aggregation_input;
  const missingAi = [
    "aggregation_allowed",
    "response_generation_allowed",
    "module_execution_completed",
    "domain_writes_performed",
    "module_results",
    "expected_step_ids",
  ].filter((f) => !(f in ai));
  if (missingAi.length) {
    return [false, canonicalError(
      "INVALID_AGGREGATION_INPUT",
      "Aggregation input is incomplete.",
      { missing_fields: missingAi }
    )];
  }

  if (!ai.aggregation_allowed) {
    return [false, canonicalError("INVALID_AGGREGATION_INPUT", "Aggregation is not allowed by upstream guard flags.")];
  }
  if (ai.response_generation_allowed) {
    return [false, canonicalError("INVALID_AGGREGATION_INPUT", "Response generation must remain disabled in aggregation stage.")];
  }
  if (!ai.module_execution_completed) {
    return [false, canonicalError("INVALID_AGGREGATION_INPUT", "Module execution must be completed before aggregation.")];
  }
  if (ai.domain_writes_performed) {
    return [false, canonicalError("INVALID_AGGREGATION_INPUT", "Aggregation stage must start from a no-write batch envelope.")];
  }

  const moduleResults = ai.module_results;
  const expectedStepIds = ai.expected_step_ids;
  if (!Array.isArray(moduleResults) || moduleResults.length === 0) {
    return [false, canonicalError("MISSING_MODULE_RESULTS", "Aggregation requires a non-empty module_results list.")];
  }
  if (!Array.isArray(expectedStepIds) || expectedStepIds.length === 0) {
    return [false, canonicalError("MISSING_REQUIRED_FIELDS", "Aggregation requires expected_step_ids.", { missing_fields: ["expected_step_ids"] })];
  }

  const seen = new Set();
  for (let idx = 0; idx < moduleResults.length; idx++) {
    const result = moduleResults[idx];
    const needed = [
      "module_name", "step_id", "result_type", "status", "summary", "actions_executed",
      "artifacts", "observations", "proposals", "confidence", "needs_followup", "followup_requests",
    ];
    const missingResult = needed.filter((f) => !(f in result));
    if (missingResult.length) {
      return [false, canonicalError(
        "MISSING_REQUIRED_FIELDS",
        `Module result at index ${idx} is incomplete.`,
        { missing_fields: missingResult }
      )];
    }
    if (!PERMITTED_RESULT_STATUSES.has(result.status)) {
      return [false, canonicalError(
        "INVALID_AGGREGATION_INPUT",
        `Invalid module result status at index ${idx}.`,
        { details: { status: result.status } }
      )];
    }
    const stepId = result.step_id;
    if (seen.has(stepId)) {
      return [false, canonicalError(
        "DUPLICATE_STEP_IDS",
        "Duplicate step_id detected in module batch.",
        { details: { step_id: stepId } }
      )];
    }
    seen.add(stepId);
  }

  const missingSteps = expectedStepIds.filter((s) => !seen.has(s));
  if (missingSteps.length) {
    return [false, canonicalError(
      "MISSING_MODULE_RESULTS",
      "Expected step results are missing from the module batch.",
      { missing_fields: missingSteps }
    )];
  }

  return [true, {
    execution_context_id: payload.execution_context_id,
    thread_id: payload.thread_id,
    tenant_id: payload.tenant_id,
    expected_step_ids: [...expectedStepIds],
    module_results: moduleResults.map((r) => JSON.parse(JSON.stringify(r))),
    idempotency_key: payload.idempotency_key || `aggregate:${payload.execution_context_id}`,
  }];
}

export function rollupStatus(results) {
  const statuses = results.map((r) => r.status);
  if (statuses.every((s) => s === "success")) return "success";
  if (statuses.every((s) => s === "failed")) return "failed";
  if (statuses.every((s) => s === "no_action")) return "no_action";
  if (statuses.some((s) => s === "failed")) return "partial";
  if (statuses.some((s) => s === "partial")) return "partial";
  return "partial";
}
