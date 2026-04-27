#!/usr/bin/env node
// Fetch detailed outcomes for the 40 Phase-8 runtime harness executions and
// aggregate into phase8_edge_1_4_runtime_results.json.

import { readFileSync, writeFileSync } from 'node:fs';

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

// Harness execution IDs by edge.
const HARNESS_EXECS = {
  1: [873, 907, 911, 915, 919, 923, 927, 931, 935, 939],
  2: [877, 880, 883, 886, 889, 892, 895, 898, 901, 904],
  3: [943, 945, 947, 949, 951, 953, 955, 957, 959, 961],
  4: [963, 965, 967, 969, 971, 973, 975, 977, 979, 981],
};

const EDGE_META = {
  1: { name: 'TR→EC', target: 'v9jih4jqeXpOJOiH', harness: 'UNPzQUgmTK4VjVPQ' },
  2: { name: 'EC→OR', target: 'KhGmNpi0ZDmrnz8W', harness: 'H0HOwjUGzlpLwBHg' },
  3: { name: 'OR→PL', target: 'RwToPLa1ErHl2tUi', harness: 'NYJPNtoiwdZM1lJY' },
  4: { name: 'PL→DI', target: 'abqYINcXr3JAhGGk', harness: 'R7Ji7JhT6430c76k' },
};

async function getExecution(executionId) {
  const url = `${N8N_URL}/api/v1/executions/${executionId}?includeData=true`;
  const r = await fetch(url, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
  if (!r.ok) return { error: `${r.status} ${await r.text().then(t=>t.slice(0,150))}` };
  return r.json();
}

function summarizeExecution(exec) {
  if (!exec || exec.error) return { fetch_error: exec?.error || 'missing' };
  const rd = exec.data?.resultData || {};
  const runData = rd.runData || {};
  const lastNode = rd.lastNodeExecuted || null;
  const subs = [];
  for (const [nodeName, runs] of Object.entries(runData)) {
    for (const run of runs) {
      const se = run.metadata?.subExecution;
      if (se?.executionId) subs.push({ node: nodeName, exec_id: se.executionId, wf_id: se.workflowId });
    }
  }
  let terminalJson = null;
  if (lastNode && runData[lastNode]?.[0]?.data?.main?.[0]?.[0]?.json) {
    terminalJson = runData[lastNode][0].data.main[0][0].json;
  }
  return {
    status: exec.status,
    lastNode,
    terminal_status_kind: terminalJson?.status_kind || null,
    terminal_result_type: terminalJson?.result_type || null,
    terminal_error_code: terminalJson?.error?.code || null,
    sub_executions: subs,
  };
}

const results = [];
for (const [edgeIdStr, execs] of Object.entries(HARNESS_EXECS)) {
  const edgeId = Number(edgeIdStr);
  const meta = EDGE_META[edgeId];
  for (let i=0; i<execs.length; i++) {
    const caseId = i+1;
    const hid = execs[i];
    const hexec = await getExecution(hid);
    const hsum = summarizeExecution(hexec);
    const targetSub = hsum.sub_executions?.find(s => s.node === 'Invoke_Target');
    let tsum = null;
    if (targetSub) {
      const texec = await getExecution(targetSub.exec_id);
      tsum = summarizeExecution(texec);
      tsum.exec_id = targetSub.exec_id;
      tsum.wf_id = targetSub.wf_id;
    }
    results.push({
      edge: edgeId, edge_name: meta.name, case_id: caseId,
      harness_id: meta.harness, harness_exec_id: String(hid),
      harness_status: hsum.status,
      harness_terminal_status_kind: hsum.terminal_status_kind,
      harness_terminal_error_code: hsum.terminal_error_code,
      target_id: meta.target,
      target: tsum,
      chain_sub_executions: hsum.sub_executions || [],
    });
    process.stdout.write('.');
  }
  process.stdout.write(` edge${edgeId} done\n`);
}

const by_edge = {};
for (const r of results) {
  const k = r.edge_name;
  by_edge[k] = by_edge[k] || { total: 0, harness_success: 0, target_reached: 0, target_status_success: 0, target_status_failed: 0, target_terminal_success: 0, target_terminal_failed: 0, target_error_codes: {} };
  by_edge[k].total++;
  if (r.harness_status === 'success') by_edge[k].harness_success++;
  if (r.target?.exec_id) by_edge[k].target_reached++;
  if (r.target?.status === 'success') by_edge[k].target_status_success++;
  if (r.target?.status === 'error' || r.target?.status === 'failed') by_edge[k].target_status_failed++;
  if (r.target?.terminal_status_kind === 'success') by_edge[k].target_terminal_success++;
  if (r.target?.terminal_status_kind === 'failed') by_edge[k].target_terminal_failed++;
  const ec = r.target?.terminal_error_code;
  if (ec) by_edge[k].target_error_codes[ec] = (by_edge[k].target_error_codes[ec] || 0) + 1;
}

const summary = { ts: new Date().toISOString(), total: results.length, by_edge, results };
const outPath = '/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase8_edge_1_4_runtime_results.json';
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log('wrote', outPath);
console.log('by_edge:', JSON.stringify(by_edge, null, 2));
