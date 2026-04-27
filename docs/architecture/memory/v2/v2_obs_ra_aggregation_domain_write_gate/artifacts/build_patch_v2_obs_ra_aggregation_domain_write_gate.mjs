#!/usr/bin/env node
// V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE deterministic builder
// Input:  (none; constants below — post-patch jsCode frozen inline)
// Output: patchV2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_params.json
//         single-key { "jsCode": "<text>" } payload consumed by
//         n8n-patch.mjs patch-node.
// Purpose: freeze the exact post-patch jsCode for
//          ME_Build_RA_Envelope.parameters.jsCode in WF-ME-01 (uq26nh1grIpnHju0).
//
// Design freeze: Candidate A — single-field normalization in success branch:
//   before: `domain_writes_performed: !!src.domain_writes_performed,`
//   after:  `domain_writes_performed: false,`
// Module_error branch is left untouched (already hardcoded `false` in v1.1).

import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(
  __dirname,
  "patchV2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_params.json"
);

// -----------------------------------------------------------------------------
// Frozen NEW jsCode — exactly matches DESIGN_FREEZE.md chosen fix Candidate A.
// Diff vs pre-patch jsCode: one bool literal on line 22 of the success branch.
// -----------------------------------------------------------------------------
const NEW_JSCODE = `// ME_Build_RA_Envelope — v1.2 (V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE:
// normalize aggregation_input.domain_writes_performed=false on the success
// branch to match the v1.1 module_error-branch precedent — the RA aggregation
// gate is a posture signal for the aggregation stage itself, not an audit of
// upstream module writes. Audit of upstream writes remains in
// module_results[*].actions_executed).
// v1.1 comment preserved: wrap module_error envelopes into a canonical failed
// module_batch so that RA-01 aggregates instead of rejecting with
// INVALID_AGGREGATION_INPUT. Preserves the v1.0 success-path behavior.
function safeNode(name) {
  try { const it = $(name).first(); return (it && it.json) ? it.json : {}; } catch (e) { return {}; }
}
const src = $json;
const ctx = safeNode('ME_Validate_Dispatcher_Result');

if (src && src.status_kind === 'success' && src.result_type === 'module_result') {
  const mr = src.module_result || {};
  return [{ json: {
    status_kind: 'success',
    result_type: 'module_batch',
    execution_context_id: src.execution_context_id,
    thread_id: src.thread_id,
    tenant_id: src.tenant_id,
    aggregation_input: {
      aggregation_allowed: true,
      response_generation_allowed: false,
      module_execution_completed: true,
      domain_writes_performed: false,
      module_results: [mr],
      expected_step_ids: [mr.step_id]
    }
  }}];
}

if (src && src.status_kind === 'error' && src.result_type === 'module_error') {
  const err = src.error || {};
  const step = (ctx && ctx.step) || {};
  const stepId = String(step.step_id || 'step_error');
  const moduleName = String(step.module_name || src.module_name || 'module_execution');
  const missingFields = Array.isArray(err.missing_fields) ? err.missing_fields : [];
  const details = (err.details && typeof err.details === 'object') ? err.details : {};
  const failedResult = {
    module_name: moduleName,
    step_id: stepId,
    result_type: 'module_result',
    status: 'failed',
    summary: String(err.message || 'Module execution failed.'),
    actions_executed: [],
    artifacts: [],
    observations: [{
      type: 'module_error',
      code: String(err.code || 'MODULE_ERROR'),
      message: String(err.message || ''),
      missing_fields: missingFields,
      details: details
    }],
    proposals: [],
    confidence: 0,
    needs_followup: true,
    followup_requests: [{
      reason: 'module_error',
      code: String(err.code || 'MODULE_ERROR'),
      missing_fields: missingFields,
      details: details
    }]
  };
  return [{ json: {
    status_kind: 'success',
    result_type: 'module_batch',
    execution_context_id: String(ctx.execution_context_id || ''),
    thread_id: String(ctx.thread_id || ''),
    tenant_id: String(ctx.tenant_id || ''),
    aggregation_input: {
      aggregation_allowed: true,
      response_generation_allowed: false,
      module_execution_completed: true,
      domain_writes_performed: false,
      module_results: [failedResult],
      expected_step_ids: [stepId]
    }
  }}];
}

return [{ json: src }];
`;

// -----------------------------------------------------------------------------
// Build-time guards — reject if any required token is missing, or a forbidden
// marker appears. Any failure aborts the build (non-zero exit).
// -----------------------------------------------------------------------------
const REQUIRED = [
  // success branch markers
  "status_kind === 'success' && src.result_type === 'module_result'",
  "result_type: 'module_batch'",
  "aggregation_allowed: true",
  "response_generation_allowed: false",
  "module_execution_completed: true",
  "module_results: [mr]",
  "expected_step_ids: [mr.step_id]",
  // the fix itself — success branch must hardcode false
  "domain_writes_performed: false,\n      module_results: [mr],",
  // module_error branch preserved (unchanged, hardcoded false)
  "status_kind === 'error' && src.result_type === 'module_error'",
  "module_results: [failedResult]",
  "expected_step_ids: [stepId]",
  // safe helpers preserved
  "function safeNode(name)",
  "const ctx = safeNode('ME_Validate_Dispatcher_Result');",
  // module_error domain_writes_performed: false preserved
  "domain_writes_performed: false,\n      module_results: [failedResult],",
  // passthrough default for other shapes preserved
  "return [{ json: src }];",
];

const FORBIDDEN = [
  // the exact pre-patch propagation pattern must NOT appear anywhere
  "!!src.domain_writes_performed",
  "domain_writes_performed: !!",
  // no accidental `true` literal for the gate
  "domain_writes_performed: true",
  // no accidental removal of aggregation_allowed gate
  "aggregation_allowed: false",
  // no accidental enabling of response_generation in aggregation_input
  "response_generation_allowed: true",
  // no accidental branch deletion markers
  "TODO",
  "FIXME",
  "XXX",
];

function assertGuards(code) {
  const missing = REQUIRED.filter((t) => !code.includes(t));
  if (missing.length) {
    console.error("[build_patch_v2_obs_ra_agg] MISSING required tokens:");
    for (const m of missing) console.error("  - " + JSON.stringify(m));
    process.exit(2);
  }
  const forbidden = FORBIDDEN.filter((t) => code.includes(t));
  if (forbidden.length) {
    console.error("[build_patch_v2_obs_ra_agg] FORBIDDEN tokens present:");
    for (const f of forbidden) console.error("  - " + JSON.stringify(f));
    process.exit(3);
  }
}

assertGuards(NEW_JSCODE);

// -----------------------------------------------------------------------------
// Emit single-key params payload. n8n-patch.mjs patch-node consumes this as
// { "jsCode": "<text>" } and overwrites exactly parameters.jsCode on target.
// -----------------------------------------------------------------------------
const payload = { jsCode: NEW_JSCODE };
const json = JSON.stringify(payload, null, 2) + "\n";
writeFileSync(OUT, json);

const sha = createHash("sha256").update(json).digest("hex");
console.log("[build_patch_v2_obs_ra_agg] wrote " + OUT);
console.log("[build_patch_v2_obs_ra_agg] sha256(params.json) = " + sha);
console.log("[build_patch_v2_obs_ra_agg] jsCode bytes = " + NEW_JSCODE.length);

// -----------------------------------------------------------------------------
// Unified-diff hint (pre → post) for human review. Authoritative diff lives
// in V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_DESIGN_FREEZE.md.
// -----------------------------------------------------------------------------
console.log(
  "\n--- unified-diff hint (success branch only) ---\n" +
    "-      domain_writes_performed: !!src.domain_writes_performed,\n" +
    "+      domain_writes_performed: false,\n" +
    "(module_error branch already hardcodes `domain_writes_performed: false` — unchanged)"
);
