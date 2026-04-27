#!/usr/bin/env node
// seed_threads.mjs — emit SQL INSERT statements for all unique (tenant, thread_id)
// pairs needed for a given case set + run_tag.  Output is plain SQL on stdout
// (one statement per line) so the agent can pipe it to mcp__postgres.
//
// Usage:
//   node seed_threads.mjs --run-tag p0_sanity --case C1-L1-V1 [--case ...]
//   node seed_threads.mjs --run-tag p1_p0 --phase P1_FOUNDATION_CRITICAL

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMatrix, filterCases } from './case_loader.mjs';
import { buildCaseRuntime, pickThreadLabel } from './tr_envelope.mjs';

function parseArgs(argv) {
  const a = { case_ids: [], corridors: [], priorities: [], phases: [], levels: [], variants: [], run_tag: null, matrix: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--case') { a.case_ids.push(v); i++; }
    else if (k === '--corridor') { a.corridors.push(v); i++; }
    else if (k === '--phase') { a.phases.push(v); i++; }
    else if (k === '--priority') { a.priorities.push(v); i++; }
    else if (k === '--level') { a.levels.push(Number(v)); i++; }
    else if (k === '--variant') { a.variants.push(v); i++; }
    else if (k === '--run-tag') { a.run_tag = v; i++; }
    else if (k === '--matrix') { a.matrix = v; i++; }
  }
  return a;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const args = parseArgs(process.argv);
if (!args.run_tag) { console.error('--run-tag required'); process.exit(2); }
const MATRIX_PATH = args.matrix || resolve(REPO_ROOT, 'docs/architecture/e2e/harness/e2e_matrix.json');
const matrix = loadMatrix(MATRIX_PATH);
const cases = filterCases(matrix.cases, {
  case_ids: args.case_ids.length ? args.case_ids : null,
  corridors: args.corridors.length ? args.corridors : null,
  phases: args.phases.length ? args.phases : null,
  priorities: args.priorities.length ? args.priorities : null,
  levels: args.levels.length ? args.levels : null,
  variants: args.variants.length ? args.variants : null,
});

// Collect unique (tenant_id, thread_id, label) triples.
const seen = new Set();
const triples = [];
for (const c of cases) {
  if (c.variant === 'new_thread_negative_control') continue; // wants fresh
  const rt = buildCaseRuntime(c, args.run_tag, null);
  if (!rt.thread_id) continue;
  const key = `${rt.tenant_id}|${rt.thread_id}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const label = pickThreadLabel(c);
  triples.push({ tenant_id: rt.tenant_id, thread_id: rt.thread_id, label });
}

// Emit a single batch INSERT with ON CONFLICT DO NOTHING.
const values = triples.map(t => `('${t.thread_id}'::uuid, '${t.tenant_id}'::uuid, ${sqlText('e2e:' + args.run_tag + ':' + t.label)}, 'operational', 'new', ARRAY['e2e-rich-matrix']::varchar[])`).join(',\n  ');

if (triples.length === 0) {
  console.error('# no triples to seed');
  process.exit(0);
}
console.log('-- seed ' + triples.length + ' threads for run_tag=' + args.run_tag);
console.log(`INSERT INTO threads (id, tenant_id, title, thread_type, status, source_channels)
VALUES
  ${values}
ON CONFLICT (id) DO NOTHING;`);

function sqlText(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
