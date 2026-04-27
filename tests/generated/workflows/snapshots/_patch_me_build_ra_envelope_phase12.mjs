#!/usr/bin/env node
// Phase-12 ME fix (B11-RA): wrap module_error envelopes into a canonical
// failed module_batch so RA-01 aggregates instead of rejecting with
// INVALID_AGGREGATION_INPUT.
//
// Target: WF-ME-01 / ME_Build_RA_Envelope
// Change: v1.0 -> v1.1, adds error-path wrap; preserves v1.0 success path.
// Blast radius: 1 node, jsCode replacement.

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

const NEW_CODE = readFileSync('/tmp/ME_Build_RA_Envelope_v1_1.js', 'utf8');

const ME_ID = 'uq26nh1grIpnHju0';
const cur = await apiGet(ME_ID);
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-ME-01_phase12_pre.json', JSON.stringify(cur, null, 2));

const targetNode = cur.nodes.find(n => n.name === 'ME_Build_RA_Envelope');
if (!targetNode) throw new Error('ME_Build_RA_Envelope node not found');
const oldCode = targetNode.parameters.jsCode || '';

// Sanity / idempotence
if (oldCode.includes("v1.1 (B11-RA")) {
  console.log('Phase-12 ME patch: already applied (v1.1 marker present), no-op');
}

const newNodes = cur.nodes.map(n => {
  if (n.name !== 'ME_Build_RA_Envelope') return n;
  return { ...n, parameters: { ...n.parameters, jsCode: NEW_CODE } };
});

const cleanSettings = {};
for (const k of Object.keys(cur.settings || {})) if (SETTINGS_WHITELIST.has(k)) cleanSettings[k] = cur.settings[k];

const body = { name: cur.name, nodes: newNodes, connections: cur.connections, settings: cleanSettings };
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-ME-01_phase12_put.json', JSON.stringify(body, null, 2));

await apiDeactivate(ME_ID);
await apiPut(ME_ID, body);
await apiActivate(ME_ID);

const after = await apiGet(ME_ID);
const newNode = after.nodes.find(n => n.name === 'ME_Build_RA_Envelope');
const code = newNode?.parameters?.jsCode || '';
const markers = ['v1.1 (B11-RA', "status_kind === 'error'", "result_type: 'module_batch'", 'failedResult'];
for (const m of markers) {
  if (!code.includes(m)) throw new Error(`Phase-12 ME patch: post-PUT verification failed — missing marker ${JSON.stringify(m)}`);
}
console.log('Phase-12 ME patch: OK (v1.1 applied)');
