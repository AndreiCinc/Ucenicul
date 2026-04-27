#!/usr/bin/env node
// Drive the four Phase-8 runtime harnesses via their chat webhooks.
// For each case, POST chat input → capture sub-execution id → get_execution →
// record target-chain outcome. Persistent results written to
// tests/generated/edges/phase8_edge_1_4_runtime_results.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

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

const harnesses = JSON.parse(readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase8_runtime_harnesses.json','utf8'));
const manifest   = JSON.parse(readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase8_runtime_manifest.json','utf8'));

const harnessMap = {
  1: harnesses.edge1,
  2: harnesses.edge2,
  3: harnesses.edge3,
  4: harnesses.edge4,
};

async function postChat(webhookId, chatInput) {
  const url = `${N8N_URL}/webhook/${webhookId}/chat`;
  const body = { action: 'sendMessage', chatInput, sessionId: randomUUID() };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: r.ok, status: r.status, body: json };
}

async function findLatestExecutionOfWorkflow(workflowId, afterTs) {
  // Use /api/v1/executions with workflowId + limit
  const url = `${N8N_URL}/api/v1/executions?workflowId=${encodeURIComponent(workflowId)}&limit=5`;
  const r = await fetch(url, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
  if (!r.ok) throw new Error(`list execs ${r.status}`);
  const data = await r.json();
  const rows = data.data || [];
  for (const row of rows) {
    const t = new Date(row.startedAt || 0).getTime();
    if (t >= afterTs - 2000) return row;
  }
  return rows[0] || null;
}

async function getExecution(executionId) {
  const url = `${N8N_URL}/api/v1/executions/${executionId}?includeData=true`;
  const r = await fetch(url, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
  if (!r.ok) throw new Error(`get exec ${executionId} ${r.status}: ${await r.text()}`);
  return r.json();
}

function summarizeExecution(exec) {
  if (!exec) return { status: null, lastNode: null, error_code: null, sub_executions: [] };
  const rd = exec.data?.resultData || {};
  const runData = rd.runData || {};
  const lastNode = rd.lastNodeExecuted || null;
  const subExecutions = [];
  for (const [nodeName, runs] of Object.entries(runData)) {
    for (const run of runs) {
      const se = run.metadata?.subExecution;
      if (se?.executionId) subExecutions.push({ node: nodeName, ...se });
    }
  }
  // find terminal envelope — last node's output
  let terminalJson = null;
  if (lastNode && runData[lastNode]?.[0]?.data?.main?.[0]?.[0]?.json) {
    terminalJson = runData[lastNode][0].data.main[0][0].json;
  }
  const error_code = terminalJson?.error?.code
                   || terminalJson?.status_kind === 'failed' && (terminalJson?.error?.code || 'UNKNOWN_FAILED')
                   || null;
  return {
    status: exec.status,
    lastNode,
    error_code: error_code || null,
    terminal_status_kind: terminalJson?.status_kind || null,
    terminal_result_type: terminalJson?.result_type || null,
    sub_executions: subExecutions,
  };
}

const results = [];
let caseCounter = 0;
for (const edge of manifest.edges) {
  const h = harnessMap[edge.id];
  console.log(`EDGE ${edge.id} ${edge.name} via harness ${h.id} → target ${edge.target}`);
  for (const c of edge.cases) {
    caseCounter++;
    const before = Date.now();
    let fireResp = null;
    let fireErr = null;
    try { fireResp = await postChat(h.webhook, JSON.stringify(c.payload)); }
    catch (e) { fireErr = String(e); }
    if (fireErr) {
      results.push({ edge: edge.id, edge_name: edge.name, case_id: c.case_id, harness_id: h.id, fire_error: fireErr });
      console.log(`  case ${c.case_id} FIRE_ERR ${fireErr.slice(0,80)}`);
      continue;
    }
    // find the harness execution that just ran
    await new Promise(r => setTimeout(r, 200));
    let harnessExec;
    try { harnessExec = await findLatestExecutionOfWorkflow(h.id, before); }
    catch (e) { harnessExec = null; }
    if (!harnessExec) {
      results.push({ edge: edge.id, edge_name: edge.name, case_id: c.case_id, harness_id: h.id, note: 'no_harness_execution_found' });
      console.log(`  case ${c.case_id} no harness exec`);
      continue;
    }
    const fullExec = await getExecution(harnessExec.id);
    const summ = summarizeExecution(fullExec);
    // find the target sub-execution (the Invoke_Target node one)
    const targetSub = summ.sub_executions.find(x => x.node === 'Invoke_Target');
    let targetSumm = null;
    if (targetSub) {
      try {
        const texec = await getExecution(targetSub.executionId);
        targetSumm = summarizeExecution(texec);
        targetSumm.execution_id = targetSub.executionId;
        targetSumm.workflow_id = targetSub.workflowId;
      } catch (e) { targetSumm = { error: String(e).slice(0,200) }; }
    }
    results.push({
      edge: edge.id, edge_name: edge.name, case_id: c.case_id,
      harness_id: h.id, harness_exec_id: harnessExec.id,
      harness_status: summ.status, harness_last_node: summ.lastNode,
      harness_terminal_status_kind: summ.terminal_status_kind,
      harness_terminal_error_code: summ.error_code,
      target_id: edge.target,
      target_exec_id: targetSub?.executionId || null,
      target: targetSumm,
      chain_sub_executions: summ.sub_executions,
    });
    console.log(`  case ${c.case_id} harness ${harnessExec.id} status=${summ.status} target=${targetSub?.executionId || '—'}  terminal=${summ.terminal_status_kind||'—'}/${summ.error_code||'—'}`);
  }
}

const outPath = '/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase8_edge_1_4_runtime_results.json';
const summary = {
  ts: new Date().toISOString(),
  total: results.length,
  by_edge: {},
  results,
};
for (const r of results) {
  const k = r.edge_name;
  summary.by_edge[k] = summary.by_edge[k] || { total: 0, harness_success: 0, target_reached: 0, target_status_success: 0, target_status_failed: 0 };
  summary.by_edge[k].total++;
  if (r.harness_status === 'success') summary.by_edge[k].harness_success++;
  if (r.target_exec_id) summary.by_edge[k].target_reached++;
  if (r.target?.status === 'success') summary.by_edge[k].target_status_success++;
  if (r.target?.status === 'error' || r.target?.status === 'failed') summary.by_edge[k].target_status_failed++;
}
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log('wrote', outPath);
console.log('summary:', JSON.stringify(summary.by_edge, null, 2));
