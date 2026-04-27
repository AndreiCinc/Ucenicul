#!/usr/bin/env node
// Enable availableInMCP on the four Phase-8 runtime harnesses.
// GET → mutate → PUT with PUT_BODY_KEYS whitelist.

import { readFileSync } from 'node:fs';

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

const harnesses = JSON.parse(readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase8_runtime_harnesses.json','utf8'));

async function apiGet(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
  if (!r.ok) throw new Error(`GET ${id} ${r.status}: ${await r.text()}`);
  return r.json();
}
async function apiDeactivate(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}/deactivate`, { method: 'POST', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({}) });
  if (!r.ok) throw new Error(`deactivate ${id} ${r.status}: ${await r.text()}`);
  return r.json();
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

for (const [key, h] of Object.entries(harnesses)) {
  const current = await apiGet(h.id);
  const currentSettings = {};
  for (const k of Object.keys(current.settings || {})) {
    if (SETTINGS_WHITELIST.has(k)) currentSettings[k] = current.settings[k];
  }
  currentSettings.availableInMCP = true;
  const body = {
    name: current.name,
    nodes: current.nodes,
    connections: current.connections,
    settings: currentSettings,
  };
  // need to deactivate before PUT (n8n rejects PUT on active workflows? let's try)
  try {
    await apiDeactivate(h.id);
  } catch (e) {
    // ok if not active
  }
  await apiPut(h.id, body);
  await apiActivate(h.id);
  console.log(`${key} (${h.id}) settings.availableInMCP=true + reactivated`);
}
