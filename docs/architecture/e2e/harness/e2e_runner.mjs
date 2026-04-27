#!/usr/bin/env node
// e2e_runner.mjs — drive the e2e rich matrix in two phases:
//   `prepare`: build the TR envelope JSON for each case + emit per-case files
//              (envelope, runtime, planned invariants)
//   `walk`:    given a TR execution id, walk the chain, save the digest, and
//              save SQL invariant queries (with params + check fn names) to be
//              executed by the agent loop via mcp__postgres.
//
// Usage:
//   node e2e_runner.mjs prepare --case C1-L1-V1 [--case ...] [--phase ...]
//      → writes <out>/<case_id>.envelope.json + <out>/<case_id>.runtime.json
//   node e2e_runner.mjs walk --case C1-L1-V1 --tr-exec 7345 [--fire-iso ...]
//      → writes <out>/<case_id>.chain.json + <out>/<case_id>.invariants.json
//   node e2e_runner.mjs list --phase ... [--corridor ...]
//      → prints filtered case list (for dispatching)
//
// The chain-firing step itself is OUTSIDE this script: the operator agent calls
// mcp__f2e8be41-…_execute_workflow with the envelope as chatInput. (Direct webhook
// POST is not registered for production for the chat trigger nodes used in this
// repo, so MCP is the canonical channel.)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeClient, WFS } from './n8n_client.mjs';
import { loadMatrix, filterCases } from './case_loader.mjs';
import { buildCaseRuntime, buildTrEnvelope } from './tr_envelope.mjs';
import { walkChain } from './walk_chain.mjs';
import { buildInvariants } from './e2e_sql_invariants.mjs';

function parseArgs(argv) {
  const a = { case_ids: [], corridors: [], priorities: [], phases: [], levels: [], variants: [], limit: null, out: null, matrix: null, run_tag: null, tr_exec: null, fire_iso: null, sub: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (i === 2 && !k.startsWith('--')) { a.sub = k; continue; }
    if (k === '--case') { a.case_ids.push(v); i++; }
    else if (k === '--corridor') { a.corridors.push(v); i++; }
    else if (k === '--phase') { a.phases.push(v); i++; }
    else if (k === '--priority') { a.priorities.push(v); i++; }
    else if (k === '--level') { a.levels.push(Number(v)); i++; }
    else if (k === '--variant') { a.variants.push(v); i++; }
    else if (k === '--limit') { a.limit = Number(v); i++; }
    else if (k === '--out') { a.out = v; i++; }
    else if (k === '--matrix') { a.matrix = v; i++; }
    else if (k === '--run-tag') { a.run_tag = v; i++; }
    else if (k === '--tr-exec') { a.tr_exec = String(v); i++; }
    else if (k === '--fire-iso') { a.fire_iso = v; i++; }
  }
  return a;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const args = parseArgs(process.argv);
const sub = args.sub || 'list';

const OUT = resolve(args.out || join(REPO_ROOT, 'docs/architecture/e2e/artifacts/runtime'));
mkdirSync(OUT, { recursive: true });

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
const RUN_TAG = args.run_tag || process.env.E2E_RUN_TAG || `r${new Date().toISOString().replace(/[:.TZ-]/g, '').slice(0, 14)}`;

if (sub === 'list') {
  for (const c of cases) console.log([c.case_id, c.priority, c.phase, c.variant, 'L' + c.level, c.locale, c.expected_intent].join('\t'));
  process.exit(0);
}

if (sub === 'prepare') {
  for (const c of cases) {
    const runtime = buildCaseRuntime(c, RUN_TAG, null);
    const envelope = buildTrEnvelope(c, runtime);
    writeFileSync(join(OUT, `${c.case_id}.runtime.json`), JSON.stringify(runtime, null, 2));
    writeFileSync(join(OUT, `${c.case_id}.envelope.json`), JSON.stringify(envelope, null, 2));
    // Pre-build invariants (params depend on runtime, fire_iso added at walk time).
    const inv = buildInvariants(c, runtime).map(i => ({ name: i.name, sql: i.sql, params: i.params, unknown: !!i.unknown }));
    writeFileSync(join(OUT, `${c.case_id}.planned_invariants.json`), JSON.stringify({ case_id: c.case_id, invariants: inv }, null, 2));
    console.log(JSON.stringify({ kind: 'prepared', case_id: c.case_id, tenant_id: runtime.tenant_id, thread_id: runtime.thread_id, message_id: runtime.message_id, idempotency_key: runtime.idempotency_key }));
  }
  process.exit(0);
}

if (sub === 'walk') {
  if (!args.case_ids.length || !args.tr_exec) {
    console.error('walk requires --case <id> and --tr-exec <execId>');
    process.exit(2);
  }
  const c = cases.find(x => x.case_id === args.case_ids[0]);
  if (!c) { console.error('case not found in matrix'); process.exit(2); }
  const runtimePath = join(OUT, `${c.case_id}.runtime.json`);
  if (!existsSync(runtimePath)) { console.error('missing runtime; run prepare first'); process.exit(2); }
  const runtime = JSON.parse(readFileSync(runtimePath, 'utf8'));
  if (args.fire_iso) runtime.fire_iso = args.fire_iso;
  else if (!runtime.fire_iso) runtime.fire_iso = new Date().toISOString();

  const client = makeClient({ repoRoot: REPO_ROOT });
  const chain = await walkChain(client, args.tr_exec);

  const chainPayload = {
    case_id: c.case_id,
    run_tag: RUN_TAG,
    runtime,
    tr_exec_id: args.tr_exec,
    chain,
  };
  writeFileSync(join(OUT, `${c.case_id}.chain.json`), JSON.stringify(chainPayload, null, 2));

  const invList = buildInvariants(c, runtime);
  writeFileSync(join(OUT, `${c.case_id}.invariants.json`), JSON.stringify({
    case_id: c.case_id, run_tag: RUN_TAG, runtime,
    invariants: invList.map(i => ({ name: i.name, sql: i.sql, params: i.params, unknown: !!i.unknown })),
  }, null, 2));

  console.log(JSON.stringify({ kind: 'walked', case_id: c.case_id, tr_exec_id: args.tr_exec, hops_str: chain?.hops_str || null }));
  process.exit(0);
}

console.error('unknown sub:', sub);
process.exit(2);
