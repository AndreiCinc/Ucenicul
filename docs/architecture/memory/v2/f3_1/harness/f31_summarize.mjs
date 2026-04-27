#!/usr/bin/env node
// f31_summarize.mjs — fold verdicts into per-family + total summaries.

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ART_DIR = path.resolve(HERE, '..', 'artifacts', 'runtime');
const F3_1_DIR = path.resolve(HERE, '..');
const MATRIX_PATH = path.resolve(HERE, '..', 'matrix', 'f31_cases_150.json');

function loadMatrix() { return JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')); }

function readIndex(family) {
  const p = path.join(ART_DIR, `family_${family}_index.json`);
  if (!fs.existsSync(p)) return { family, verdicts: [] };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function renderFamilyMd(family, idx, matrix) {
  const byId = Object.fromEntries(matrix.cases.filter(c => c.family === family).map(c => [c.case_id, c]));
  const target = matrix.counts_by_family[family];
  const executed = idx.verdicts.length;
  const pass = idx.verdicts.filter(v => v.verdict === 'PASS').length;
  const fail = idx.verdicts.filter(v => v.verdict === 'FAIL').length;
  const blocked = idx.verdicts.filter(v => v.verdict === 'BLOCKED').length;
  let md = `# F3.1 family summary — ${family}\n\n`;
  md += `- target: ${target}\n- executed: ${executed}\n- PASS: ${pass}\n- FAIL: ${fail}\n- BLOCKED: ${blocked}\n- not yet executed: ${target - executed}\n\n`;
  md += `## Verdicts\n\n| case_id | verdict | bucket | reason |\n|---|---|---|---|\n`;
  for (const v of idx.verdicts) {
    const c = byId[v.case_id];
    const note = c ? c.notes : '';
    md += `| ${v.case_id} | ${v.verdict} | ${v.bucket ?? '—'} | ${v.reason ?? ''} ${note ? `(${note})` : ''} |\n`;
  }
  const unrun = Object.keys(byId).filter(id => !idx.verdicts.find(v => v.case_id === id)).sort();
  if (unrun.length) {
    md += `\n## Not yet executed (${unrun.length})\n\n`;
    for (const id of unrun) md += `- ${id} — ${byId[id].notes}\n`;
  }
  return md;
}

function main() {
  const matrix = loadMatrix();
  const families = ['search_lexical_fallback', 'recall_intersection', 'promote_denial_vocabulary', 'supersede_idempotency'];
  const totals = { target: 0, executed: 0, pass: 0, fail: 0, blocked: 0, unexecuted: 0 };
  const perFamily = {};
  for (const f of families) {
    const idx = readIndex(f);
    const target = matrix.counts_by_family[f];
    const executed = idx.verdicts.length;
    const pass = idx.verdicts.filter(v => v.verdict === 'PASS').length;
    const fail = idx.verdicts.filter(v => v.verdict === 'FAIL').length;
    const blocked = idx.verdicts.filter(v => v.verdict === 'BLOCKED').length;
    perFamily[f] = { target, executed, pass, fail, blocked, unexecuted: target - executed };
    totals.target += target;
    totals.executed += executed;
    totals.pass += pass;
    totals.fail += fail;
    totals.blocked += blocked;
    totals.unexecuted += (target - executed);
    fs.writeFileSync(path.join(F3_1_DIR, `F31_FAMILY_${f.toUpperCase()}_SUMMARY.md`), renderFamilyMd(f, idx, matrix));
  }
  const summary = { suite: 'memory_module_v2.F3_1', generated_at: new Date().toISOString(), totals, per_family: perFamily };
  fs.writeFileSync(path.join(ART_DIR, 'totals.json'), JSON.stringify(summary, null, 2));

  let md = `# F3.1 totals summary\n\nGenerated: ${summary.generated_at}\n\n`;
  md += `| Family | target | executed | PASS | FAIL | BLOCKED | unexecuted |\n|---|---|---|---|---|---|---|\n`;
  for (const f of families) {
    const r = perFamily[f];
    md += `| ${f} | ${r.target} | ${r.executed} | ${r.pass} | ${r.fail} | ${r.blocked} | ${r.unexecuted} |\n`;
  }
  md += `| **total** | **${totals.target}** | **${totals.executed}** | **${totals.pass}** | **${totals.fail}** | **${totals.blocked}** | **${totals.unexecuted}** |\n`;
  fs.writeFileSync(path.join(F3_1_DIR, 'F31_TOTALS_SUMMARY.md'), md);
  console.log(md);
}

main();
