#!/usr/bin/env node
// Phase-11b ME refinement: bypass ME_Load_Task_Candidates for non-task modules.
//
// Per design doc Section 5 ("only the task branch goes through
// ME_Load_Task_Candidates"). Current wiring feeds ME_Route_Context_OK →
// ME_Load_Task_Candidates → ME_Route_Module_Name, which means every
// reminder/memory/improvement/watcher request still executes an empty
// task-candidate SQL query before branching. That's wasted work and leaks
// task concerns into the other modules' paths.
//
// Swap: Route_Context_OK[0] → Route_Module_Name. When module_name=task_module,
// ME_Route_Module_Name[0] → ME_Load_Task_Candidates → ME_Route_Task_Action.
// For all other modules, routing stays direct.
//
// Connections-only patch. No node changes.

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

const ME_ID = 'uq26nh1grIpnHju0';
const cur = await apiGet(ME_ID);
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-ME-01_phase11b_pre.json', JSON.stringify(cur, null, 2));

const conns = JSON.parse(JSON.stringify(cur.connections));

// Idempotence guard
const ctxOut = conns['ME_Route_Context_OK']?.main?.[0]?.[0]?.node;
if (ctxOut === 'ME_Route_Module_Name') {
  console.log('Phase-11b ME patch: already applied; no-op.');
  process.exit(0);
}

// Rewire three nodes' outputs.
conns['ME_Route_Context_OK'] = {
  main: [
    [{ node: 'ME_Route_Module_Name', type: 'main', index: 0 }],  // was: ME_Load_Task_Candidates
    [] // fallback / second output unused
  ]
};

conns['ME_Load_Task_Candidates'] = {
  main: [[{ node: 'ME_Route_Task_Action', type: 'main', index: 0 }]]  // was: ME_Route_Module_Name
};

// ME_Route_Module_Name must route task_module (output 0) → ME_Load_Task_Candidates
// then the 4 new modules to their respective switches/handlers, then fallback.
conns['ME_Route_Module_Name'] = { main: [
  [{ node: 'ME_Load_Task_Candidates',       type: 'main', index: 0 }],  // was: ME_Route_Task_Action
  [{ node: 'ME_Route_Reminder_Action',      type: 'main', index: 0 }],
  [{ node: 'ME_Route_Memory_Action',        type: 'main', index: 0 }],
  [{ node: 'ME_Improvement_Capture_Result', type: 'main', index: 0 }],
  [{ node: 'ME_Watcher_Observe_Result',     type: 'main', index: 0 }],
  [{ node: 'ME_Return_Error',               type: 'main', index: 0 }]
]};

const cleanSettings = {};
for (const k of Object.keys(cur.settings || {})) if (SETTINGS_WHITELIST.has(k)) cleanSettings[k] = cur.settings[k];

const body = { name: cur.name, nodes: cur.nodes, connections: conns, settings: cleanSettings };
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-ME-01_phase11b_put.json', JSON.stringify(body, null, 2));

await apiDeactivate(ME_ID);
await apiPut(ME_ID, body);
await apiActivate(ME_ID);

const after = await apiGet(ME_ID);
const c1 = after.connections['ME_Route_Context_OK']?.main?.[0]?.[0]?.node;
const c2 = after.connections['ME_Route_Module_Name']?.main?.[0]?.[0]?.node;
const c3 = after.connections['ME_Load_Task_Candidates']?.main?.[0]?.[0]?.node;
console.log('ME_Route_Context_OK[0] ->', c1);
console.log('ME_Route_Module_Name[0] ->', c2);
console.log('ME_Load_Task_Candidates[0] ->', c3);
if (c1 !== 'ME_Route_Module_Name' || c2 !== 'ME_Load_Task_Candidates' || c3 !== 'ME_Route_Task_Action') {
  throw new Error('Phase-11b ME patch: post-PUT verification failed');
}
console.log('Phase-11b ME patch: OK');
