#!/usr/bin/env node
// Phase-11 TR-originated full-primary-chain walker.
// After applying the PL action-propagation fix + ME module-expansion patch,
// walks TR harness exec IDs through the full sub-execution tree to assert
// traversal now reaches MO for non-task modules too (reminder, memory,
// improvement, watcher).

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

// Canonical workflow IDs by acronym (hard-coded pins).
const WF_BY_ID = {
  'wI8hpSROxQI0zC9f': 'TR',
  'v9jih4jqeXpOJOiH': 'EC',
  'KhGmNpi0ZDmrnz8W': 'OR',
  'RwToPLa1ErHl2tUi': 'PL',
  'abqYINcXr3JAhGGk': 'DI',
  'uq26nh1grIpnHju0': 'ME',
  '5RcNLtxNjAHJsZPE': 'RA',
};

async function getExec(id) {
  const r = await fetch(`${N8N_URL}/api/v1/executions/${id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' }
  });
  if (!r.ok) return { error: `${r.status}` };
  return r.json();
}

// Public REST API strips subExecution.executionId, so we find child execs by
// scanning recent executions and matching parentExecution metadata.
let EXEC_INDEX_CACHE = null;
async function loadExecIndex() {
  if (EXEC_INDEX_CACHE) return EXEC_INDEX_CACHE;
  const index = {}; // exec_id -> parent_exec_id
  let cursor = null;
  for (let page = 0; page < 6; page++) {
    const u = new URL(`${N8N_URL}/api/v1/executions`);
    u.searchParams.set('limit', '100');
    u.searchParams.set('includeData', 'true');
    if (cursor) u.searchParams.set('cursor', cursor);
    const r = await fetch(u, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
    if (!r.ok) break;
    const j = await r.json();
    for (const ex of (j.data || [])) {
      const rd = ex.data?.resultData?.runData || {};
      let parent = null;
      for (const runs of Object.values(rd)) {
        const pe = runs?.[0]?.metadata?.parentExecution?.executionId;
        if (pe) { parent = String(pe); break; }
      }
      index[String(ex.id)] = { parent, workflowId: ex.workflowId };
    }
    cursor = j.nextCursor;
    if (!cursor) break;
  }
  EXEC_INDEX_CACHE = index;
  return index;
}

async function findChildExec(parentId) {
  const idx = await loadExecIndex();
  const candidates = Object.entries(idx).filter(([, v]) => v.parent === String(parentId));
  // Prefer the one whose exec_id is closest (smallest positive delta) — direct child.
  candidates.sort((a, b) => Number(a[0]) - Number(b[0]));
  if (!candidates.length) return null;
  return { exec_id: candidates[0][0], workflowId: candidates[0][1].workflowId };
}

async function listWorkflows() {
  const r = await fetch(`${N8N_URL}/api/v1/workflows?limit=100`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' }
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j.data || [];
}

// Backfill WF_BY_ID for remaining acronyms via name match (SU, RC, MO, etc.)
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

// Map ME handler node name → module_name. Even when the handler emits an
// _error shape (no module_result wrapper), the handler name pins the module.
const HANDLER_TO_MODULE = {
  ME_Task_Create_Result: 'task_module',
  ME_Task_Update_Result: 'task_module',
  ME_Task_Cancel_Result: 'task_module',
  ME_Task_Status_Result: 'task_module',
  ME_Reminder_Create_Result: 'reminder_module',
  ME_Reminder_List_Result: 'reminder_module',
  ME_Reminder_Update_Result: 'reminder_module',
  ME_Reminder_Cancel_Result: 'reminder_module',
  ME_Memory_Store_Result: 'memory_module',
  ME_Memory_Search_Result: 'memory_module',
  ME_Improvement_Capture_Result: 'improvement_module',
  ME_Watcher_Observe_Result: 'watcher_module_basic',
};

function extractMEModuleInfo(exec) {
  const rd = exec?.data?.resultData || {};
  const runData = rd.runData || {};
  for (const c of Object.keys(HANDLER_TO_MODULE)) {
    const j = runData[c]?.[0]?.data?.main?.[0]?.[0]?.json;
    if (j) {
      const isError = j._error === true || j.status_kind === 'error';
      return {
        handler: c,
        module_name: j?.module_result?.module_name || HANDLER_TO_MODULE[c],
        action: j?.module_result?.actions_executed?.[0]?.action || null,
        status_kind: j?.status_kind || (isError ? 'error' : null),
        error_code: j?.error_code || j?.error?.code || null,
        missing_fields: j?.missing_fields || j?.error?.missing_fields || null,
        artifacts: (j?.module_result?.artifacts || []).map(a => a.type)
      };
    }
  }
  return null;
}

async function walkChain(startExecId, label) {
  const chain = [];
  let current = String(startExecId);
  let depth = 0;
  while (current && depth < 25) {
    const exec = await getExec(current);
    if (!exec || exec.error) { chain.push({ depth, exec_id: current, error: exec?.error || 'missing' }); break; }
    const wfId = exec.execution?.workflowId || exec.workflowId;
    const acr = WF_BY_ID[wfId] || wfId;
    const term = extractTerminal(exec);
    const subs = extractSubs(exec);
    const meInfo = (acr === 'ME') ? extractMEModuleInfo(exec) : null;
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
      me_handler: meInfo?.handler || null,
      me_module: meInfo?.module_name || null,
      me_action: meInfo?.action || null,
      me_status_kind: meInfo?.status_kind || null,
      me_artifacts: meInfo?.artifacts || null,
      sub_execs: subs.map(s => ({ node: s.node, exec_id: s.exec_id, wf_acronym: WF_BY_ID[s.wf_id] || s.wf_id })),
    });
    let next = subs[subs.length - 1]?.exec_id;
    if (!next) {
      const child = await findChildExec(current);
      if (child) next = child.exec_id;
    }
    if (!next) break;
    current = next;
    depth++;
  }
  return { label, start_exec_id: String(startExecId), chain, depth_reached: chain.length };
}

const SMOKE_CASES = [
  { label: 'p11-chain-01-create_task',      exec_id: 1110, thread: '44444444-0000-0000-0000-000000000004', intent: 'create_task',     expect_me_module: 'task_module' },
  { label: 'p11-chain-02-create_reminder',  exec_id: 1117, thread: '55555555-0000-0000-0000-000000000005', intent: 'create_reminder', expect_me_module: 'reminder_module' },
  { label: 'p11-chain-03-search_memory',    exec_id: 1124, thread: '77777777-0000-0000-0000-000000000007', intent: 'search_memory',   expect_me_module: 'memory_module' },
  { label: 'p11-chain-04-save_suggestion',  exec_id: 1131, thread: '88888888-0000-0000-0000-000000000008', intent: 'save_suggestion', expect_me_module: 'improvement_module' },
];

const results = [];
for (const c of SMOKE_CASES) {
  const w = await walkChain(c.exec_id, c.label);
  w.thread_id = c.thread;
  w.expected_intent = c.intent;
  w.expected_me_module = c.expect_me_module;
  results.push(w);
}

const summary = {
  ts: new Date().toISOString(),
  phase: 'phase11',
  scope: 'TR-originated full primary chain after Phase-11 PL action-propagation + ME module-expansion',
  cases: results.length,
  wf_by_id: WF_BY_ID,
  per_case: results.map(r => {
    const last = r.chain[r.chain.length - 1];
    const reached = r.chain.map(c => c.wf_acronym).join(' → ');
    const meNode = r.chain.find(c => c.wf_acronym === 'ME');
    return {
      label: r.label,
      thread_id: r.thread_id,
      expected_intent: r.expected_intent,
      expected_me_module: r.expected_me_module,
      start_exec_id: r.start_exec_id,
      chain_depth: r.depth_reached,
      chain_path: reached,
      terminal_wf: last?.wf_acronym || null,
      terminal_status_kind: last?.terminal_status_kind || null,
      terminal_error_code: last?.terminal_error_code || null,
      me_handler: meNode?.me_handler || null,
      me_module: meNode?.me_module || null,
      me_action: meNode?.me_action || null,
      me_status_kind: meNode?.me_status_kind || null,
      me_module_match: meNode?.me_module === r.expected_me_module
    };
  }),
  details: results,
};

const outPath = '/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase11_chain_results.json';
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log('wrote', outPath);
console.log('per_case summary:');
for (const c of summary.per_case) {
  console.log(`  - ${c.label} [${c.chain_depth}] ${c.chain_path}`);
  console.log(`      terminal_wf=${c.terminal_wf} status=${c.terminal_status_kind} err=${c.terminal_error_code}`);
  console.log(`      ME: handler=${c.me_handler} module=${c.me_module} action=${c.me_action} status=${c.me_status_kind} module_match=${c.me_module_match}`);
}

const reachedMO = summary.per_case.filter(c => c.terminal_wf === 'MO').length;
const meModuleMatches = summary.per_case.filter(c => c.me_module_match).length;
console.log(`\nsummary: ${reachedMO}/${summary.per_case.length} reached MO; ${meModuleMatches}/${summary.per_case.length} ME module matched expected`);
