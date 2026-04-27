#!/usr/bin/env node
// Phase-10 canonical micro-patch: enrich OR→PL handoff with
// `payload.planner_context.user_message_text` by loading the trigger message
// text from the messages table via (trigger_message_id, tenant_id).
//
// Smallest-possible canonical fix per mission mandate: one new Postgres read
// node + one modification to OR_Build_Handoff_Payload to inject exactly one
// new field: planner_context.user_message_text.
//
// We deliberately do NOT also synthesize planner_context.goal or
// planner_context.primary_intent here. PL's upstream code reads
// `goal = planner_context.goal || planner_context.user_message_text`, so
// user_message_text alone satisfies the goal guard. Any further enrichment
// would exceed the approved scope.

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
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-OR-01_phase10_pre.json', JSON.stringify(cur, null, 2));

// Copy postgres credentials from the existing OR_Load_Execution_Context node.
const srcPg = cur.nodes.find(n => n.name === 'OR_Load_Execution_Context');
if (!srcPg) throw new Error('OR_Load_Execution_Context not found');
const pgCreds = srcPg.credentials;

// 1) Insert a new OR_Load_Trigger_Message node (postgres SELECT on messages).
const LOAD_MSG_NODE = {
  id: 'or-load-trigger-message',
  name: 'OR_Load_Trigger_Message',
  type: 'n8n-nodes-base.postgres',
  typeVersion: 2.5,
  position: [1632, 416], // between Verify (1520) and Build (1744)
  alwaysOutputData: true,
  credentials: pgCreds,
  parameters: {
    operation: 'executeQuery',
    // n8n-patch policy: this workflow already uses sanitized inline interpolation
    // for uuid params (see OR_Load_Execution_Context above); follow the same
    // convention to keep the patch local and consistent. Values originate from
    // OR_Verify_Context_Match output — already string-coerced and UUID-typed.
    query: "SELECT\n  m.id::text AS message_id,\n  m.normalized_content AS normalized_content,\n  m.content AS content\nFROM public.messages m\nWHERE m.id = '{{ $json.trigger_message_id }}'::uuid\n  AND m.tenant_id = '{{ $json.tenant_id }}'::uuid\nLIMIT 1;",
    options: {}
  }
};

// 2) Replace OR_Build_Handoff_Payload code to:
//    - read verify output via $('OR_Verify_Context_Match').first().json
//    - read message row via $json (the new upstream)
//    - inject planner_context.user_message_text only (when present)
//    - preserve existing payload fields / error short-circuit
const NEW_BUILD_CODE = `
// OR_Build_Handoff_Payload — v1.3 (Phase 10 canonical enrichment).
// Source of verify data: OR_Verify_Context_Match (by name).
// Source of message text: OR_Load_Trigger_Message (immediate upstream, $json).
// Added: payload.planner_context.user_message_text (only when non-empty).
// Preserves all existing fields and error short-circuit behavior.

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

const plannerContext = {};
if (userMessageText) {
  plannerContext.user_message_text = userMessageText;
}

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
  if (n.name === 'OR_Build_Handoff_Payload') {
    return { ...n, parameters: { ...n.parameters, jsCode: NEW_BUILD_CODE } };
  }
  return n;
});
// Insert the load-message node if not already present (idempotent).
if (!newNodes.some(n => n.name === 'OR_Load_Trigger_Message')) {
  newNodes.push(LOAD_MSG_NODE);
}

// 3) Rewire: OR_Verify_Context_Match → OR_Load_Trigger_Message → OR_Build_Handoff_Payload
const conns = JSON.parse(JSON.stringify(cur.connections));
conns['OR_Verify_Context_Match'] = { main: [[{ node: 'OR_Load_Trigger_Message', type: 'main', index: 0 }]] };
conns['OR_Load_Trigger_Message'] = { main: [[{ node: 'OR_Build_Handoff_Payload', type: 'main', index: 0 }]] };

const cleanSettings = {};
for (const k of Object.keys(cur.settings || {})) if (SETTINGS_WHITELIST.has(k)) cleanSettings[k] = cur.settings[k];

const body = { name: cur.name, nodes: newNodes, connections: conns, settings: cleanSettings };
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-OR-01_phase10_put.json', JSON.stringify(body, null, 2));

await apiDeactivate(OR_ID);
await apiPut(OR_ID, body);
await apiActivate(OR_ID);

const after = await apiGet(OR_ID);
const loadNode = after.nodes.find(n => n.name === 'OR_Load_Trigger_Message');
const buildNode = after.nodes.find(n => n.name === 'OR_Build_Handoff_Payload');
console.log('post-patch OR node count:', after.nodes.length);
console.log('OR_Load_Trigger_Message present:', !!loadNode, 'credentials:', loadNode?.credentials ? 'yes' : 'no');
console.log('OR_Build_Handoff_Payload updated:', buildNode?.parameters?.jsCode?.includes('user_message_text') ? 'yes' : 'no');
console.log('verify→load→build wired:',
  after.connections.OR_Verify_Context_Match?.main?.[0]?.[0]?.node === 'OR_Load_Trigger_Message',
  after.connections.OR_Load_Trigger_Message?.main?.[0]?.[0]?.node === 'OR_Build_Handoff_Payload');
