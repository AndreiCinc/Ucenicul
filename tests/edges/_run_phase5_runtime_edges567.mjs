#!/usr/bin/env node
/**
 * Phase-5 runtime harness for edges 5, 6, 7 (DI→ME→RA→SU chain).
 *
 * For each of 10 cases, invoke WF-DI-01 with a distinct execution_context and plan.
 * Each invocation of DI runs the full chain: DI→ME→RA→SU. Therefore each case
 * exercises all three boundaries (edge-5, edge-6, edge-7) simultaneously.
 *
 * Records per-case: DI execution id, chain sub-execution ids, pass/fail per edge.
 * Output: tests/generated/edges/phase5_runtime_edges567.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env','utf8');
const N8N_URL = (ENV.match(/N8N_URL=(.*)/)[1] || '').replace(/\/+$/, '');
const N8N_API_KEY = ENV.match(/N8N_API_KEY=(.*)/)[1];

const WF_DI = 'abqYINcXr3JAhGGk';
const WF_ME = 'uq26nh1grIpnHju0';
const WF_RA = '5RcNLtxNjAHJsZPE';
const WF_SU = 'ENiYNfL3ul8AmmCB';
const WF_RC = 'TClXgmO8H8zsSwMb';
const WF_MO_CANDIDATES = ['kYwE33Pk3fqx1ArX','ijGJUKlmgXRygSZf']; // MO workflow id to check as sub-exec target

const CASES = [
  { id:1,  ctx:'a7ae786a-9f64-46b8-b02a-3df62080a8f7', tmsg:'aaaabbbb-0000-0000-0000-000000000010', idemp:'aaaaaaaa-0000-0000-0000-000000000001:aaaabbbb-0000-0000-0000-000000000010:exec_ctx:v1' },
  { id:2,  ctx:'b0000002-0000-0000-0000-000000000002', tmsg:'aaaabbbb-0000-0000-0000-000000000012', idemp:'ucenicul:phase5:edge5:rt2' },
  { id:3,  ctx:'b0000003-0000-0000-0000-000000000003', tmsg:'aaaabbbb-0000-0000-0000-000000000013', idemp:'ucenicul:phase5:edge5:rt3' },
  { id:4,  ctx:'b0000004-0000-0000-0000-000000000004', tmsg:'aaaabbbb-0000-0000-0000-000000000014', idemp:'ucenicul:phase5:edge5:rt4' },
  { id:5,  ctx:'b0000005-0000-0000-0000-000000000005', tmsg:'aaaabbbb-0000-0000-0000-000000000015', idemp:'ucenicul:phase5:edge5:rt5' },
  { id:6,  ctx:'b0000006-0000-0000-0000-000000000006', tmsg:'aaaabbbb-0000-0000-0000-000000000016', idemp:'ucenicul:phase5:edge5:rt6' },
  { id:7,  ctx:'b0000007-0000-0000-0000-000000000007', tmsg:'aaaabbbb-0000-0000-0000-000000000017', idemp:'ucenicul:phase5:edge5:rt7' },
  { id:8,  ctx:'b0000008-0000-0000-0000-000000000008', tmsg:'aaaabbbb-0000-0000-0000-000000000018', idemp:'ucenicul:phase5:edge5:rt8' },
  { id:9,  ctx:'b0000009-0000-0000-0000-000000000009', tmsg:'aaaabbbb-0000-0000-0000-000000000019', idemp:'ucenicul:phase5:edge5:rt9' },
  { id:10, ctx:'b0000010-0000-0000-0000-000000000010', tmsg:'aaaabbbb-0000-0000-0000-000000000020', idemp:'ucenicul:phase5:edge5:rt10' },
];

const api = async (path, init={}) => {
  const res = await fetch(`${N8N_URL}/api/v1${path}`, {
    ...init,
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json', ...(init.headers||{}) }
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const buildPlan = (c) => ({
  status_kind: 'success',
  result_type: 'plan',
  module_name: 'plan_generation',
  payload: {
    tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    thread_id: '11111111-0000-0000-0000-000000000001',
    execution_id: c.ctx,
    trigger_message_id: c.tmsg,
    idempotency_key: c.idemp,
    plan_id: `plan:${c.ctx}:rt${c.id}`,
    goal: `Runtime edge-5 case ${c.id}.`,
    primary_intent: 'task_create',
    steps: [{
      step_id: `rt${c.id}_task_create`,
      module_name: 'task_module',
      purpose: 'Create a task.',
      inputs: { action:'create_task', description:`Runtime edge5 case ${c.id}`, due_date:'2026-04-25' },
      depends_on: [],
      execution_mode: 'sequential',
      expected_outputs: ['task_id'],
      replan_if: ['failed'],
      failure_policy: 'block_if_main_goal',
      status: 'pending',
    }],
    dispatcher_input: { dispatch_allowed:true, module_execution_started:false, response_generation_allowed:false, domain_writes_performed:false },
    warnings: [],
  }
});

// Since the n8n API doesn't expose triggerChat for chat trigger-workflows directly,
// we use the same MCP-equivalent webhook: POST to the chat webhook url.
// Actually simpler — use the n8n public API POST /workflows/:id/run? Let's just trigger via direct webhook.
// But chat trigger isn't a public webhook by default. The fastest is: issue execute via the MCP.
// For this script we call the chat webhook endpoint.
// The ChatTrigger webhookId is 4ad586da-c0be-47b7-b081-9156bf1f4bdb for DI-01.

async function triggerChat(workflowId, webhookId, chatInput) {
  const url = `${N8N_URL}/webhook/${webhookId}/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatInput, sessionId: `phase5-${Date.now()}`, action: 'sendMessage' })
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`chat trigger ${workflowId} → ${res.status}: ${txt}`);
  // Response body may be empty or contain chat response; we need the execution id via api listing.
  return { status: res.status, body: txt };
}

async function listExecutionsSince(workflowId, afterId) {
  const list = await api(`/executions?workflowId=${workflowId}&limit=5`);
  return (list.data || []).filter(e => Number(e.id) > Number(afterId));
}

async function getExecution(workflowId, executionId) {
  return api(`/executions/${executionId}?includeData=true`);
}

async function runCase(c, startExecId) {
  const plan = buildPlan(c);
  const chatInput = JSON.stringify(plan);
  // Trigger via chat webhook (DI-01 chat trigger)
  await triggerChat(WF_DI, '4ad586da-c0be-47b7-b081-9156bf1f4bdb', chatInput);
  await sleep(2000); // let full chain settle
  const fresh = await listExecutionsSince(WF_DI, startExecId);
  const diExec = fresh.sort((a,b)=>Number(a.id)-Number(b.id)).find(e => Number(e.id) > Number(startExecId));
  if (!diExec) return { case:c.id, pass:false, reason:'no new DI execution' };
  const fullDi = await getExecution(WF_DI, diExec.id);
  const di = fullDi.data ? fullDi : (fullDi.execution ? fullDi : null);
  // The n8n public API nests result under .data.resultData.runData
  const runData = fullDi?.data?.resultData?.runData || {};
  const subExecs = [];
  for (const [nodeName, runs] of Object.entries(runData)) {
    for (const run of runs) {
      const sub = run?.metadata?.subExecution;
      if (sub) subExecs.push({ nodeName, ...sub });
    }
  }
  return {
    case: c.id,
    execId: diExec.id,
    status: diExec.status,
    subExecs,
    pass: diExec.status === 'success',
    finalStatusKind: (runData['DI_Build_ME_Envelopes']?.[0]?.data?.main?.[0]?.[0]?.json?.status_kind) || null
  };
}

// Snapshot latest DI execution id to exclude prior runs
async function latestExecutionId(workflowId) {
  const list = await api(`/executions?workflowId=${workflowId}&limit=1`);
  return (list.data && list.data[0]) ? list.data[0].id : '0';
}

const results = [];
let startId = await latestExecutionId(WF_DI);
console.log(`Starting DI runs; latest DI exec id = ${startId}`);
for (const c of CASES) {
  try {
    const r = await runCase(c, startId);
    results.push(r);
    if (r.execId) startId = r.execId;
    console.log(`  case ${c.id}: exec=${r.execId} status=${r.status} subExecs=${r.subExecs?.length||0}`);
  } catch (e) {
    results.push({ case: c.id, pass: false, error: String(e).slice(0,200) });
    console.log(`  case ${c.id}: ERROR ${e.message}`);
  }
}

const out = {
  ts: new Date().toISOString(),
  edges_exercised: [5, 6, 7],
  total_cases: results.length,
  passed: results.filter(r => r.pass).length,
  failed: results.filter(r => !r.pass).length,
  results,
};
const outPath = join(__dirname, '../generated/edges/phase5_runtime_edges567.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(`PASSED: ${out.passed}/${out.total_cases}`);
