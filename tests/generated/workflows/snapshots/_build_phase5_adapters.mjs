#!/usr/bin/env node
// Phase-5 adapter patches — add connector-layer transform nodes so each activated
// edge can carry its envelope cleanly between source WF output and target WF input.
//
// Findings that drove this (see tests/generated/edges/PHASE_5_EDGE_RUN_RECORD.md):
//  Edge 5 DI→ME : DI emits grouped ready_groups; ME needs per-step dispatcher_input.step.
//  Edge 6 ME→RA : ME emits single module_result; RA needs module_batch aggregation_input.
//  Edge 7 RA→SU : RA emits aggregated_result; SU requires idempotency_key.
//  Edge 9 RC→MO : RC_Prepare_MO_01_Handoff writes a bespoke shape / is gated off; MO
//                 needs the full RC_Build_Output_Envelope output with response_text alias.
//
// All four transforms are added as Code nodes between the source's terminal node
// and the Execute-Workflow subcall. This keeps the invariant from CONNECTOR_ACTIVATION
// (source terminal → adapter → connector → target trigger) and does not modify any
// target workflow.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress','saveManualExecutions','saveDataErrorExecution',
  'saveDataSuccessExecution','executionTimeout','errorWorkflow','timezone',
  'executionOrder','callerPolicy','callerIds','timeSavedPerExecution','availableInMCP'
]);
const filterSettings = (s = {}) =>
  Object.fromEntries(Object.entries(s).filter(([k]) => SETTINGS_WHITELIST.has(k)));
const toPutBody = (w) => ({ name: w.name, nodes: w.nodes, connections: w.connections, settings: filterSettings(w.settings) });
const readWF = (name) => JSON.parse(readFileSync(join(__dirname, `${name}_phase5_pre.json`), 'utf8'));
const writePut = (name, body) => writeFileSync(join(__dirname, `${name}_phase5_put.json`), JSON.stringify(body, null, 2), 'utf8');

// Re-wire helper: replace all references that point to `oldTarget` (with index 0) in
// source node's main[0] connections with a link to `newTarget` instead. Returns true if any change.
const replaceConnection = (conns, fromNode, oldTarget, newTarget) => {
  const block = conns[fromNode];
  if (!block || !block.main) return false;
  let changed = false;
  for (const slot of block.main) {
    for (const link of slot) {
      if (link.node === oldTarget) { link.node = newTarget; changed = true; }
    }
  }
  return changed;
};

// ── Patch DI-01 ─────────────────────────────────────────────────────────
{
  const w = readWF('WF-DI-01');
  const newNodeName = 'DI_Build_ME_Envelopes';
  if (w.nodes.some(n => n.name === newNodeName)) throw new Error('DI_Build_ME_Envelopes already present');
  const terminal = w.nodes.find(n => n.name === 'DI_Return_Result');
  if (!terminal) throw new Error('DI_Return_Result missing');
  const subcall = w.nodes.find(n => n.name === 'DI_Dispatch_To_ME_01_SUBCALL');
  if (!subcall) throw new Error('DI_Dispatch_To_ME_01_SUBCALL missing');

  // Insert adapter between DI_Return_Result → DI_Dispatch_To_ME_01_SUBCALL.
  w.nodes.push({
    id: 'di-build-me-envelopes',
    name: newNodeName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [terminal.position[0] + 260, terminal.position[1] + 140],
    parameters: {
      language: 'javaScript',
      jsCode: `// Split DI dispatch envelope into per-step envelopes shaped for ME-01 input.
const src = $json;
if (!src || src.status_kind !== 'success' || src.result_type !== 'dispatch') {
  // Propagate errors unchanged so ME-01 can reject them cleanly.
  return [{ json: src }];
}
const p = src.payload || {};
const guard = p.dispatch_guard || {};
const out = [];
for (const group of (p.ready_groups || [])) {
  for (const req of (group.module_requests || [])) {
    const step = {
      step_id: req.step_id,
      module_name: req.module_name,
      purpose: req.purpose,
      inputs: req.inputs || {},
      execution_mode: group.execution_mode || 'sequential',
      depends_on: req.depends_on || [],
      expected_outputs: req.expected_outputs || [],
      replan_if: req.replan_if || [],
      failure_policy: req.failure_policy || 'continue_with_notice',
      status: 'pending'
    };
    out.push({ json: {
      status_kind: 'success',
      result_type: 'dispatch',
      execution_context_id: p.execution_id,
      thread_id: p.thread_id,
      tenant_id: p.tenant_id,
      dispatcher_input: {
        dispatch_allowed: true,
        module_execution_started: false,
        response_generation_allowed: false,
        domain_writes_performed: false,
        step
      },
      idempotency_key: req.idempotency_key || \`dispatch:\${p.dispatch_id}:\${step.step_id}\`
    }});
  }
}
if (!out.length) {
  return [{ json: { status_kind: 'failed', result_type: 'error', module_name: 'dispatcher', error: { code: 'EMPTY_DISPATCH', message: 'No ready steps to dispatch.', missing_fields: [] } } }];
}
return out;`
    }
  });
  // Rewire connections
  replaceConnection(w.connections, 'DI_Return_Result', 'DI_Dispatch_To_ME_01_SUBCALL', newNodeName);
  w.connections[newNodeName] = { main: [[{ node: 'DI_Dispatch_To_ME_01_SUBCALL', type: 'main', index: 0 }]] };
  // Change subcall mode to "each" so each split item fires its own ME call
  subcall.parameters = { ...(subcall.parameters || {}), mode: 'each' };
  writePut('WF-DI-01', toPutBody(w));
  console.log('DI-01: added', newNodeName, '+ subcall.mode=each');
}

// ── Patch ME-01 ─────────────────────────────────────────────────────────
{
  const w = readWF('WF-ME-01');
  const newNodeName = 'ME_Build_RA_Envelope';
  if (w.nodes.some(n => n.name === newNodeName)) throw new Error('ME_Build_RA_Envelope already present');
  const terminal = w.nodes.find(n => n.name === 'ME_Return_Result');
  if (!terminal) throw new Error('ME_Return_Result missing');
  const subcall = w.nodes.find(n => n.name === 'ME_Dispatch_To_RA_01_SUBCALL');
  if (!subcall) throw new Error('ME_Dispatch_To_RA_01_SUBCALL missing');
  w.nodes.push({
    id: 'me-build-ra-envelope',
    name: newNodeName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [terminal.position[0] + 260, terminal.position[1] + 140],
    parameters: {
      language: 'javaScript',
      jsCode: `// Wrap ME module_result into a single-result module_batch envelope for RA-01.
const src = $json;
if (!src || src.status_kind !== 'success' || src.result_type !== 'module_result') {
  return [{ json: src }];
}
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
    domain_writes_performed: !!src.domain_writes_performed,
    module_results: [mr],
    expected_step_ids: [mr.step_id]
  }
}}];`
    }
  });
  replaceConnection(w.connections, 'ME_Return_Result', 'ME_Dispatch_To_RA_01_SUBCALL', newNodeName);
  w.connections[newNodeName] = { main: [[{ node: 'ME_Dispatch_To_RA_01_SUBCALL', type: 'main', index: 0 }]] };
  writePut('WF-ME-01', toPutBody(w));
  console.log('ME-01: added', newNodeName);
}

// ── Patch RA-01 ─────────────────────────────────────────────────────────
{
  const w = readWF('WF-RA-01');
  const newNodeName = 'RA_Build_SU_Envelope';
  if (w.nodes.some(n => n.name === newNodeName)) throw new Error('RA_Build_SU_Envelope already present');
  const terminal = w.nodes.find(n => n.name === 'RA_Build_Downstream_Envelope');
  if (!terminal) throw new Error('RA_Build_Downstream_Envelope missing');
  const subcall = w.nodes.find(n => n.name === 'RA_Dispatch_To_SU_01_SUBCALL');
  if (!subcall) throw new Error('RA_Dispatch_To_SU_01_SUBCALL missing');
  w.nodes.push({
    id: 'ra-build-su-envelope',
    name: newNodeName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [terminal.position[0] + 260, terminal.position[1] + 140],
    parameters: {
      language: 'javaScript',
      jsCode: `// Inject idempotency_key (required by SU, not emitted by RA) before SU subcall.
const src = $json;
if (!src || src.status_kind !== 'success' || src.result_type !== 'aggregated_result') {
  return [{ json: src }];
}
const key = src.idempotency_key && typeof src.idempotency_key === 'string'
  ? src.idempotency_key
  : \`ra-to-su:\${src.execution_context_id}:v1\`;
return [{ json: { ...src, idempotency_key: key } }];`
    }
  });
  replaceConnection(w.connections, 'RA_Build_Downstream_Envelope', 'RA_Dispatch_To_SU_01_SUBCALL', newNodeName);
  w.connections[newNodeName] = { main: [[{ node: 'RA_Dispatch_To_SU_01_SUBCALL', type: 'main', index: 0 }]] };
  writePut('WF-RA-01', toPutBody(w));
  console.log('RA-01: added', newNodeName);
}

// ── Patch RC-01 ─────────────────────────────────────────────────────────
{
  const w = readWF('WF-RC-01');
  const handoff = w.nodes.find(n => n.name === 'RC_Prepare_MO_01_Handoff');
  if (!handoff) throw new Error('RC_Prepare_MO_01_Handoff missing');
  // Rewrite the handoff node so it produces a valid MO envelope, including the
  // response_text alias that MO_Validate_Input expects.
  handoff.parameters = {
    language: 'javaScript',
    jsCode: `// Transform RC_Build_Output_Envelope output into MO-01's expected envelope.
// Alias composed_response.final_response_text → composed_response.response_text
// (MO's validator keys on response_text; see PHASE_5_EDGE_RUN_RECORD.md §4.3).
const src = $json;
if (!src || src.status_kind !== 'success' || src.result_type !== 'composed_response') {
  return [];
}
const cr = { ...(src.composed_response || {}) };
if (!cr.response_text && cr.final_response_text) cr.response_text = cr.final_response_text;
return [{ json: {
  status_kind: 'success',
  result_type: 'composed_response',
  execution_context_id: src.execution_context_id,
  thread_id: src.thread_id,
  tenant_id: src.tenant_id,
  composed_response: cr,
  output_gateway_allowed: src.output_gateway_allowed === true,
  allowed_next_stage: src.allowed_next_stage || 'MESSAGE_OUT',
  response_generation_allowed: src.response_generation_allowed === true,
  idempotency_key: src.idempotency_key
}}];`
  };
  // Rewire: RC_Build_Output_Envelope → RC_Prepare_MO_01_Handoff (already wired)
  // RC_Prepare_MO_01_Handoff → RC_Dispatch_To_MO_01_SUBCALL (already wired)
  writePut('WF-RC-01', toPutBody(w));
  console.log('RC-01: rewrote RC_Prepare_MO_01_Handoff');
}

console.log('ALL 4 PHASE-5 ADAPTER PATCHES BUILT');
