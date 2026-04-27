#!/usr/bin/env node
// Phase-9 precursor: add a chatTrigger entry to WF-TR-01 so the full primary
// chain can be invoked from TR in production (the existing manualTrigger
// carries pinData which overrides MCP inputs in manual mode).
//
// The chatTrigger accepts a JSON envelope via chatInput, a Code node parses
// it, and pipes it into TR_Validate_Input — the existing entry validator that
// also serves the manualTrigger path. No existing behaviour is changed.

import { readFileSync, writeFileSync } from 'node:fs';

function loadEnv() {
  const envPath = '/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env';
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const env = loadEnv();
const N8N_URL = env.N8N_URL.replace(/\/$/,'');
const N8N_API_KEY = env.N8N_API_KEY;

const PUT_BODY_KEYS = ['name', 'nodes', 'connections', 'settings'];
const SETTINGS_WHITELIST = new Set(['saveExecutionProgress','saveManualExecutions','saveDataErrorExecution','saveDataSuccessExecution','executionTimeout','errorWorkflow','timezone','executionOrder','callerPolicy','callerIds','timeSavedPerExecution','availableInMCP']);

async function apiGet(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
  if (!r.ok) throw new Error(`GET ${id} ${r.status}: ${await r.text()}`);
  return r.json();
}
async function apiDeactivate(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}/deactivate`, { method: 'POST', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({}) });
  if (!r.ok) console.error('deactivate fail', await r.text());
}
async function apiActivate(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}/activate`, { method: 'POST', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({}) });
  if (!r.ok) throw new Error(`activate ${id} ${r.status}: ${await r.text()}`);
  return r.json();
}
async function apiPut(id, body) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, { method: 'PUT', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PUT ${id} ${r.status}: ${await r.text()}`);
  return r.json();
}

const TR_ID = 'wI8hpSROxQI0zC9f';

const current = await apiGet(TR_ID);
// snapshot pre-phase9
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-TR-01_phase9_pre.json', JSON.stringify(current, null, 2));

// Find TR_Validate_Input by name
const validateNode = current.nodes.find(n => n.name === 'TR_Validate_Input');
if (!validateNode) throw new Error('TR_Validate_Input not found');

// Insert chatTrigger + parse node if absent
if (!current.nodes.some(n => n.name === 'TR_Chat_Trigger')) {
  const chatTrigger = {
    id: 'tr-chat-trigger',
    name: 'TR_Chat_Trigger',
    type: '@n8n/n8n-nodes-langchain.chatTrigger',
    typeVersion: 1.1,
    position: [-528, 320],
    webhookId: 'a1b2c3d4-trtr-phz9-4chat-smoketh00001',
    parameters: { options: {} }
  };
  const parseNode = {
    id: 'tr-parse-chat-input',
    name: 'TR_Parse_Chat_Input',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-280, 320],
    parameters: {
      language: 'javaScript',
      jsCode: "const raw = ($json.chatInput || '').trim();\nlet env;\ntry { env = JSON.parse(raw); } catch (e) { return [{ json: { _parse_error: true, message: 'invalid JSON: ' + e.message, raw } }]; }\nreturn [{ json: env }];"
    }
  };
  current.nodes.push(chatTrigger, parseNode);
  current.connections['TR_Chat_Trigger'] = { main: [[{ node: 'TR_Parse_Chat_Input', type: 'main', index: 0 }]] };
  current.connections['TR_Parse_Chat_Input'] = { main: [[{ node: 'TR_Validate_Input', type: 'main', index: 0 }]] };
}

// Settings whitelist
const cleanSettings = {};
for (const k of Object.keys(current.settings || {})) {
  if (SETTINGS_WHITELIST.has(k)) cleanSettings[k] = current.settings[k];
}
cleanSettings.availableInMCP = true;

const body = {
  name: current.name,
  nodes: current.nodes,
  connections: current.connections,
  settings: cleanSettings,
};

writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-TR-01_phase9_put.json', JSON.stringify(body, null, 2));

await apiDeactivate(TR_ID);
await apiPut(TR_ID, body);
await apiActivate(TR_ID);

const after = await apiGet(TR_ID);
console.log('TR nodes count:', after.nodes.length);
console.log('TR triggers:');
for (const n of after.nodes) {
  if ((n.type||'').toLowerCase().includes('trigger')) console.log('  -', n.name, n.type);
}
