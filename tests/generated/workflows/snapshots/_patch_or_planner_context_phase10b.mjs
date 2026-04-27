#!/usr/bin/env node
// Phase-10b targeted remediation (evidence-backed, one-shot):
// First Phase-10 patch cleared PL's first guard (planner_context.user_message_text),
// but PL exposes a second guard requiring planner_context.primary_intent OR
// planner_context.requested_actions. The canonical source for the user's
// classified intent is `public.messages.intent` (populated by the upstream
// ingestion/NLU layer). This patch:
//   1. Extends OR_Load_Trigger_Message SELECT to also return `intent`.
//   2. Extends OR_Build_Handoff_Payload to inject
//      planner_context.primary_intent when the DB row provides one.
// Nothing else changes. Credentials preserved.

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
const SETTINGS_WHITELIST = new Set(['saveExecutionProgress','saveManualExecutions','saveDataErrorExecution','saveDataSuccessExecution','executionTimeout','errorWorkflow','timezone','executionOrder','callerPolicy','callerIds','timeSavedPerExecution','availableInMCP']);

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

const OR_ID = 'KhGmNpi0ZDmrnz8W';
const cur = await apiGet(OR_ID);
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-OR-01_phase10b_pre.json', JSON.stringify(cur, null, 2));

const NEW_QUERY = "SELECT\n  m.id::text AS message_id,\n  m.normalized_content AS normalized_content,\n  m.content AS content,\n  m.intent AS intent\nFROM public.messages m\nWHERE m.id = '{{ $json.trigger_message_id }}'::uuid\n  AND m.tenant_id = '{{ $json.tenant_id }}'::uuid\nLIMIT 1;";

const NEW_BUILD_CODE = `
// OR_Build_Handoff_Payload — v1.4 (Phase 10b: + primary_intent passthrough).
// Injects planner_context.user_message_text and planner_context.primary_intent
// when the trigger-message row provides them. No synthesis beyond passthrough.

function safeNode(name) {
  try { const it = $(name).first(); return (it && it.json) ? it.json : {}; }
  catch (e) { return {}; }
}
const verify = safeNode('OR_Verify_Context_Match');
const msgRow = $json || {};

if (verify._valid === 'false') {
  return [{ json: {
    status_kind: 'failed',
    result_type: 'error',
    module_name: 'orchestrator_input_handoff',
    error: {
      code: verify.error_code || 'CONTEXT_MISMATCH',
      message: verify.error_message || 'Context verification failed.',
      missing_fields: Array.isArray(verify.missing_fields) ? verify.missing_fields : []
    }
  }}];
}

const userMessageText = String(
  (msgRow.normalized_content != null ? msgRow.normalized_content :
   (msgRow.content != null ? msgRow.content : ''))
).trim();
const primaryIntent = String(msgRow.intent != null ? msgRow.intent : '').trim();

const plannerContext = {};
if (userMessageText) plannerContext.user_message_text = userMessageText;
if (primaryIntent) plannerContext.primary_intent = primaryIntent;

return [{ json: {
  status_kind: 'success',
  result_type: 'handoff',
  module_name: 'orchestrator_input_handoff',
  payload: {
    tenant_id: String(verify.tenant_id),
    thread_id: String(verify.thread_id),
    execution_id: String(verify.execution_id),
    trigger_message_id: String(verify.trigger_message_id),
    idempotency_key: String(verify.idempotency_key),
    execution_status: String(verify.expected_status),
    planning_allowed: true,
    allowed_next_stage: 'WF-PL-01',
    orchestrator_input: {
      planning_mode: 'plan_only',
      module_execution_allowed: false,
      response_generation_allowed: false,
      domain_writes_allowed: false
    },
    planner_context: plannerContext,
    warnings: Array.isArray(verify.warnings) ? verify.warnings : []
  }
}}];
`;

const newNodes = cur.nodes.map(n => {
  if (n.name === 'OR_Load_Trigger_Message') {
    return { ...n, parameters: { ...n.parameters, query: NEW_QUERY } };
  }
  if (n.name === 'OR_Build_Handoff_Payload') {
    return { ...n, parameters: { ...n.parameters, jsCode: NEW_BUILD_CODE } };
  }
  return n;
});

const cleanSettings = {};
for (const k of Object.keys(cur.settings || {})) if (SETTINGS_WHITELIST.has(k)) cleanSettings[k] = cur.settings[k];

const body = { name: cur.name, nodes: newNodes, connections: cur.connections, settings: cleanSettings };
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-OR-01_phase10b_put.json', JSON.stringify(body, null, 2));

await apiDeactivate(OR_ID);
await apiPut(OR_ID, body);
await apiActivate(OR_ID);

const after = await apiGet(OR_ID);
const loadNode = after.nodes.find(n => n.name === 'OR_Load_Trigger_Message');
const buildNode = after.nodes.find(n => n.name === 'OR_Build_Handoff_Payload');
console.log('query has intent:', /\\bm\\.intent\\b/.test(loadNode?.parameters?.query || ''));
console.log('build has primary_intent:', buildNode?.parameters?.jsCode?.includes('primary_intent'));
