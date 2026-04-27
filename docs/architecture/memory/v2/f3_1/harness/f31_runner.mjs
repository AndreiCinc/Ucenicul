#!/usr/bin/env node
// f31_runner.mjs — F3.1 single-case driver.
//
// Commands:
//   emit    <case_id>                 — print MCP execute_workflow inputs + DB check queries
//   verdict <raw_artifact_path>       — apply oracle to a raw artifact, write verdict
//
// The runner does NOT call MCP or Postgres. It emits payloads that the
// operating session runs; the session writes the raw artifact back; the runner
// then applies the oracle. This preserves determinism and keeps the harness
// unit-testable without live infra.

import fs from 'node:fs';
import path from 'node:path';
import { oracle } from './f31_oracle.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MATRIX_PATH = path.resolve(HERE, '..', 'matrix', 'f31_cases_150.json');
const ART_DIR = path.resolve(HERE, '..', 'artifacts', 'runtime');

const CONST = {
  workflow_id: 'uq26nh1grIpnHju0',
  version_id: 'b8e2f194-0263-46d9-8306-1534cc7c31fe',
  tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  execution_context_id: 'd4f82a41-01cd-4fb7-9d70-573557348e74',
  default_source_thread_id: '77777777-0000-0000-0000-000000000007',
  default_entity_id: 'eeeeeeee-0000-0000-0000-000000000001',
  idem_prefix: 'mem-f31',
};

function loadMatrix() {
  return JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
}

function findCase(matrix, case_id) {
  const c = matrix.cases.find(x => x.case_id === case_id);
  if (!c) throw new Error(`case not found: ${case_id}`);
  return c;
}

function buildIdempotencyKey(c) {
  return `${CONST.idem_prefix}-${c.case_id}`;
}

// ---- Input-contract adapter --------------------------------------------
// WF-ME-01 is a chat-mode workflow; chatInput is a stringified JSON with a
// dispatcher_input envelope. Action inputs are flat-inlined into step.inputs
// (observed from F2 raw artifact exec_c_q1_1459.raw.json).
function flattenSearchInputs(inputs) {
  const out = { action: 'search_memory' };
  if (inputs.query != null) out.query = inputs.query;
  if (inputs.filters) {
    if (inputs.filters.memory_type) out.memory_type = inputs.filters.memory_type;
    if (inputs.filters.statuses)    out.statuses    = inputs.filters.statuses;
  }
  if (inputs.limit != null) out.limit = inputs.limit;
  return out;
}

function flattenRecallInputs(inputs) {
  const out = { action: 'recall_memory' };
  if (inputs.filters) {
    if (inputs.filters.source_thread_id) out.source_thread_id = inputs.filters.source_thread_id;
    if (inputs.filters.entity_id)        out.entity_id        = inputs.filters.entity_id;
    if (inputs.filters.category)         out.category         = inputs.filters.category;
    if (inputs.filters.memory_type)      out.memory_type      = inputs.filters.memory_type;
  }
  if (inputs.limit != null) out.limit = inputs.limit;
  return out;
}

function flattenPromoteInputs(inputs) {
  return {
    action: 'promote_memory',
    memory_id: inputs.memory_id,
    promotion_target: 'long_term',
    user_confirmed: inputs.user_confirmed,
    evidence_validated: inputs.evidence_validated,
  };
}

function flattenSupersedeInputs(inputs) {
  // F31-FIX-009: workflow requires supersedes_memory_id + source_thread_id, not memory_id
  return {
    action: 'supersede_memory',
    supersedes_memory_id: inputs.memory_id,
    source_thread_id: CONST.default_source_thread_id,
    content: inputs.replacement?.content,
    category: inputs.replacement?.category,
    memory_type: inputs.replacement?.memory_type,
    tier: inputs.replacement?.tier,
  };
}

function flattenInputsByAction(action, inputs) {
  switch (action) {
    case 'search_memory':    return flattenSearchInputs(inputs);
    case 'recall_memory':    return flattenRecallInputs(inputs);
    case 'promote_memory':   return flattenPromoteInputs(inputs);
    case 'supersede_memory': return flattenSupersedeInputs(inputs);
    case 'store_memory':     return { action: 'store_memory', ...inputs };
    default: throw new Error(`unsupported action ${action}`);
  }
}

function buildChatInput({ stepId, action, flatInputs, purpose }) {
  const envelope = {
    status_kind: 'success',
    result_type: 'dispatch',
    execution_context_id: CONST.execution_context_id,
    thread_id: CONST.default_source_thread_id,
    tenant_id: CONST.tenant_id,
    idempotency_key: stepId,
    dispatcher_input: {
      dispatch_allowed: true,
      module_execution_started: false,
      response_generation_allowed: false,
      domain_writes_performed: false,
      step: {
        step_id: stepId,
        module_name: 'memory_module',
        purpose,
        execution_mode: 'execute',
        inputs: flatInputs,
      },
    },
  };
  return JSON.stringify(envelope);
}

function buildStoreSeedPayload(seedCaseId, params) {
  const content = `F3.1 seed ${seedCaseId} — ${params.category}/${params.tier}`;
  const stepId = `${CONST.idem_prefix}-${seedCaseId}`;
  const flatInputs = {
    action: 'store_memory',
    memory_type: params.memory_type || 'fact',
    category: params.category,
    content,
    tier: params.tier,
    user_confirmed: params.user_confirmed ?? false,
    evidence_validated: false,
    source_thread_id: CONST.default_source_thread_id,
    entity_id: CONST.default_entity_id,
    corroboration_count: params.corroboration_count ?? 1,
  };
  const chatInput = buildChatInput({ stepId, action: 'store_memory', flatInputs, purpose: `F3.1 seed ${seedCaseId}` });
  return {
    workflowId: CONST.workflow_id,
    inputs: { type: 'chat', chatInput },
  };
}

function buildPayloadForCase(c) {
  const stepId = `${CONST.idem_prefix}-${c.case_id}`;
  const flatInputs = flattenInputsByAction(c.action, c.inputs);
  const chatInput = buildChatInput({ stepId, action: c.action, flatInputs, purpose: `F3.1 ${c.family} ${c.case_id}` });
  return {
    workflowId: CONST.workflow_id,
    inputs: { type: 'chat', chatInput },
  };
}

function buildDbChecks(c) {
  // Returns { pre: string[], post: string[] } of SQL check queries to run.
  const pre = [];
  const post = [];

  switch (c.family) {
    case 'search_lexical_fallback':
      // Read-only. Only need MAX(updated_at) invariant.
      pre.push(`SELECT MAX(updated_at) AS pre_max FROM memory_items WHERE tenant_id = '${CONST.tenant_id}';`);
      post.push(`SELECT MAX(updated_at) AS post_max FROM memory_items WHERE tenant_id = '${CONST.tenant_id}';`);
      break;
    case 'recall_intersection':
      pre.push(`SELECT MAX(updated_at) AS pre_max FROM memory_items WHERE tenant_id = '${CONST.tenant_id}';`);
      post.push(`SELECT MAX(updated_at) AS post_max FROM memory_items WHERE tenant_id = '${CONST.tenant_id}';`);
      break;
    case 'promote_denial_vocabulary': {
      const seedId = c.preconditions.seed_cases[0];
      pre.push(`SELECT id, tier, status, user_confirmed, evidence_validated, corroboration_count, last_reconfirmed_at FROM memory_items WHERE idempotency_key = 'store_memory:${CONST.execution_context_id}:${CONST.idem_prefix}-${seedId}';`);
      post.push(`SELECT id, tier, status, user_confirmed, evidence_validated, corroboration_count, last_reconfirmed_at FROM memory_items WHERE idempotency_key = 'store_memory:${CONST.execution_context_id}:${CONST.idem_prefix}-${seedId}';`);
      break;
    }
    case 'supersede_idempotency': {
      const seedId = c.preconditions.seed_cases[0];
      if (seedId) {
        pre.push(`SELECT id, tier, status FROM memory_items WHERE idempotency_key = 'store_memory:${CONST.execution_context_id}:${CONST.idem_prefix}-${seedId}';`);
        post.push(`SELECT id, tier, status, supersedes_memory_id FROM memory_items WHERE supersedes_memory_id IN (SELECT id FROM memory_items WHERE idempotency_key = 'store_memory:${CONST.execution_context_id}:${CONST.idem_prefix}-${seedId}') OR idempotency_key = 'store_memory:${CONST.execution_context_id}:${CONST.idem_prefix}-${seedId}' ORDER BY created_at;`);
      } else {
        pre.push(`SELECT COUNT(*) AS n FROM memory_items WHERE tenant_id = '${CONST.tenant_id}';`);
        post.push(`SELECT COUNT(*) AS n FROM memory_items WHERE tenant_id = '${CONST.tenant_id}';`);
      }
      break;
    }
  }
  return { pre, post };
}

function cmdEmit(caseId) {
  const matrix = loadMatrix();
  const c = findCase(matrix, caseId);
  const out = {
    case_id: c.case_id,
    family: c.family,
    action: c.action,
    notes: c.notes,
    idempotency_key: buildIdempotencyKey(c),
    mcp_execute_workflow_payload: buildPayloadForCase(c),
    seed_store_payloads: (c.preconditions.seed_cases || []).map(seedId =>
      buildStoreSeedPayload(seedId, c.preconditions.seed_params || {})
    ),
    db_checks: buildDbChecks(c),
    expected_result_envelope: c.expected_result_envelope,
    expected_runtime_status: c.expected_runtime_status,
    expected_error_code: c.expected_error_code,
    expected_db_effect: c.expected_db_effect,
  };
  console.log(JSON.stringify(out, null, 2));
}

function cmdVerdict(artifactPath) {
  const matrix = loadMatrix();
  const raw = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const c = findCase(matrix, raw.case_id);
  const verdict = oracle(c, raw);
  const outPath = path.join(ART_DIR, `verdict_${c.case_id}.json`);
  fs.mkdirSync(ART_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ ...verdict, artifact: path.basename(artifactPath), ts: new Date().toISOString() }, null, 2));

  // Append to family index.
  const idxPath = path.join(ART_DIR, `family_${c.family}_index.json`);
  let idx = { family: c.family, verdicts: [] };
  if (fs.existsSync(idxPath)) idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  // Replace any prior verdict for the same case_id.
  idx.verdicts = idx.verdicts.filter(v => v.case_id !== c.case_id);
  idx.verdicts.push({ case_id: c.case_id, verdict: verdict.verdict, bucket: verdict.bucket, reason: verdict.reason, ts: new Date().toISOString() });
  idx.verdicts.sort((a, b) => a.case_id.localeCompare(b.case_id));
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
  console.log(JSON.stringify(verdict, null, 2));
}

const [, , cmd, arg] = process.argv;
if (cmd === 'emit' && arg) cmdEmit(arg);
else if (cmd === 'verdict' && arg) cmdVerdict(arg);
else {
  console.error('usage: f31_runner.mjs emit <case_id>\n       f31_runner.mjs verdict <raw_artifact_path>');
  process.exit(1);
}
