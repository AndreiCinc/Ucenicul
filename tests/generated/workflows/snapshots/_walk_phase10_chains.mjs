#!/usr/bin/env node
// Phase-10 TR-originated full-primary-chain walker.
// Walks TR harness exec IDs through sub-executions to see the full traversal
// reach depth (TR → EC → OR → PL → DI → ME → RA → SU → RC → MO).

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
const N8N_URL = env.N8N_URL.replace(/\/$/, '');
const N8N_API_KEY = env.N8N_API_KEY;

// Canonical workflow IDs by acronym (full primary chain).
const WF_BY_ID = {
  'wI8hpSROxQI0zC9f': 'TR',
  'v9jih4jqeXpOJOiH': 'EC',
  'KhGmNpi0ZDmrnz8W': 'OR',
  'RwToPLa1ErHl2tUi': 'PL',
  'abqYINcXr3JAhGGk': 'DI',
};

async function getExec(id) {
  const r = await fetch(`${N8N_URL}/api/v1/executions/${id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' }
  });
  if (!r.ok) return { error: `${r.status}` };
  return r.json();
}

async function listWorkflows() {
  const r = await fetch(`${N8N_URL}/api/v1/workflows?limit=100`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' }
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j.data || [];
}

// Populate WF_BY_ID dynamically for remaining WFs (ME, RA, SU, RC, MO) so the
// walker can label them without hard-coding guesses.
const wfs = await listWorkflows();
for (const w of wfs) {
  const name = w.name || '';
  const m = name.match(/^WF-(TR|EC|OR|PL|DI|ME|RA|SU|RC|MO)-01/);
  if (m && !WF_BY_ID[w.id]) WF_BY_ID[w.id] = m[1];
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

// Extract planner_context presence / content from OR build handoff node if visible.
function extractPlannerContext(exec) {
  const rd = exec?.data?.resultData || {};
  const runData = rd.runData || {};
  // Look at OR_Build_Handoff_Payload specifically.
  const build = runData.OR_Build_Handoff_Payload?.[0]?.data?.main?.[0]?.[0]?.json;
  if (!build) return null;
  return build.payload?.planner_context || null;
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
    const planner = (acr === 'OR') ? extractPlannerContext(exec) : null;
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
      or_planner_context: planner,
      sub_execs: subs.map(s => ({ node: s.node, exec_id: s.exec_id, wf_acronym: WF_BY_ID[s.wf_id] || s.wf_id })),
    });
    const next = subs[subs.length - 1]?.exec_id;
    if (!next) break;
    current = next;
    depth++;
  }
  return { label, start_exec_id: String(startExecId), chain, depth_reached: chain.length };
}

const SMOKE_CASES = [
  { label: 'p10-smoke-01', exec_id: 1005, thread: '11111111-0000-0000-0000-000000000001', title: 'Apartament centru Ion', intent: 'update_task' },
  { label: 'p10-smoke-02', exec_id: 1011, thread: '44444444-0000-0000-0000-000000000004', title: 'Proiect important A', intent: 'create_task' },
  { label: 'p10-smoke-03', exec_id: 1017, thread: '55555555-0000-0000-0000-000000000005', title: 'Proiect important B', intent: 'create_reminder' },
  { label: 'p10-smoke-04', exec_id: 1023, thread: '66666666-0000-0000-0000-000000000006', title: 'Apartament Test Boundary', intent: 'update_task' },
];

const results = [];
for (const c of SMOKE_CASES) {
  const w = await walkChain(c.exec_id, c.label);
  w.thread_id = c.thread;
  w.thread_title = c.title;
  w.expected_intent = c.intent;
  results.push(w);
}

const summary = {
  ts: new Date().toISOString(),
  phase: 'phase10',
  scope: 'TR-originated full primary chain after OR Phase-10 + Phase-10b patch (planner_context.user_message_text + primary_intent)',
  cases: results.length,
  wf_by_id: WF_BY_ID,
  per_case: results.map(r => {
    const last = r.chain[r.chain.length - 1];
    const reached = r.chain.map(c => c.wf_acronym).join(' → ');
    return {
      label: r.label,
      thread_id: r.thread_id,
      thread_title: r.thread_title,
      expected_intent: r.expected_intent,
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

const outPath = '/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase10_rerun_results.json';
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log('wrote', outPath);
console.log('per_case summary:');
for (const c of summary.per_case) {
  console.log(`  - ${c.label} [${c.chain_depth}] ${c.chain_path}`);
  console.log(`      terminal_wf=${c.terminal_wf} status=${c.terminal_status_kind} module=${c.terminal_module} err=${c.terminal_error_code}`);
}
