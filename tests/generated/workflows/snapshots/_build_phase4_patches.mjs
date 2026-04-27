#!/usr/bin/env node
// Build Phase-4 PUT-ready payloads for the 4 safe edges.
// Input : <WF>_pre_phase4.json  (raw GET dumps; n8n-patch get writes {name, nodes, connections, settings,...} but we use PUT whitelist)
// Output: <WF>_post_phase4_put.json  (toPutBody-shape: only {name, nodes, connections, settings})

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

const toPutBody = (w) => ({
  name: w.name,
  nodes: w.nodes,
  connections: w.connections,
  settings: filterSettings(w.settings),
});

const readWF = (name) =>
  JSON.parse(readFileSync(join(__dirname, `${name}_pre_phase4.json`), 'utf8'));

const writePut = (name, body) =>
  writeFileSync(join(__dirname, `${name}_post_phase4_put.json`),
    JSON.stringify(body, null, 2), 'utf8');

// ── Patch 1: RC-01 — re-enable the 2 MO handoff nodes ─────────────────
{
  const w = readWF('WF-RC-01');
  let touched = 0;
  for (const n of w.nodes) {
    if (n.name === 'RC_Prepare_MO_01_Handoff' || n.name === 'RC_Dispatch_To_MO_01_SUBCALL') {
      if (n.disabled === true) { delete n.disabled; touched++; }
    }
  }
  if (touched !== 2) throw new Error(`RC-01 expected 2 disabled re-enables, got ${touched}`);
  writePut('WF-RC-01', toPutBody(w));
  console.log('RC-01: re-enabled', touched, 'nodes');
}

// ── Patch 2: DI-01 — add DI_Dispatch_To_ME_01_SUBCALL after DI_Return_Result ──
{
  const w = readWF('WF-DI-01');
  const terminal = 'DI_Return_Result';
  const newName = 'DI_Dispatch_To_ME_01_SUBCALL';
  const targetId = 'uq26nh1grIpnHju0';
  const targetName = 'WF-ME-01 Module Execution';
  if (w.nodes.some(n => n.name === newName)) throw new Error('DI-01 connector node already exists');
  const term = w.nodes.find(n => n.name === terminal);
  if (!term) throw new Error('DI-01 DI_Return_Result not found');
  const pos = [ term.position[0] + 260, term.position[1] ];
  w.nodes.push({
    id: 'di-dispatch-to-me-01-subcall',
    name: newName,
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: pos,
    parameters: {
      workflowId: { __rl: true, value: targetId, mode: 'list', cachedResultName: targetName },
      mode: 'once',
      options: { waitForSubWorkflow: true },
    },
  });
  // Attach new node to the terminal node's output
  w.connections[terminal] = w.connections[terminal] || { main: [[]] };
  const mainOut = w.connections[terminal].main;
  mainOut[0] = mainOut[0] || [];
  mainOut[0].push({ node: newName, type: 'main', index: 0 });
  writePut('WF-DI-01', toPutBody(w));
  console.log('DI-01: added', newName);
}

// ── Patch 3: ME-01 — add ME_Dispatch_To_RA_01_SUBCALL after ME_Return_Result ──
{
  const w = readWF('WF-ME-01');
  const terminal = 'ME_Return_Result';
  const newName = 'ME_Dispatch_To_RA_01_SUBCALL';
  const targetId = '5RcNLtxNjAHJsZPE';
  const targetName = 'WF-RA-01 Result Aggregator';
  if (w.nodes.some(n => n.name === newName)) throw new Error('ME-01 connector node already exists');
  const term = w.nodes.find(n => n.name === terminal);
  if (!term) throw new Error('ME-01 ME_Return_Result not found');
  const pos = [ term.position[0] + 260, term.position[1] ];
  w.nodes.push({
    id: 'me-dispatch-to-ra-01-subcall',
    name: newName,
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: pos,
    parameters: {
      workflowId: { __rl: true, value: targetId, mode: 'list', cachedResultName: targetName },
      mode: 'once',
      options: { waitForSubWorkflow: true },
    },
  });
  w.connections[terminal] = w.connections[terminal] || { main: [[]] };
  const mainOut = w.connections[terminal].main;
  mainOut[0] = mainOut[0] || [];
  mainOut[0].push({ node: newName, type: 'main', index: 0 });
  writePut('WF-ME-01', toPutBody(w));
  console.log('ME-01: added', newName);
}

// ── Patch 4: RA-01 — add RA_Dispatch_To_SU_01_SUBCALL after RA_Build_Downstream_Envelope ──
{
  const w = readWF('WF-RA-01');
  // CANONICAL_CHAIN_MAP + PHASE-4 plan both call out RA_Build_Downstream_Envelope as the
  // source node for this edge — SU expects the aggregated envelope, not RA_Return_Result
  // which is the terminal echo. But RA_Return_Result is fed by RA_Build_Downstream_Envelope,
  // so attaching to RA_Return_Result preserves the envelope AND keeps the sync gate visible.
  // We follow CONNECTOR_ACTIVATION_PLAN.md §2 row 7.
  const terminal = 'RA_Build_Downstream_Envelope';
  const newName = 'RA_Dispatch_To_SU_01_SUBCALL';
  const targetId = 'ENiYNfL3ul8AmmCB';
  const targetName = 'WF-SU-01 State / Persistence Updater';
  if (w.nodes.some(n => n.name === newName)) throw new Error('RA-01 connector node already exists');
  const term = w.nodes.find(n => n.name === terminal);
  if (!term) throw new Error('RA-01 RA_Build_Downstream_Envelope not found');
  const pos = [ term.position[0] + 260, term.position[1] + 160 ];
  w.nodes.push({
    id: 'ra-dispatch-to-su-01-subcall',
    name: newName,
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: pos,
    parameters: {
      workflowId: { __rl: true, value: targetId, mode: 'list', cachedResultName: targetName },
      mode: 'once',
      options: { waitForSubWorkflow: true },
    },
  });
  w.connections[terminal] = w.connections[terminal] || { main: [[]] };
  const mainOut = w.connections[terminal].main;
  mainOut[0] = mainOut[0] || [];
  mainOut[0].push({ node: newName, type: 'main', index: 0 });
  writePut('WF-RA-01', toPutBody(w));
  console.log('RA-01: added', newName);
}

console.log('ALL 4 PATCH FILES BUILT');
