#!/usr/bin/env node
// Phase-12.3 TR→MO walker.
// For each TR exec, walks forward via timestamp-proximity through
// EC→OR→PL→DI→ME→RA→SU→RC→MO; at RA inspects RA_Build_Downstream_Envelope
// and asserts aggregated_result.status === 'success'.
import { readFileSync, writeFileSync } from 'node:fs';

function loadEnv(){const raw=readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env','utf8');const env={};for(const l of raw.split('\n')){const m=l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);if(m)env[m[1]]=m[2].trim();}return env;}
const env=loadEnv();
const N8N_URL=env.N8N_URL.replace(/\/$/,'');
const API={'X-N8N-API-KEY':env.N8N_API_KEY,'accept':'application/json'};

const WFS = {
  TR: 'wI8hpSROxQI0zC9f', EC: 'v9jih4jqeXpOJOiH', OR: 'KhGmNpi0ZDmrnz8W',
  PL: 'RwToPLa1ErHl2tUi', DI: 'abqYINcXr3JAhGGk', ME: 'uq26nh1grIpnHju0',
  RA: '5RcNLtxNjAHJsZPE', SU: 'ENiYNfL3ul8AmmCB', RC: 'TClXgmO8H8zsSwMb',
  MO: 'OooZdC0DgsDR6gm0'
};

async function getExec(id){
  const r = await fetch(`${N8N_URL}/api/v1/executions/${id}?includeData=true`, { headers: API });
  return r.json();
}
async function listNear(wfId, tsIso, win = 90000) {
  const r = await fetch(`${N8N_URL}/api/v1/executions?workflowId=${wfId}&limit=25`, { headers: API });
  const j = await r.json();
  const t = new Date(tsIso).getTime();
  const cands = (j.data || [])
    .map(e => ({ id: e.id, startedAt: e.startedAt, status: e.status, delta: new Date(e.startedAt).getTime() - t }))
    .filter(e => e.delta >= -2000 && e.delta <= win)
    .sort((a, b) => a.delta - b.delta);
  return cands[0] || null;
}
function findRunWhere(exec, nodeName, predicate) {
  const runs = exec?.data?.resultData?.runData?.[nodeName] || null;
  if (!runs) return null;
  for (const r of runs) {
    const j = r?.data?.main?.[0]?.[0]?.json;
    if (j && predicate(j)) return j;
  }
  return null;
}
function getNodeJson(exec, nodeName, runIdx = 0) {
  const runs = exec?.data?.resultData?.runData?.[nodeName] || null;
  return runs?.[runIdx]?.data?.main?.[0]?.[0]?.json || null;
}

const CASES = [
  { label: 'p12-3-01-create_task',      tr_exec_id: '1314', expect_module: 'task_module',        expect_agg_status: 'success' },
  { label: 'p12-3-02-create_reminder',  tr_exec_id: '1328', expect_module: 'reminder_module',    expect_agg_status: 'success' },
  { label: 'p12-3-03-search_memory',    tr_exec_id: '1342', expect_module: 'memory_module',      expect_agg_status: 'success' },
  { label: 'p12-3-04-save_suggestion',  tr_exec_id: '1356', expect_module: 'improvement_module', expect_agg_status: 'success' },
];

const results = [];
for (const c of CASES) {
  const trExec = await getExec(c.tr_exec_id);
  const trTs = trExec.startedAt || trExec.createdAt;
  const hops = [{ wf: 'TR', exec_id: c.tr_exec_id, status: trExec.status, ts: trTs }];

  // Walk forward TR→EC→OR→PL→DI→ME→RA→SU→RC→MO via timestamp proximity
  const order = ['EC','OR','PL','DI','ME','RA','SU','RC','MO'];
  let prevTs = trTs;
  for (const step of order) {
    const cand = await listNear(WFS[step], prevTs, 90000);
    if (!cand) { hops.push({ wf: step, exec_id: null, error: 'not_found' }); break; }
    hops.push({ wf: step, exec_id: cand.id, status: cand.status, delta_ms: cand.delta });
    prevTs = cand.startedAt;
  }

  // Inspect RA hop if present
  const raHop = hops.find(h => h.wf === 'RA' && h.exec_id);
  let ra_env = null, agg = null, obs_codes = [], fup_codes = [];
  if (raHop) {
    const raExec = await getExec(raHop.exec_id);
    ra_env = findRunWhere(raExec, 'RA_Build_Downstream_Envelope', j => j && j.result_type === 'aggregated_result')
          || getNodeJson(raExec, 'RA_Build_Downstream_Envelope', 0);
    agg = ra_env?.aggregated_result || null;
    obs_codes = (agg?.observations || []).map(o => o?.code || o?.error_code).filter(Boolean);
    fup_codes = (agg?.followup_requests || []).map(f => f?.code || f?.error_code).filter(Boolean);
  }

  // Inspect ME hop to confirm module handler path
  const meHop = hops.find(h => h.wf === 'ME' && h.exec_id);
  let me_handler = null, me_module = null, me_status_kind = null;
  if (meHop) {
    const meExec = await getExec(meHop.exec_id);
    const HANDLERS = ['ME_Task_Create_Result','ME_Reminder_Create_Result','ME_Memory_Search_Result','ME_Improvement_Capture_Result'];
    for (const h of HANDLERS) {
      const j = getNodeJson(meExec, h, 0);
      if (j) {
        me_handler = h;
        me_module = j?.module_result?.module_name || null;
        me_status_kind = j?.status_kind || (j?._error ? 'error' : null);
        break;
      }
    }
  }

  const reachedMO = hops.some(h => h.wf === 'MO' && h.exec_id);
  const agg_status = agg?.status || null;
  // Canonical RA envelope uses `module_names[]` + `module_results_count`, NOT `module_results[]`.
  const agg_modules = Array.isArray(agg?.module_names) ? agg.module_names.slice() : [];
  const agg_count   = typeof agg?.module_results_count === 'number' ? agg.module_results_count : null;
  const agg_actions = (agg?.actions_executed || []).map(a => a?.action).filter(Boolean);
  const per_status  = agg?.per_status_counts || null;
  const needs_followup = agg?.needs_followup === true;
  const pass =
    reachedMO &&
    agg_status === c.expect_agg_status &&
    agg_modules.includes(c.expect_module) &&
    agg_count === 1 &&
    per_status && per_status.failed === 0 &&
    needs_followup === false &&
    obs_codes.filter(co => co === 'MISSING_REQUIRED_FIELDS').length === 0 &&
    fup_codes.filter(co => co === 'MISSING_REQUIRED_FIELDS').length === 0;

  results.push({
    label: c.label, tr_exec_id: c.tr_exec_id,
    hops: hops.map(h => `${h.wf}${h.exec_id ? ':' + h.exec_id : ''}`).join(' → '),
    reached_MO: reachedMO,
    ra_exec_id: raHop?.exec_id || null,
    me_handler, me_module, me_status_kind,
    agg_status, agg_modules, agg_count, agg_actions, per_status, needs_followup,
    obs_codes, fup_codes,
    expected_module: c.expect_module, expected_agg_status: c.expect_agg_status,
    pass,
  });
}

const passed = results.filter(r => r.pass).length;
console.log(`\nPhase-12.3 TR→MO: ${passed}/${results.length} passed\n`);
for (const r of results) {
  console.log(`  ${r.pass ? '✅' : '❌'} ${r.label}`);
  console.log(`       hops: ${r.hops}`);
  console.log(`       ME: handler=${r.me_handler} module=${r.me_module} status_kind=${r.me_status_kind}`);
  console.log(`       RA: exec=${r.ra_exec_id} agg_status=${r.agg_status} modules=${JSON.stringify(r.agg_modules)} count=${r.agg_count} actions=${JSON.stringify(r.agg_actions)} per_status=${JSON.stringify(r.per_status)} needs_followup=${r.needs_followup} obs=${JSON.stringify(r.obs_codes)} fup=${JSON.stringify(r.fup_codes)}`);
}

writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase12_3_chain_results.json', JSON.stringify({
  ts: new Date().toISOString(), phase: 'phase12.3',
  scope: 'TR-originated full primary chain after B11-PL field alignment (v1.3)',
  total: results.length, passed, results
}, null, 2));

if (passed < results.length) process.exit(1);
