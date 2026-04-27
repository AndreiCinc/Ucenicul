#!/usr/bin/env node
// Phase-6 edge-8 activation — wire SU-01 → RC-01.
//
// SU_Return_Result1 already emits exactly the envelope that RC_Validate_State_Update_Input
// accepts (status_kind=success, result_type=state_update_result, allowed_next_stage=WF-RC-01,
// response_generation_allowed=true, state_update_result, idempotency_key). No adapter
// transformation is needed — only a connector node.
//
// This script:
//   1. Adds SU_Dispatch_To_RC_01_SUBCALL (Execute-Workflow node → TClXgmO8H8zsSwMb)
//   2. Rewires SU_Return_Result1 → SU_Dispatch_To_RC_01_SUBCALL
//
// Produces: WF-SU-01_phase6_put.json  (apply via n8n-patch replace --reactivate)

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

const w = JSON.parse(readFileSync(join(__dirname, 'WF-SU-01_phase6_pre.json'), 'utf8'));

const terminal = w.nodes.find(n => n.name === 'SU_Return_Result1');
if (!terminal) throw new Error('SU_Return_Result1 missing');

const newNode = 'SU_Dispatch_To_RC_01_SUBCALL';
if (w.nodes.some(n => n.name === newNode)) throw new Error(`${newNode} already present`);

w.nodes.push({
  id: 'su-dispatch-to-rc-01',
  name: newNode,
  type: 'n8n-nodes-base.executeWorkflow',
  typeVersion: 1.2,
  position: [terminal.position[0] + 260, terminal.position[1]],
  parameters: {
    source: 'database',
    workflowId: { __rl: true, value: 'TClXgmO8H8zsSwMb', mode: 'id' },
    mode: 'once',
    options: {}
  }
});

// Rewire terminal
w.connections[terminal.name] = w.connections[terminal.name] || { main: [[]] };
// Clear main[0] and redirect to subcall
w.connections[terminal.name].main = [[{ node: newNode, type: 'main', index: 0 }]];
w.connections[newNode] = { main: [[]] }; // terminal of SU chain

writeFileSync(
  join(__dirname, 'WF-SU-01_phase6_put.json'),
  JSON.stringify(toPutBody(w), null, 2),
  'utf8'
);
console.log('SU-01: added', newNode, '+ rewired SU_Return_Result1 → subcall');
console.log('wrote WF-SU-01_phase6_put.json');
