#!/usr/bin/env node
// B11-PL test: walks already-fired TR-originated executions and asserts that
// PL_Generate_Plan's plan.steps[0].inputs contain per-intent structured fields
// extracted from planner_context.user_message_text (not just {action}).
//
// Usage:  node _walk_b11_pl_extraction.mjs <seeds.json>
// seeds.json shape: { cases: [ { label, tr_exec_id }, ... ] }
//
// Expected RED pre-fix, GREEN post-fix.

import { readFileSync, writeFileSync } from 'node:fs';

function loadEnv() {
  const raw = readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env', 'utf8');
  const env = {};
  for (const l of raw.split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].trim(); }
  return env;
}
const env = loadEnv();
const N8N_URL = env.N8N_URL.replace(/\/$/, '');
const API = { 'X-N8N-API-KEY': env.N8N_API_KEY, 'accept': 'application/json' };

const PL_ID = 'RwToPLa1ErHl2tUi';

// Per-label spec: field requirements + soft content match.
const SPEC_BY_LABEL = {
  'b11-pl-create_task': {
    expected_action: 'create_task', expected_module: 'task_module',
    required_fields: ['description'],
    description_contains_any: ['contract', 'proiect important']
  },
  'b11-pl-create_reminder': {
    expected_action: 'create_reminder', expected_module: 'reminder_module',
    required_fields: ['description', 'remind_at'],
    description_contains_any: ['proiect important'],
    remind_at_is_iso: true
  },
  'b11-pl-search_memory': {
    expected_action: 'search_memory', expected_module: 'memory_module',
    required_fields: ['memory_query'],
    memory_query_contains_any: ['contract', 'proiect important']
  },
  'b11-pl-capture_feedback': {
    expected_action: 'capture_feedback', expected_module: 'improvement_module',
    required_fields: ['feedback_text'],
    feedback_text_contains_any: ['mesaj vocal', 'reamintiri', 'sugestie']
  }
};

// Parent-execution index — maps exec_id → {parent, workflowId}, used to walk
// from a TR exec down to the PL descendant (since the public REST API strips
// subExecution.executionId).
let EXEC_INDEX_CACHE = null;
async function loadExecIndex() {
  if (EXEC_INDEX_CACHE) return EXEC_INDEX_CACHE;
  const index = {};
  let cursor = null;
  for (let page = 0; page < 6; page++) {
    const u = new URL(`${N8N_URL}/api/v1/executions`);
    u.searchParams.set('limit', '100');
    u.searchParams.set('includeData', 'true');
    if (cursor) u.searchParams.set('cursor', cursor);
    const r = await fetch(u, { headers: API });
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

async function findDescendantInWF(startExecId, targetWfId, maxDepth = 10) {
  const idx = await loadExecIndex();
  const queue = [[String(startExecId), 0]];
  const seen = new Set();
  while (queue.length) {
    const [cur, d] = queue.shift();
    if (d > maxDepth) continue;
    for (const [id, meta] of Object.entries(idx)) {
      if (meta.parent === cur && !seen.has(id)) {
        seen.add(id);
        if (meta.workflowId === targetWfId) return id;
        queue.push([id, d + 1]);
      }
    }
  }
  return null;
}

async function getExec(id) {
  const r = await fetch(`${N8N_URL}/api/v1/executions/${id}?includeData=true`, { headers: API });
  return r.json();
}
function getNodeJson(exec, nodeName) {
  return exec?.data?.resultData?.runData?.[nodeName]?.[0]?.data?.main?.[0]?.[0]?.json || null;
}

async function runCase({ label, tr_exec_id }) {
  const spec = SPEC_BY_LABEL[label];
  if (!spec) return { case: label, pass: false, reason: 'unknown label' };

  const plExecId = await findDescendantInWF(tr_exec_id, PL_ID);
  if (!plExecId) return { case: label, tr_exec_id, pass: false, reason: 'PL descendant not found in index' };

  const plExec = await getExec(plExecId);
  const gen = getNodeJson(plExec, 'PL_Generate_Plan');
  const step = gen?.payload?.steps?.[0] || null;
  const inputs = step?.inputs || {};

  const a = [];
  const pushA = (name, cond, got) => a.push({ name, pass: !!cond, got });

  pushA('pl_generate_plan_ran',    !!gen,                                        gen ? '(ran)' : null);
  pushA('step_exists',             !!step,                                       step ? '(present)' : null);
  pushA('inputs_action_matches',   inputs.action === spec.expected_action,       inputs.action);
  pushA('step_module_matches',     step?.module_name === spec.expected_module,   step?.module_name);

  for (const f of spec.required_fields) {
    const v = inputs[f];
    pushA(`inputs.${f}_present`, v !== undefined && v !== null && String(v).trim() !== '', v);
  }
  if (spec.description_contains_any) {
    const d = String(inputs.description || '').toLowerCase();
    pushA('description_contains_user_content', spec.description_contains_any.some(x => d.includes(x.toLowerCase())), inputs.description);
  }
  if (spec.remind_at_is_iso) {
    const v = String(inputs.remind_at || '');
    pushA('remind_at_is_iso8601', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v), v);
  }
  if (spec.memory_query_contains_any) {
    const q = String(inputs.memory_query || '').toLowerCase();
    pushA('memory_query_contains_user_content', spec.memory_query_contains_any.some(x => q.includes(x.toLowerCase())), inputs.memory_query);
  }
  if (spec.feedback_text_contains_any) {
    const t = String(inputs.feedback_text || '').toLowerCase();
    pushA('feedback_text_contains_user_content', spec.feedback_text_contains_any.some(x => t.includes(x.toLowerCase())), inputs.feedback_text);
  }
  const failed = a.filter(x => !x.pass);
  return { case: label, tr_exec_id, pl_exec_id: plExecId, pass: failed.length === 0, step_inputs: inputs, assertions: a, failed };
}

const seedsPath = process.argv[2];
if (!seedsPath) { console.error('usage: node _walk_b11_pl_extraction.mjs <seeds.json>'); process.exit(2); }
const seeds = JSON.parse(readFileSync(seedsPath, 'utf8'));
if (!Array.isArray(seeds.cases)) { console.error('seeds.cases missing'); process.exit(2); }

const results = [];
for (const c of seeds.cases) results.push(await runCase(c));

const passed = results.filter(r => r.pass).length;
console.log(`\nB11-PL extraction: ${passed}/${results.length} passed`);
for (const r of results) {
  console.log(`  ${r.pass ? '✅' : '❌'} ${r.case}  tr=${r.tr_exec_id} pl=${r.pl_exec_id || '(none)'}`);
  if (!r.pass) {
    if (r.reason) console.log('      reason:', r.reason);
    if (r.step_inputs) console.log('      step_inputs:', JSON.stringify(r.step_inputs));
    for (const f of (r.failed || [])) console.log('        ✗', f.name, 'got=', JSON.stringify(f.got));
  }
}

writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase12_b11_pl_results.json', JSON.stringify({
  ts: new Date().toISOString(), phase: 'phase12', suite: 'b11_pl_extraction',
  total: results.length, passed, results
}, null, 2));

if (passed < results.length) process.exit(1);
