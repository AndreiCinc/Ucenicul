#!/usr/bin/env node
// seed_fixtures.mjs — emit a single SQL batch that idempotently seeds:
//   - e2e tenants (default + A + B)
//   - threads per case (deterministic UUID)
//   - messages per case (with system-intent set per intent_mapping.mjs)
//
// Output is plain SQL on stdout.  Pipe to mcp__postgres__execute_sql.
//
// Usage:
//   node seed_fixtures.mjs --run-tag p0_sanity --case C1-L1-V1 --case C2-L1-V1
//   node seed_fixtures.mjs --run-tag p1_p0   --phase P1_FOUNDATION_CRITICAL [--limit N]

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMatrix, filterCases } from './case_loader.mjs';
import { buildCaseRuntime, pickThreadLabel, E2E } from './tr_envelope.mjs';
import { getSystemIntent } from './intent_mapping.mjs';

function parseArgs(argv) {
  const a = { case_ids: [], corridors: [], priorities: [], phases: [], levels: [], variants: [], limit: null, run_tag: null, matrix: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--case') { a.case_ids.push(v); i++; }
    else if (k === '--corridor') { a.corridors.push(v); i++; }
    else if (k === '--phase') { a.phases.push(v); i++; }
    else if (k === '--priority') { a.priorities.push(v); i++; }
    else if (k === '--level') { a.levels.push(Number(v)); i++; }
    else if (k === '--variant') { a.variants.push(v); i++; }
    else if (k === '--limit') { a.limit = Number(v); i++; }
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
let cases = filterCases(matrix.cases, {
  case_ids: args.case_ids.length ? args.case_ids : null,
  corridors: args.corridors.length ? args.corridors : null,
  phases: args.phases.length ? args.phases : null,
  priorities: args.priorities.length ? args.priorities : null,
  levels: args.levels.length ? args.levels : null,
  variants: args.variants.length ? args.variants : null,
});
if (args.limit) cases = cases.slice(0, args.limit);

const ORG = '38fde66e-3920-4bf3-9d70-ddbca9faf58a';

// ---- TENANTS (always upsert all 3) ----
const tenantValues = [
  [E2E.TENANT_DEFAULT, 'e2e-default', 'E2E Default Lane'],
  [E2E.TENANT_A,       'e2e-tenant-a', 'E2E Tenant A'],
  [E2E.TENANT_B,       'e2e-tenant-b', 'E2E Tenant B'],
].map(([id, slug, dn]) => `('${id}'::uuid, '${ORG}'::uuid, '${slug}', '${slug}', 'e2e', '${dn}', true, 'Europe/Bucharest', 'EUR', '{"e2e":true}'::jsonb)`).join(',\n  ');

const out = [];
out.push('BEGIN;');
out.push('-- 1) E2E tenants (idempotent)');
out.push(`INSERT INTO tenants (id, organization_id, name, slug, vertical, display_name, is_active, timezone, currency_code, metadata) VALUES\n  ${tenantValues}\nON CONFLICT (id) DO NOTHING;`);

// ---- THREADS ----
const threadSeen = new Map();
const threadRows = [];
for (const c of cases) {
  if (c.variant === 'new_thread_negative_control') continue;
  const rt = buildCaseRuntime(c, args.run_tag, null);
  if (!rt.thread_id) continue;
  const key = `${rt.tenant_id}|${rt.thread_id}`;
  if (threadSeen.has(key)) continue;
  threadSeen.set(key, rt);
  const label = pickThreadLabel(c);
  threadRows.push(`('${rt.thread_id}'::uuid, '${rt.tenant_id}'::uuid, ${sqlText('e2e:' + args.run_tag + ':' + label)}, 'operational', 'new', ARRAY['e2e-rich-matrix']::varchar[])`);
}
if (threadRows.length) {
  out.push('-- 2) Threads (idempotent)');
  out.push(`INSERT INTO threads (id, tenant_id, title, thread_type, status, source_channels) VALUES\n  ${threadRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`);
}

// ---- MESSAGES (with intent set) ----
const msgSeen = new Set();
const msgRows = [];
for (const c of cases) {
  const rt = buildCaseRuntime(c, args.run_tag, null);
  if (msgSeen.has(rt.message_id)) continue;
  msgSeen.add(rt.message_id);
  const intent = getSystemIntent(c);
  const text = c.user_input;
  msgRows.push(`('${rt.message_id}'::uuid, '${ORG}'::uuid, '${rt.tenant_id}'::uuid, ${rt.thread_id ? `'${rt.thread_id}'::uuid` : 'NULL'}, 'inbound', 'user', 'e2e-rich-matrix', ${sqlText(text)}, ${sqlText('e2e:' + c.case_id)}, ${sqlText(text)}, ${sqlText(intent)}, NOW(), NOW())`);
}
if (msgRows.length) {
  out.push('-- 3) Messages (idempotent, with intent pre-set)');
  out.push(`INSERT INTO messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES\n  ${msgRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`);
}

out.push('COMMIT;');
console.log(out.join('\n'));

function sqlText(s) {
  if (s === null || s === undefined) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}
