#!/usr/bin/env node
// Phase-11 PL one-line fix (prerequisite for ME module expansion).
//
// Root cause: PL_Generate_Plan pushes plan steps that drop `action` from
// step.inputs — only `requested_actions[i].action` carries it, but that field
// is not propagated to the emitted step. Downstream, ME's per-action routers
// read `step.inputs.action`, so every TR-originated execution hits the wrong
// switch branch and DI reports UNSUPPORTED_ACTION ("action: undefined").
//
// Smallest canonical fix: inject `action` into the emitted step's `inputs`
// via Object.assign. Existing callers that already carry `inputs.action`
// keep winning (right-hand keys overwrite left-hand in Object.assign).
//
// Blast radius: WF-PL-01, single node (PL_Generate_Plan), single line
// inside the existing jsCode. No schema, no connector changes.

import { readFileSync, writeFileSync } from 'node:fs';

function loadEnv() {
  const raw = readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env', 'utf8');
  const env = {};
  for (const l of raw.split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].trim(); }
  return env;
}
const env = loadEnv();
const N8N_URL = env.N8N_URL.replace(/\/$/, '');
const N8N_API_KEY = env.N8N_API_KEY;
const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress','saveManualExecutions','saveDataErrorExecution',
  'saveDataSuccessExecution','executionTimeout','errorWorkflow','timezone',
  'executionOrder','callerPolicy','callerIds','timeSavedPerExecution','availableInMCP'
]);

async function apiGet(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
  if (!r.ok) throw new Error(`GET ${id} ${r.status}: ${await r.text()}`);
  return r.json();
}
async function apiDeactivate(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}/deactivate`, { method: 'POST', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: '{}' });
  if (!r.ok) console.error('deactivate', r.status, await r.text());
}
async function apiActivate(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}/activate`, { method: 'POST', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: '{}' });
  if (!r.ok) throw new Error(`activate ${r.status}: ${await r.text()}`);
}
async function apiPut(id, body) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, { method: 'PUT', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PUT ${id} ${r.status}: ${await r.text()}`);
  return r.json();
}

const PL_ID = 'RwToPLa1ErHl2tUi';
const cur = await apiGet(PL_ID);
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-PL-01_phase11_pre.json', JSON.stringify(cur, null, 2));

const genNode = cur.nodes.find(n => n.name === 'PL_Generate_Plan');
if (!genNode) throw new Error('PL_Generate_Plan node not found');
const oldCode = genNode.parameters.jsCode || '';

// Surgical textual replacement — only the one line that drops `action`.
const OLD_LINE = "    inputs: action.inputs || {},";
const NEW_LINE = "    inputs: Object.assign({ action: actionName }, action.inputs || {}),";
if (!oldCode.includes(OLD_LINE)) {
  throw new Error('Phase-11 PL patch: anchor line not found — aborting to avoid silent miss. Anchor=' + JSON.stringify(OLD_LINE));
}
if (oldCode.includes(NEW_LINE)) {
  console.log('Phase-11 PL patch: already applied, no-op');
}
const newCode = oldCode.replace(OLD_LINE, NEW_LINE);

const newNodes = cur.nodes.map(n => {
  if (n.name !== 'PL_Generate_Plan') return n;
  return { ...n, parameters: { ...n.parameters, jsCode: newCode } };
});

const cleanSettings = {};
for (const k of Object.keys(cur.settings || {})) if (SETTINGS_WHITELIST.has(k)) cleanSettings[k] = cur.settings[k];

const body = { name: cur.name, nodes: newNodes, connections: cur.connections, settings: cleanSettings };
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-PL-01_phase11_put.json', JSON.stringify(body, null, 2));

await apiDeactivate(PL_ID);
await apiPut(PL_ID, body);
await apiActivate(PL_ID);

const after = await apiGet(PL_ID);
const gen = after.nodes.find(n => n.name === 'PL_Generate_Plan');
const has = (gen?.parameters?.jsCode || '').includes('Object.assign({ action: actionName }, action.inputs || {})');
console.log('PL_Generate_Plan propagates inputs.action:', has);
if (!has) throw new Error('Phase-11 PL patch: post-PUT verification failed');
console.log('Phase-11 PL patch: OK');
