#!/usr/bin/env node
// Walk full-primary-chain sub-executions starting from TR harness exec IDs.
// Aggregates status, module_name, and depth reached into phase9 results.

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

// Canonical workflow IDs by acronym.
const WF_BY_ID = {
  'wI8hpSROxQI0zC9f': 'TR',
  'v9jih4jqeXpOJOiH': 'EC',
  'KhGmNpi0ZDmrnz8W': 'OR',
  'RwToPLa1ErHl2tUi': 'PL',
  'abqYINcXr3JAhGGk': 'DI',
  // Downstream (not required for scope but traced if reached):
};

async function getExec(id) {
  const r = await fetch(`${N8N_URL}/api/v1/executions/${id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' }
  });
  if (!r.ok) return { error: `${r.status}` };
  return r.json();
}

function extractTerminal(exec) {
  const rd = exec?.data?.resultData || {};
  const last = rd.lastNodeExecuted;
  if (!last) return { last: null, terminal: null };
  const runs = rd.runData?.[last];
  const j = runs?.[0]?.data?.main?.[0]?.[0]?.json || null;
  return { last, terminal: j };
}

function extractSubs(exec) {
  const rd = exec?.data?.resultData || {};
  const runData = rd.runData || {};
  const subs = [];
  for (const [node, runs] of Object.entries(runData)) {
    for (const run of runs) {
      const se = run.metadata?.subExecution;
      if (se?.executionId) subs.push({ node, exec_id: String(se.executionId), wf_id: se.workflowId });
    }
  }
  return subs;
}

async function walkChain(startExecId, label) {
  const chain = [];
  let current = String(startExecId);
  let depth = 0;
  while (current && depth < 20) {
    const exec = await getExec(current);
    if (!exec || exec.error) { chain.push({ depth, exec_id: current, error: exec?.error || 'missing' }); break; }
    const wfId = exec.execution?.workflowId || exec.workflowId;
    const acr = WF_BY_ID[wfId] || wfId;
    const term = extractTerminal(exec);
    const subs = extractSubs(exec);
    chain.push({
      depth,
      exec_id: current,
      wf_id: wfId,
      wf_acronym: acr,
      status: exec.execution?.status,
      last_node: term.last,
      terminal_status_kind: term.terminal?.status_kind || null,
      terminal_result_type: term.terminal?.result_type || null,
      terminal_module: term.terminal?.module_name || null,
      terminal_error_code: term.terminal?.error?.code || null,
      terminal_error_message: term.terminal?.error?.message || null,
      terminal_missing_fields: term.terminal?.error?.missing_fields || null,
      sub_execs: subs.map(s => ({ node: s.node, exec_id: s.exec_id, wf_acronym: WF_BY_ID[s.wf_id] || s.wf_id })),
    });
    // Continue walking the *last* sub-execution if any (the dispatched child).
    const next = subs[subs.length - 1]?.exec_id;
    if (!next) break;
    current = next;
    depth++;
  }
  return { label, start_exec_id: String(startExecId), chain, depth_reached: chain.length };
}

const SMOKE_CASES = [
  { label: 'smoke-01-happy', exec_id: 985, thread: '11111111-0000-0000-0000-000000000001', title: 'Apartament centru Ion' },
  { label: 'smoke-02-boundary', exec_id: 989, thread: '44444444-0000-0000-0000-000000000004', title: 'Proiect important A' },
  { label: 'smoke-03-persistence', exec_id: 993, thread: '55555555-0000-0000-0000-000000000005', title: 'Proiect important B' },
  { label: 'smoke-04-boundary2', exec_id: 997, thread: '66666666-0000-0000-0000-000000000006', title: 'Apartament Test Boundary' },
];

const results = [];
for (const c of SMOKE_CASES) {
  const w = await walkChain(c.exec_id, c.label);
  w.thread_id = c.thread;
  w.thread_title = c.title;
  results.push(w);
}

// Compute aggregate: how far each chain reached, and consensus terminal failure module.
const summary = {
  ts: new Date().toISOString(),
  cases: results.length,
  per_case: results.map(r => {
    const last = r.chain[r.chain.length - 1];
    const reached = r.chain.map(c => c.wf_acronym).join(' → ');
    return {
      label: r.label,
      thread_id: r.thread_id,
      thread_title: r.thread_title,
      start_exec_id: r.start_exec_id,
      chain_depth: r.depth_reached,
      chain_path: reached,
      terminal_wf: last?.wf_acronym || null,
      terminal_status_kind: last?.terminal_status_kind || null,
      terminal_module: last?.terminal_module || null,
      terminal_error_code: last?.terminal_error_code || null,
      terminal_error_message: last?.terminal_error_message || null,
      terminal_missing_fields: last?.terminal_missing_fields || null,
    };
  }),
  details: results,
};

const outPath = '/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase9_full_primary_chain_results.json';
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log('wrote', outPath);
console.log('per_case summary:');
for (const c of summary.per_case) {
  console.log(`  - ${c.label} [${c.chain_depth}] ${c.chain_path}`);
  console.log(`      terminal_wf=${c.terminal_wf} status=${c.terminal_status_kind} module=${c.terminal_module} err=${c.terminal_error_code}`);
}
