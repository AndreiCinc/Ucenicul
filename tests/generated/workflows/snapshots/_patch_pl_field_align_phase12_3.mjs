#!/usr/bin/env node
// Phase-12.3 PL fix (B11-PL-FIELD-ALIGN): rename extracted input fields to
// match Module_Spec_Memory / Module_Registry canonical names. v1.2 used
// "memory_query"/"feedback_text" which caused ME handlers to emit
// MISSING_REQUIRED_FIELDS for search_memory and capture_feedback.
//
// Target: WF-PL-01 / PL_Build_Planner_Input
// Change: v1.2 -> v1.3. Only the extractInputsForAction output keys for
// search_memory (memory_query -> query) and capture_feedback
// (feedback_text -> feedback_content) change.
// Blast radius: 1 node, jsCode replacement; no structural change.

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

const NEW_CODE = readFileSync('/tmp/PL_Build_Planner_Input_v1_3.js', 'utf8');

const PL_ID = 'RwToPLa1ErHl2tUi';
const cur = await apiGet(PL_ID);
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-PL-01_phase12_3_pre.json', JSON.stringify(cur, null, 2));

const targetNode = cur.nodes.find(n => n.name === 'PL_Build_Planner_Input');
if (!targetNode) throw new Error('PL_Build_Planner_Input node not found');
const oldCode = targetNode.parameters.jsCode || '';

if (!oldCode.includes('v1.2 (B11-PL') && !oldCode.includes('memory_query')) {
  console.warn('Phase-12.3 PL patch: v1.2 anchor not found — proceeding anyway (may already be v1.3)');
}
if (oldCode.includes('v1.3 (B11-PL-FIELD-ALIGN')) {
  console.log('Phase-12.3 PL patch: already applied (v1.3 marker present), no-op');
}

const newNodes = cur.nodes.map(n => {
  if (n.name !== 'PL_Build_Planner_Input') return n;
  return { ...n, parameters: { ...n.parameters, jsCode: NEW_CODE } };
});

const cleanSettings = {};
for (const k of Object.keys(cur.settings || {})) if (SETTINGS_WHITELIST.has(k)) cleanSettings[k] = cur.settings[k];

const body = { name: cur.name, nodes: newNodes, connections: cur.connections, settings: cleanSettings };
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-PL-01_phase12_3_put.json', JSON.stringify(body, null, 2));

await apiDeactivate(PL_ID);
await apiPut(PL_ID, body);
await apiActivate(PL_ID);

const after = await apiGet(PL_ID);
const newNode = after.nodes.find(n => n.name === 'PL_Build_Planner_Input');
const code = newNode?.parameters?.jsCode || '';

// Required v1.3 markers
const required = ['v1.3 (B11-PL-FIELD-ALIGN', 'return { query: q };', 'return { feedback_content: t };'];
for (const m of required) {
  if (!code.includes(m)) throw new Error(`Phase-12.3 PL patch: post-PUT verification failed — missing marker ${JSON.stringify(m)}`);
}
// Forbidden v1.2 residues
const forbidden = ['return { memory_query:', 'return { feedback_text:'];
for (const m of forbidden) {
  if (code.includes(m)) throw new Error(`Phase-12.3 PL patch: post-PUT verification failed — forbidden residue still present ${JSON.stringify(m)}`);
}
console.log('Phase-12.3 PL patch: OK (v1.3 applied)');
