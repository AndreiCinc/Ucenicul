#!/usr/bin/env node
// Add a chatTrigger to WF-RC-01 so we can invoke it via MCP with chatInput.
// The trigger wires to RC_Validate_State_Update_Input and parses chatInput as JSON.
// This is for Phase-5 edge-9 runtime testing only; can be removed later.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress','saveManualExecutions','saveDataErrorExecution',
  'saveDataSuccessExecution','executionTimeout','errorWorkflow','timezone',
  'executionOrder','callerPolicy','callerIds','timeSavedPerExecution','availableInMCP'
]);
const filterSettings = (s = {}) => Object.fromEntries(Object.entries(s).filter(([k]) => SETTINGS_WHITELIST.has(k)));
const toPutBody = (w) => ({ name: w.name, nodes: w.nodes, connections: w.connections, settings: filterSettings(w.settings) });

const w = JSON.parse(readFileSync(join(__dirname, 'WF-RC-01_phase5_pre.json'), 'utf8'));

// Remove any existing chat trigger we might have added
w.nodes = w.nodes.filter(n => n.type !== '@n8n/n8n-nodes-langchain.chatTrigger');

// Add chat trigger
w.nodes.push({
  id: 'rc-chat-trigger',
  name: 'RC_Chat_Trigger',
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  typeVersion: 1.1,
  position: [-60, 680],
  webhookId: 'a1b2c3d4-rc01-4edge-9runt-testonly0001',
  parameters: { options: {} }
});

// Add a JSON parsing node that takes chatInput and passes parsed object onward.
w.nodes.push({
  id: 'rc-chat-parse',
  name: 'RC_Parse_Chat_Input',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [180, 680],
  parameters: {
    language: 'javaScript',
    jsCode: "const src = $json; if (src && typeof src.chatInput === 'string') { try { return [{ json: JSON.parse(src.chatInput) }]; } catch (e) { return [{ json: { status_kind: 'error', result_type: 'composition_error', error: { code: 'BAD_CHAT_JSON', message: String(e) } } }]; } } return [{ json: src }];"
  }
});

// Rewire: RC_Chat_Trigger → RC_Parse_Chat_Input → RC_Validate_State_Update_Input
w.connections['RC_Chat_Trigger'] = { main: [[{ node: 'RC_Parse_Chat_Input', type: 'main', index: 0 }]] };
w.connections['RC_Parse_Chat_Input'] = { main: [[{ node: 'RC_Validate_State_Update_Input', type: 'main', index: 0 }]] };

// Also preserve the phase-5 adapter patch: the RC_Prepare_MO_01_Handoff should keep the updated code
// Copy over the patched handoff node content from the current put.json
const putCurrent = JSON.parse(readFileSync(join(__dirname, 'WF-RC-01_phase5_put.json'), 'utf8'));
const patchedHandoff = putCurrent.nodes.find(n => n.name === 'RC_Prepare_MO_01_Handoff');
if (patchedHandoff) {
  const idx = w.nodes.findIndex(n => n.name === 'RC_Prepare_MO_01_Handoff');
  if (idx >= 0) w.nodes[idx] = patchedHandoff;
}

writeFileSync(join(__dirname, 'WF-RC-01_phase5b_put.json'), JSON.stringify(toPutBody(w), null, 2));
console.log('WF-RC-01: added chat trigger + parse node + kept MO handoff patch');
