#!/usr/bin/env node
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

const CASES = [
  { exec: '1102', step: 'p11-neg-reminder-missing-desc',    expectCode: 'MISSING_REQUIRED_FIELDS', expectMissing: 'description' },
  { exec: '1104', step: 'p11-neg-memory-missing-type',      expectCode: 'MISSING_REQUIRED_FIELDS', expectMissing: 'memory_type' },
  { exec: '1106', step: 'p11-neg-reminder-update-no-ident', expectCode: 'MISSING_REQUIRED_FIELDS', expectMissing: 'reminder_id_or_title_match' },
  { exec: '1108', step: 'p11-neg-unknown-module',           expectCode: 'UNSUPPORTED_MODULE',      expectMissing: null },
  { exec: '1109', step: 'p11-neg-unknown-reminder-action',  expectCode: 'UNSUPPORTED_ACTION',      expectMissing: null }
];

async function getExec(id) {
  const r = await fetch(`${N8N_URL}/api/v1/executions/${id}?includeData=true`, { headers: API });
  if (!r.ok) throw new Error(`GET ${id}: ${r.status}`);
  return r.json();
}
function first(out) { return out?.[0]?.data?.main?.[0]?.[0]?.json; }

const results = [];
for (const c of CASES) {
  try {
    const ex = await getExec(c.exec);
    const rd = ex.data?.resultData?.runData || {};
    const errOut = first(rd['ME_Return_Error']);
    const returnRes = first(rd['ME_Return_Result']);
    // Error envelope can come from two places: ME_Return_Error (fallback switches + bad module)
    // or from a handler emitting _error flag which flows through ME_Return_Result.
    const finalErr = errOut || (returnRes && returnRes.result_type === 'module_error' ? returnRes : null);
    const okStatus = finalErr && finalErr.status_kind === 'error' && finalErr.error?.code === c.expectCode;
    const missingField = finalErr?.error?.missing_fields || [];
    const missingOk = c.expectMissing ? missingField.includes(c.expectMissing) : true;
    const pass = !!okStatus && missingOk;
    results.push({ case: c.step, exec: c.exec, pass, code: finalErr?.error?.code, missing_fields: missingField, expected: { code: c.expectCode, missing: c.expectMissing } });
  } catch (err) {
    results.push({ case: c.step, exec: c.exec, pass: false, error: String(err) });
  }
}

const passed = results.filter(r => r.pass).length;
console.log(`ME expansion negatives: ${passed}/${results.length} passed`);
for (const r of results) {
  console.log(`  ${r.pass ? '✅' : '❌'} ${r.case} (exec ${r.exec}) — got ${r.code} missing=${JSON.stringify(r.missing_fields)} expected ${JSON.stringify(r.expected)}`);
}
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/edges/phase11_me_negatives_results.json', JSON.stringify({
  ts: new Date().toISOString(), phase: 'phase11', suite: 'me_negatives', passed, total: results.length, results
}, null, 2));
if (passed < results.length) process.exit(1);
