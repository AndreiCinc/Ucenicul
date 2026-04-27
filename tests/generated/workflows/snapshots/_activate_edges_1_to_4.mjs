#!/usr/bin/env node
// Phase-8 edges 1-4 activation.
//
// Produces PUT bodies for TR, EC, OR (twice), PL (twice), DI. Apply order (each
// via `n8n-patch.mjs replace <id> <file.json> --reactivate`) is:
//   1. WF-TR-01   ← WF-TR-01_phase8_put.json      (edge 1 source: add adapter + dispatch to EC)
//   2. WF-OR-01   ← WF-OR-01_phase8_put.json      (edge 2 target refactor: add OR_Input trigger)
//   3. WF-EC-01   ← WF-EC-01_phase8_put.json      (edge 2 source: add dispatch to OR, no adapter)
//   4. WF-PL-01   ← WF-PL-01_phase8_put.json      (edge 3 target refactor: add PL_Input trigger)
//   5. WF-OR-01   ← WF-OR-01_phase8b_put.json     (edge 3 source: add dispatch to PL, no adapter)
//   6. WF-DI-01   ← WF-DI-01_phase8_put.json      (edge 4 target refactor: add DI_Input trigger)
//   7. WF-PL-01   ← WF-PL-01_phase8b_put.json     (edge 4 source: add adapter + dispatch to DI)
//
// All new nodes are of the canonical Phase-4-pattern:
//   - {SOURCE}_Build_{TARGET}_Envelope  — code node that reshapes the terminal
//     output when field renames / injection are required
//   - {SOURCE}_Dispatch_To_{TARGET}_01_SUBCALL — n8n-nodes-base.executeWorkflow
//     (typeVersion 1.2, mode=once, waitForSubWorkflow=true)
//   - {TARGET}_Input — n8n-nodes-base.executeWorkflowTrigger (typeVersion 1.1)
//
// Target-refactor policy (OR, PL, DI): add {X}_Input executeWorkflowTrigger
// wired to the existing entry validator, preserving the existing chat/manual
// trigger entries so standalone behaviour is unchanged.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress','saveManualExecutions','saveDataErrorExecution',
  'saveDataSuccessExecution','executionTimeout','errorWorkflow','timezone',
  'executionOrder','callerPolicy','callerIds','timeSavedPerExecution','availableInMCP'
]);
const filterSettings = (s={}) =>
  Object.fromEntries(Object.entries(s).filter(([k]) => SETTINGS_WHITELIST.has(k)));
const toPutBody = (w) => ({
  name: w.name, nodes: w.nodes, connections: w.connections, settings: filterSettings(w.settings)
});
const read = (f) => JSON.parse(readFileSync(join(__dirname, f), 'utf8'));
const write = (f, w) => {
  writeFileSync(join(__dirname, f), JSON.stringify(toPutBody(w), null, 2), 'utf8');
  console.log('wrote', f);
};

// Workflow IDs (from execution_context_id row dump 2026-04-20)
const WF = {
  TR: 'wI8hpSROxQI0zC9f',
  EC: 'v9jih4jqeXpOJOiH',
  OR: 'KhGmNpi0ZDmrnz8W',
  PL: 'RwToPLa1ErHl2tUi',
  DI: 'abqYINcXr3JAhGGk',
};

// Helper — push a Code node with given jsCode
const codeNode = (id, name, pos, jsCode) => ({
  id, name, type: 'n8n-nodes-base.code', typeVersion: 2,
  position: pos, parameters: { jsCode }
});

// Helper — push an executeWorkflow dispatch node
const dispatchNode = (id, name, pos, targetId, targetLabel) => ({
  id, name, type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2,
  position: pos,
  parameters: {
    workflowId: { __rl: true, value: targetId, mode: 'list', cachedResultName: targetLabel },
    mode: 'once',
    options: { waitForSubWorkflow: true }
  }
});

// Helper — push an executeWorkflowTrigger entry node.
// typeVersion: 1 is required — 1.1+ introduces `workflowInputs` which is
// marked "Missing or invalid required parameters" when absent. v1 accepts
// empty parameters and passes through the caller's payload as $json.
const entryTriggerNode = (id, name, pos) => ({
  id, name, type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1,
  position: pos, parameters: {}
});

// ──────────────────────────────────────────────────────────────────────
// Edge 1: TR → EC  (connector + adapter on TR-01)
// ──────────────────────────────────────────────────────────────────────
{
  const w = read('WF-TR-01_phase8_pre.json');
  const term = w.nodes.find(n => n.name === 'TR_Return_Result');
  if (!term) throw new Error('TR_Return_Result missing');

  const adapterName = 'TR_Build_EC_Envelope';
  const dispatchName = 'TR_Dispatch_To_EC_01_SUBCALL';
  if (w.nodes.some(n => n.name === adapterName))  throw new Error(`${adapterName} already present`);
  if (w.nodes.some(n => n.name === dispatchName)) throw new Error(`${dispatchName} already present`);

  // Adapter: rename fields from flat TR output into the flat EC_Validate_Input shape.
  //   resolved_thread_id → thread_id
  //   message_id         → trigger_message_id
  //   resolution_action  → resolution_method   (with fallback to .decision)
  //   timestamp          → resolved_at
  //   tenant_id          → tenant_id (identity)
  // Synthesize idempotency_key = "tr-to-ec:{tenant_id}:{message_id}:v1"
  // Propagate errors unchanged: if TR emitted status_kind='failed' / error.*,
  // just pass through — EC will then fail validation and emit EC_Return_Error.
  w.nodes.push(codeNode(
    'tr-build-ec-envelope',
    adapterName,
    [term.position[0] + 260, term.position[1] + 140],
    `// TR_Build_EC_Envelope — Phase 8 edge-1 adapter.
// Reshapes TR_Return_Result (flat) into EC_Validate_Input (flat) shape.
const src = $json || {};
// If TR already surfaced an error, bail out and propagate unchanged.
if (src.error || src.status === 'failed' || src.status_kind === 'failed') {
  return [{ json: src }];
}
const tenant_id = src.tenant_id;
const thread_id = src.resolved_thread_id;
const trigger_message_id = src.message_id;
const resolution_method = src.resolution_action || src.decision || null;
const resolved_at = src.timestamp || null;
if (!tenant_id || !thread_id || !trigger_message_id) {
  return [{ json: {
    status_kind: 'failed',
    result_type: 'error',
    module_name: 'tr_to_ec_adapter',
    error: {
      code: 'MISSING_REQUIRED_IDS',
      message: 'TR result lacks tenant_id, resolved_thread_id, or message_id.',
      missing_fields: ['tenant_id','resolved_thread_id','message_id'].filter(f => !src[f])
    }
  } }];
}
const idempotency_key = \`tr-to-ec:\${tenant_id}:\${trigger_message_id}:v1\`;
return [{ json: {
  tenant_id, thread_id, trigger_message_id,
  resolution_method, resolved_at, idempotency_key
} }];`
  ));
  w.nodes.push(dispatchNode(
    'tr-dispatch-to-ec-01',
    dispatchName,
    [term.position[0] + 520, term.position[1] + 140],
    WF.EC, 'WF-EC-01'
  ));

  // Wire TR_Return_Result.main[0] → adapter → dispatch (terminal)
  w.connections[term.name] = { main: [[{ node: adapterName, type: 'main', index: 0 }]] };
  w.connections[adapterName] = { main: [[{ node: dispatchName, type: 'main', index: 0 }]] };
  w.connections[dispatchName] = { main: [[]] };

  write('WF-TR-01_phase8_put.json', w);
}

// ──────────────────────────────────────────────────────────────────────
// Edge 2 (target refactor): add OR_Input executeWorkflowTrigger wired to
// OR_Validate_EC_Result.  No changes to standalone triggers.
// ──────────────────────────────────────────────────────────────────────
{
  const w = read('WF-OR-01_phase8_pre.json');
  const entry = w.nodes.find(n => n.name === 'OR_Validate_EC_Result');
  if (!entry) throw new Error('OR_Validate_EC_Result missing');
  if (w.nodes.some(n => n.name === 'OR_Input')) throw new Error('OR_Input already present');

  w.nodes.push(entryTriggerNode(
    'or-input-subtrigger', 'OR_Input',
    [entry.position[0] - 260, entry.position[1] + 140]
  ));
  // Route OR_Input → OR_Validate_EC_Result (fan-in with existing triggers)
  w.connections['OR_Input'] = { main: [[{ node: 'OR_Validate_EC_Result', type: 'main', index: 0 }]] };

  write('WF-OR-01_phase8_put.json', w);
}

// ──────────────────────────────────────────────────────────────────────
// Edge 2 (connector on EC-01): EC_Return_Result → dispatch to OR-01.
// EC flat output already matches OR's flat-branch validator — no adapter.
// ──────────────────────────────────────────────────────────────────────
{
  const w = read('WF-EC-01_phase8_pre.json');
  const term = w.nodes.find(n => n.name === 'EC_Return_Result');
  if (!term) throw new Error('EC_Return_Result missing');
  const dispatchName = 'EC_Dispatch_To_OR_01_SUBCALL';
  if (w.nodes.some(n => n.name === dispatchName)) throw new Error(`${dispatchName} already present`);

  w.nodes.push(dispatchNode(
    'ec-dispatch-to-or-01', dispatchName,
    [term.position[0] + 260, term.position[1]],
    WF.OR, 'WF-OR-01'
  ));
  // Rewire: EC_Return_Result → EC_Dispatch_To_OR_01_SUBCALL (terminal)
  w.connections[term.name] = { main: [[{ node: dispatchName, type: 'main', index: 0 }]] };
  w.connections[dispatchName] = { main: [[]] };

  write('WF-EC-01_phase8_put.json', w);
}

// ──────────────────────────────────────────────────────────────────────
// Edge 3 (target refactor): add PL_Input executeWorkflowTrigger wired to
// PL_Validate_OR_Handoff.
// ──────────────────────────────────────────────────────────────────────
{
  const w = read('WF-PL-01_phase8_pre.json');
  const entry = w.nodes.find(n => n.name === 'PL_Validate_OR_Handoff');
  if (!entry) throw new Error('PL_Validate_OR_Handoff missing');
  if (w.nodes.some(n => n.name === 'PL_Input')) throw new Error('PL_Input already present');

  w.nodes.push(entryTriggerNode(
    'pl-input-subtrigger', 'PL_Input',
    [entry.position[0] - 260, entry.position[1] + 140]
  ));
  w.connections['PL_Input'] = { main: [[{ node: 'PL_Validate_OR_Handoff', type: 'main', index: 0 }]] };

  write('WF-PL-01_phase8_put.json', w);
}

// ──────────────────────────────────────────────────────────────────────
// Edge 3 (connector on OR-01): OR_Return_Result → dispatch to PL-01.
// OR wrapped handoff already matches PL validator — no adapter.
// NOTE: This reads the OR PUT body produced above (with OR_Input added) so
// the two OR patches compose.
// ──────────────────────────────────────────────────────────────────────
{
  const w = read('WF-OR-01_phase8_put.json');
  const term = w.nodes.find(n => n.name === 'OR_Return_Result');
  if (!term) throw new Error('OR_Return_Result missing');
  const dispatchName = 'OR_Dispatch_To_PL_01_SUBCALL';
  if (w.nodes.some(n => n.name === dispatchName)) throw new Error(`${dispatchName} already present`);

  w.nodes.push(dispatchNode(
    'or-dispatch-to-pl-01', dispatchName,
    [term.position[0] + 260, term.position[1]],
    WF.PL, 'WF-PL-01'
  ));
  w.connections[term.name] = { main: [[{ node: dispatchName, type: 'main', index: 0 }]] };
  w.connections[dispatchName] = { main: [[]] };

  write('WF-OR-01_phase8b_put.json', w);
}

// ──────────────────────────────────────────────────────────────────────
// Edge 4 (target refactor): add DI_Input executeWorkflowTrigger wired to
// DI_Validate_Plan_Result. We re-fetch DI live (not from the stale
// WF-DI-01_post_phase4.json snapshot) to preserve the Phase-5 downstream
// chain that DI already has to ME-01.
// ──────────────────────────────────────────────────────────────────────
{
  // Fetched via curl immediately before running this step and saved to:
  //   WF-DI-01_phase8_pre.json
  const w = read('WF-DI-01_phase8_pre.json');
  const entry = w.nodes.find(n => n.name === 'DI_Validate_Plan_Result');
  if (!entry) throw new Error('DI_Validate_Plan_Result missing');
  if (w.nodes.some(n => n.name === 'DI_Input')) throw new Error('DI_Input already present');

  w.nodes.push(entryTriggerNode(
    'di-input-subtrigger', 'DI_Input',
    [entry.position[0] - 260, entry.position[1] + 140]
  ));
  w.connections['DI_Input'] = { main: [[{ node: 'DI_Validate_Plan_Result', type: 'main', index: 0 }]] };

  write('WF-DI-01_phase8_put.json', w);
}

// ──────────────────────────────────────────────────────────────────────
// Edge 4 (connector + adapter on PL-01): PL_Return_Result → adapter
// (re-inject tenant_id, trigger_message_id, idempotency_key into the plan
// payload using PL_Extract_Planning_Input state) → dispatch to DI-01.
//
// This reads the PL PUT body produced above (with PL_Input added).
// ──────────────────────────────────────────────────────────────────────
{
  const w = read('WF-PL-01_phase8_put.json');
  const term = w.nodes.find(n => n.name === 'PL_Return_Result');
  if (!term) throw new Error('PL_Return_Result missing');
  const adapterName = 'PL_Build_DI_Envelope';
  const dispatchName = 'PL_Dispatch_To_DI_01_SUBCALL';
  if (w.nodes.some(n => n.name === adapterName))  throw new Error(`${adapterName} already present`);
  if (w.nodes.some(n => n.name === dispatchName)) throw new Error(`${dispatchName} already present`);

  // Adapter: PL_Generate_Plan emits the plan envelope WITHOUT tenant_id,
  // trigger_message_id, idempotency_key in the payload. DI_Validate_Plan_Result
  // requires them. Re-inject them from PL_Extract_Planning_Input (validated
  // OR handoff values that PL already has in scope).
  w.nodes.push(codeNode(
    'pl-build-di-envelope',
    adapterName,
    [term.position[0] + 260, term.position[1] + 140],
    `// PL_Build_DI_Envelope — Phase 8 edge-4 adapter.
// Re-injects tenant_id, trigger_message_id, idempotency_key into the plan
// payload so DI_Validate_Plan_Result accepts it without a target refactor on
// PL's plan-generation layer.
//
// Uses $('PL_Extract_Planning_Input') to recover the values PL already
// validated from the OR handoff.

const src = $json || {};
if (!src.status_kind || src.status_kind !== 'success' || src.result_type !== 'plan') {
  // Pass errors through unchanged — DI will fail validation cleanly.
  return [{ json: src }];
}
const ctx = (() => {
  try { return ($('PL_Extract_Planning_Input').first() || {}).json || {}; }
  catch (e) { return {}; }
})();
const payload = Object.assign({}, src.payload || {});
payload.tenant_id         = payload.tenant_id         || ctx.tenant_id;
payload.trigger_message_id = payload.trigger_message_id || ctx.trigger_message_id;
payload.idempotency_key   = payload.idempotency_key   || ctx.idempotency_key;
// DI also expects payload.primary_intent, plan_id, goal, steps, dispatcher_input
// — all of which PL_Generate_Plan already emits, so just forward.
return [{ json: {
  status_kind: src.status_kind,
  result_type: src.result_type,
  module_name: src.module_name || 'plan_generation',
  payload
} }];`
  ));
  w.nodes.push(dispatchNode(
    'pl-dispatch-to-di-01',
    dispatchName,
    [term.position[0] + 520, term.position[1] + 140],
    WF.DI, 'WF-DI-01'
  ));
  w.connections[term.name] = { main: [[{ node: adapterName, type: 'main', index: 0 }]] };
  w.connections[adapterName] = { main: [[{ node: dispatchName, type: 'main', index: 0 }]] };
  w.connections[dispatchName] = { main: [[]] };

  write('WF-PL-01_phase8b_put.json', w);
}

console.log('\n✅ All phase-8 put bodies generated.');
