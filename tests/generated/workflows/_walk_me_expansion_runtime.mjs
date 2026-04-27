#!/usr/bin/env node
// Walks Phase-11 ME runtime executions to assert handler output + downstream chain.
// Reads run data via n8n public API and builds a pass/fail matrix.

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

const ME_ID = 'uq26nh1grIpnHju0';

// test case definitions: exec_id → (handler name, expected action)
const CASES = [
  { exec: '1030', step: 'p11-smoke-02',      handler: 'ME_Reminder_Create_Result',   module: 'reminder_module',      action: 'create_reminder',  artifactType: 'reminder_id',     shouldError: false },
  { exec: '1039', step: 'p11-list-reminders',handler: 'ME_Reminder_List_Result',     module: 'reminder_module',      action: 'list_reminders',   artifactType: null,              shouldError: false },
  { exec: '1048', step: 'p11-update-reminder',handler:'ME_Reminder_Update_Result',   module: 'reminder_module',      action: 'update_reminder',  artifactType: 'reminder_id',     shouldError: false },
  { exec: '1057', step: 'p11-cancel-reminder',handler:'ME_Reminder_Cancel_Result',   module: 'reminder_module',      action: 'cancel_reminder',  artifactType: 'reminder_id',     shouldError: false },
  { exec: '1066', step: 'p11-store-memory',  handler: 'ME_Memory_Store_Result',      module: 'memory_module',        action: 'store_memory',     artifactType: 'memory_id',       shouldError: false },
  { exec: '1075', step: 'p11-search-memory', handler: 'ME_Memory_Search_Result',     module: 'memory_module',        action: 'search_memory',    artifactType: null,              shouldError: false },
  { exec: '1084', step: 'p11-capture-feedback',handler:'ME_Improvement_Capture_Result',module:'improvement_module',  action: 'capture_feedback', artifactType: 'improvement_id',  shouldError: false },
  { exec: '1093', step: 'p11-observe',       handler: 'ME_Watcher_Observe_Result',   module: 'watcher_module_basic', action: 'observe',          artifactType: null,              shouldError: false }
];

async function getExec(wfId, execId) {
  const r = await fetch(`${N8N_URL}/api/v1/executions/${execId}?includeData=true`, { headers: API });
  if (!r.ok) throw new Error(`GET exec ${execId}: ${r.status}`);
  return r.json();
}
function first(out) {
  return out?.[0]?.data?.main?.[0]?.[0]?.json;
}

const results = [];
for (const c of CASES) {
  try {
    const ex = await getExec(ME_ID, c.exec);
    const rd = ex.data?.resultData?.runData || {};
    const handlerOut = first(rd[c.handler]);
    const returnOut = first(rd['ME_Return_Result']);
    const envelope = first(rd['ME_Build_RA_Envelope']);
    const dispatchOut = first(rd['ME_Dispatch_To_RA_01_SUBCALL']);
    const routeModule = first(rd['ME_Route_Module_Name']);

    const assertions = {
      executed: ex.status === 'success',
      handler_ran: !!handlerOut,
      handler_status_success: handlerOut?.status_kind === 'success',
      handler_module_name_match: handlerOut?.module_result?.module_name === c.module,
      handler_action_match: handlerOut?.module_result?.actions_executed?.[0]?.action === c.action,
      handler_step_id_match: handlerOut?.module_result?.step_id === c.step,
      handler_domain_writes_false: handlerOut?.domain_writes_performed === false,
      return_result_success: returnOut?.status_kind === 'success',
      envelope_is_module_batch: envelope?.result_type === 'module_batch',
      dispatch_ra_rollup_success: dispatchOut?._debug_summary?.rollup_status === 'success'
    };
    if (c.artifactType) {
      const artifacts = handlerOut?.module_result?.artifacts || [];
      assertions.artifact_present = artifacts.some(a => a.type === c.artifactType);
    }
    const failures = Object.entries(assertions).filter(([, v]) => v !== true).map(([k]) => k);
    results.push({ case: c.step, handler: c.handler, exec: c.exec, pass: failures.length === 0, failures, assertions });
  } catch (err) {
    results.push({ case: c.step, handler: c.handler, exec: c.exec, pass: false, error: String(err) });
  }
}

const total = results.length;
const passed = results.filter(r => r.pass).length;
console.log(`ME expansion runtime: ${passed}/${total} passed`);
for (const r of results) {
  console.log(`  ${r.pass ? '✅' : '❌'} ${r.case} (exec ${r.exec}) → ${r.handler}`);
  if (!r.pass) console.log('    failures:', r.failures || r.error);
}

writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase11_me_runtime_results.json', JSON.stringify({
  ts: new Date().toISOString(),
  phase: 'phase11',
  suite: 'me_expansion_runtime',
  total,
  passed,
  results
}, null, 2));

if (passed < total) process.exit(1);
