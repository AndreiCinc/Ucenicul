#!/usr/bin/env node
// Single-case ME smoke to verify the Phase-11 additive patch.
// Fires one create_reminder envelope into ME and reads back execution run data.

import { readFileSync } from 'node:fs';

function loadEnv() {
  const raw = readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env', 'utf8');
  const env = {};
  for (const l of raw.split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].trim(); }
  return env;
}
const env = loadEnv();
const N8N_URL = env.N8N_URL.replace(/\/$/, '');
const N8N_API_KEY = env.N8N_API_KEY;

const ME_ID = 'uq26nh1grIpnHju0';
const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001';
const THREAD = '11111111-0000-0000-0000-000000000001';
const EXEC_CTX = '7132e767-03ba-41eb-98b5-222e59b73ef0';

const envelope = {
  status_kind: 'success',
  result_type: 'dispatch',
  execution_context_id: EXEC_CTX,
  thread_id: THREAD,
  tenant_id: TENANT,
  dispatcher_input: {
    dispatch_allowed: true,
    module_execution_started: false,
    response_generation_allowed: false,
    domain_writes_performed: false,
    step: {
      step_id: 'p11-smoke-01',
      module_name: 'reminder_module',
      inputs: { action: 'create_reminder', description: 'test reminder', remind_at: '2026-04-21T09:00:00Z' },
      depends_on: [],
      execution_mode: 'sequential',
      expected_outputs: [],
      status: 'pending'
    }
  }
};

async function apiPost(path, body) {
  const r = await fetch(`${N8N_URL}${path}`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, body: await r.text() };
}

// Use n8n's workflows/:id/execute endpoint via internal API is not in public API.
// Public API lacks a synchronous run trigger, so we fall back to executeWorkflowTrigger
// via the child-workflow call pattern. Simplest path: use n8n MCP's execute_workflow
// tool semantics — send to the workflow's webhookUrl if chatTrigger active, OR
// call a tiny helper script using the n8n CLI. Since we don't have CLI, we call
// the chatTrigger webhook with the dispatcher envelope JSON-serialized in chatInput.

// ME has a chatTrigger ("When chat message received"); use it.
async function getWorkflow(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
  return (await r.json());
}
const me = await getWorkflow(ME_ID);
const chat = me.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.chatTrigger');
if (!chat) { console.error('No chatTrigger on ME'); process.exit(2); }
const webhookId = chat.webhookId;
const webhookUrl = `${N8N_URL}/webhook/${webhookId}`;
console.log('Firing to:', webhookUrl);

const chatBody = { chatInput: JSON.stringify(envelope), sessionId: `p11-smoke-${Date.now()}` };
const fireR = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(chatBody)
});
console.log('webhook status:', fireR.status);
console.log('webhook body:', (await fireR.text()).slice(0, 2000));

// Retrieve most recent execution for this workflow
await new Promise(r => setTimeout(r, 1500));
const execListR = await fetch(`${N8N_URL}/api/v1/executions?workflowId=${ME_ID}&limit=3&includeData=true`, {
  headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' }
});
const execList = await execListR.json();
const latest = execList.data?.[0];
if (!latest) { console.error('No execution found'); process.exit(3); }
console.log('latest exec id:', latest.id, 'status:', latest.status, 'finished:', latest.finished);

// Walk run data to find ME_Return_Result
const rd = latest.data?.resultData?.runData || {};
const returnRun = rd['ME_Return_Result']?.[0]?.data?.main?.[0]?.[0]?.json;
const errorRun  = rd['ME_Return_Error']?.[0]?.data?.main?.[0]?.[0]?.json;
const reminderCreateRun = rd['ME_Reminder_Create_Result']?.[0]?.data?.main?.[0]?.[0]?.json;
console.log('ME_Reminder_Create_Result json:', JSON.stringify(reminderCreateRun, null, 2));
console.log('ME_Return_Result json:', JSON.stringify(returnRun, null, 2));
console.log('ME_Return_Error json:', JSON.stringify(errorRun, null, 2));
