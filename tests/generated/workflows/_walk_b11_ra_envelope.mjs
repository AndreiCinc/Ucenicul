#!/usr/bin/env node
// B11-RA test: loads ME exec IDs (each known to produce a module_error envelope
// at the handler stage) and asserts that ME's SUBCALL into RA now yields a
// canonical aggregated_result (status=failed) instead of INVALID_AGGREGATION_INPUT.
//
// Because RA-01 has a side-channel RA_Status_Summary node that shares the
// RA_Return_Result terminal with the canonical RA_Build_Downstream_Envelope,
// n8n's ExecuteWorkflow returns only the last run at that terminal (often the
// `_debug_summary`). To assert the canonical contract we (a) identify the RA
// sub-execution triggered by ME (via timestamp-proximity scan) and (b) inspect
// RA_Build_Downstream_Envelope directly in that sub-exec.
//
// Usage:  node _walk_b11_ra_envelope.mjs <seeds.json>
// seeds.json shape: { cases: [ { label, me_exec_id, expected_error_code? }, ... ] }
//
// Assertions (per case):
//   - me_build_ra_envelope_ran   : B11-RA node actually produced an envelope
//   - me_emits_module_batch      : ME_Build_RA_Envelope output has result_type=module_batch
//   - me_subcall_ran             : SUBCALL node actually executed
//   - not_invalid_aggregation_input : SUBCALL output is NOT a canonical RA reject
//   - ra_subexec_located         : RA sub-exec found by timestamp proximity
//   - ra_emits_aggregated_result : RA_Build_Downstream_Envelope has result_type=aggregated_result
//   - aggregated_status_is_failed: aggregated_result.status === 'failed'
//   - one_module_result          : aggregated_result.module_results_count === 1
//   - error_code_preserved       : aggregated_result carries the original error_code
//                                  (in observations or followup_requests)

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
const RA_WF_ID = '5RcNLtxNjAHJsZPE';

async function getExec(id) {
  const r = await fetch(`${N8N_URL}/api/v1/executions/${id}?includeData=true`, { headers: API });
  return r.json();
}
async function listRaExecsNear(tsIso, windowMs = 30000) {
  const r = await fetch(`${N8N_URL}/api/v1/executions?workflowId=${RA_WF_ID}&limit=25`, { headers: API });
  const j = await r.json();
  const t = new Date(tsIso).getTime();
  // Pick the earliest RA exec whose startedAt is >= parent ts (but within window)
  const cands = (j.data || [])
    .map(e => ({ id: e.id, startedAt: e.startedAt, delta: new Date(e.startedAt).getTime() - t }))
    .filter(e => e.delta >= -2000 && e.delta <= windowMs)
    .sort((a, b) => a.delta - b.delta);
  return cands[0] || null;
}
function getNodeRuns(exec, nodeName) {
  return exec?.data?.resultData?.runData?.[nodeName] || null;
}
function getNodeJsonRun(exec, nodeName, runIdx = 0) {
  const runs = getNodeRuns(exec, nodeName);
  if (!runs || !runs[runIdx]) return null;
  return runs[runIdx]?.data?.main?.[0]?.[0]?.json || null;
}
function findRunWhere(exec, nodeName, predicate) {
  const runs = getNodeRuns(exec, nodeName);
  if (!runs) return null;
  for (const r of runs) {
    const j = r?.data?.main?.[0]?.[0]?.json;
    if (j && predicate(j)) return j;
  }
  return null;
}

async function runCase({ label, me_exec_id, expected_error_code }) {
  const meExec = await getExec(me_exec_id);
  const buildEnvOut = getNodeJsonRun(meExec, 'ME_Build_RA_Envelope', 0);
  const subcallOut  = getNodeJsonRun(meExec, 'ME_Dispatch_To_RA_01_SUBCALL', 0);
  const meStartedAt = meExec?.startedAt || meExec?.data?.startedAt || meExec?.createdAt;

  // Locate RA sub-exec by timestamp proximity
  let raCand = null, raExec = null, raEnvOut = null;
  if (meStartedAt) {
    raCand = await listRaExecsNear(meStartedAt, 60000);
    if (raCand) {
      raExec = await getExec(raCand.id);
      // RA_Build_Downstream_Envelope is the canonical aggregated_result emitter
      raEnvOut = findRunWhere(raExec, 'RA_Build_Downstream_Envelope', j => j && j.result_type === 'aggregated_result')
              || getNodeJsonRun(raExec, 'RA_Build_Downstream_Envelope', 0);
    }
  }

  const a = [];
  const push = (name, cond, got) => a.push({ name, pass: !!cond, got });

  push('me_build_ra_envelope_ran', !!buildEnvOut, buildEnvOut ? '(ran)' : null);
  push('me_emits_module_batch',    buildEnvOut && buildEnvOut.result_type === 'module_batch' && buildEnvOut.status_kind === 'success', buildEnvOut?.result_type);
  push('me_subcall_ran',           !!subcallOut, subcallOut ? '(ran)' : null);

  // SUBCALL must not be the pre-fix canonical RA reject
  const isInvalidAggr = !!subcallOut && subcallOut.status_kind === 'error' && subcallOut.result_type === 'aggregation_error' && subcallOut.error?.code === 'INVALID_AGGREGATION_INPUT';
  push('not_invalid_aggregation_input', subcallOut && !isInvalidAggr, subcallOut?.error?.code || subcallOut?.result_type || '(no subcall)');

  push('ra_subexec_located', !!raCand, raCand ? { id: raCand.id, delta_ms: raCand.delta } : null);
  push('ra_emits_aggregated_result', raEnvOut && raEnvOut.result_type === 'aggregated_result' && raEnvOut.status_kind === 'success', raEnvOut?.result_type);

  const ag = raEnvOut?.aggregated_result || null;
  if (ag) {
    push('aggregated_status_is_failed', ag.status === 'failed', ag.status);
    push('one_module_result',            ag.module_results_count === 1, ag.module_results_count);
    const obsCodes = (ag.observations || []).map(o => o?.code || o?.error_code).filter(Boolean);
    const fupCodes = (ag.followup_requests || []).map(f => f?.code || f?.error_code).filter(Boolean);
    const allCodes = [...obsCodes, ...fupCodes];
    const has = expected_error_code ? allCodes.includes(expected_error_code) : allCodes.length > 0;
    push('error_code_preserved', has, { expected: expected_error_code, found: allCodes });
  } else {
    push('aggregated_status_is_failed', false, '(no aggregated_result)');
    push('one_module_result',            false, '(no aggregated_result)');
    push('error_code_preserved',         false, '(no aggregated_result)');
  }

  const failed = a.filter(x => !x.pass);
  return {
    case: label, me_exec_id, ra_exec_id: raCand?.id || null,
    build_env_out: buildEnvOut, subcall_out: subcallOut, ra_env_out: raEnvOut,
    pass: failed.length === 0, assertions: a, failed
  };
}

const seedsPath = process.argv[2];
if (!seedsPath) { console.error('usage: node _walk_b11_ra_envelope.mjs <seeds.json>'); process.exit(2); }
const seeds = JSON.parse(readFileSync(seedsPath, 'utf8'));
if (!Array.isArray(seeds.cases)) { console.error('seeds.cases missing'); process.exit(2); }

const results = [];
for (const c of seeds.cases) results.push(await runCase(c));

const passed = results.filter(r => r.pass).length;
console.log(`\nB11-RA envelope wrap: ${passed}/${results.length} passed`);
for (const r of results) {
  console.log(`  ${r.pass ? '✅' : '❌'} ${r.case}  me=${r.me_exec_id}  ra=${r.ra_exec_id || '(not found)'}`);
  if (!r.pass) {
    if (r.subcall_out) console.log('      subcall_out.result_type=', r.subcall_out?.result_type, 'error=', JSON.stringify(r.subcall_out?.error || null));
    for (const f of (r.failed || [])) console.log('        ✗', f.name, 'got=', JSON.stringify(f.got));
  }
}

writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase12_b11_ra_results.json', JSON.stringify({
  ts: new Date().toISOString(), phase: 'phase12', suite: 'b11_ra_envelope',
  total: results.length, passed, results
}, null, 2));

if (passed < results.length) process.exit(1);
