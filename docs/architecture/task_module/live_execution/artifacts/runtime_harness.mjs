// runtime_harness.mjs — task_module live runtime harness.
//
// For each pack case in tests/task_module_user_ready_test_matrix.json `runtime_cases`,
// build a canonical TR envelope, fire WF-TR-01 via execute_workflow MCP, wait for the
// chain to complete, then run SQL probes against `public.tasks` and `public.reminders`
// to check the case's expected side effects.
//
// Tenant lanes:
//   TENANT_DEFAULT for most cases
//   TENANT_A / TENANT_B for tenant_isolation cases
//   TENANT_OTHER for cross-tenant probes
//
// This harness is invoked from the agent loop. The agent provides:
//   - n8n executor MCP (execute_workflow / get_execution)
//   - Postgres MCP (execute_sql, SELECT-only)
//
// Because we are running inside Cowork's sandbox, this harness cannot itself call MCP;
// instead, the agent calls execute_workflow per case, the agent reads back via Postgres,
// and the agent records results in TASK_MODULE_RUNTIME_RESULTS.md.
//
// What this script provides is the deterministic ENVELOPE BUILDER + SQL PROBE SET
// generator that the agent loop uses.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');
const PACK_DIR = '/sessions/clever-magical-wozniak/mnt/outputs/claude_pack/ucenicul_task_module_user_ready_claude_pack';
const MATRIX_PATH = join(PACK_DIR, 'tests', 'task_module_user_ready_test_matrix.json');

const RUN_TAG = process.env.RUN_TAG || `tm-${new Date().toISOString().replace(/[:.TZ-]/g, '').slice(0, 14)}`;

const TENANT = {
  DEFAULT: 'eee0e2e0-0000-0000-0000-000000000001',
  A:       'eee0e2e0-0000-0000-0000-00000000000a',
  B:       'eee0e2e0-0000-0000-0000-00000000000b',
};

const E2E_CHANNEL = 'task-module-user-ready';

function detUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}

function pickTenantForCase(c) {
  if (c.group === 'tenant_isolation') {
    if (/_a\b|_a_|tenant_a/i.test(c.name)) return TENANT.A;
    if (/_b\b|_b_|tenant_b/i.test(c.name)) return TENANT.B;
    return TENANT.A;
  }
  return TENANT.DEFAULT;
}

function buildEnvelope(c) {
  const tenant_id = pickTenantForCase(c);
  const message_id = detUuid(`${RUN_TAG}|${c.case_id}|msg`);
  const thread_id  = detUuid(`${RUN_TAG}|${c.case_id}|thread`);
  const idempotency_key = `tmr:${RUN_TAG}:${c.case_id}`;
  return {
    message_id,
    tenant_id,
    channel: E2E_CHANNEL,
    direction: 'inbound',
    author_type: 'user',
    normalized_content: c.user_input,
    timestamp: new Date().toISOString(),
    source_message_ref: `tmr:${c.case_id}:${idempotency_key}`,
    author_entity_id: null,
    related_entity_ids: [],
    metadata: {
      tmr_case_id: c.case_id,
      tmr_group: c.group,
      tmr_run_tag: RUN_TAG,
    },
    idempotency_key,
    thread_id,
    reply_to_thread_id: null,
  };
}

function buildEnvelopes(cases) {
  return cases.map(c => ({ case: c, envelope: buildEnvelope(c) }));
}

if (process.argv[2] === 'prepare') {
  const matrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8'));
  const filter = process.argv[3]; // optional: P0, group:create_task, etc.
  let cases = matrix.runtime_cases;
  if (filter) {
    if (filter === 'P0') cases = cases.filter(c => c.priority === 'P0');
    else if (filter.startsWith('group:')) {
      const g = filter.slice(6);
      cases = cases.filter(c => c.group === g);
    } else if (filter.startsWith('case:')) {
      const id = filter.slice(5);
      cases = cases.filter(c => c.case_id === id);
    }
  }
  const out = buildEnvelopes(cases);
  const dir = join(__dirname, 'runtime_envelopes', RUN_TAG);
  mkdirSync(dir, { recursive: true });
  for (const item of out) {
    writeFileSync(join(dir, `${item.case.case_id}.envelope.json`), JSON.stringify(item.envelope, null, 2));
  }
  writeFileSync(join(dir, '_index.json'), JSON.stringify({
    run_tag: RUN_TAG,
    count: out.length,
    cases: out.map(i => ({
      case_id: i.case.case_id,
      priority: i.case.priority,
      group: i.case.group,
      tenant_id: i.envelope.tenant_id,
      message_id: i.envelope.message_id,
      thread_id: i.envelope.thread_id,
      idempotency_key: i.envelope.idempotency_key,
      user_input: i.case.user_input,
      expected: i.case.expected,
    })),
  }, null, 2));
  console.log(JSON.stringify({ run_tag: RUN_TAG, dir, count: out.length }));
  process.exit(0);
}

if (process.argv[2] === 'replay') {
  // Re-emit envelope for an existing case_id (used for idempotency replays).
  const caseId = process.argv[3];
  const matrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8'));
  const c = matrix.runtime_cases.find(x => x.case_id === caseId);
  if (!c) { console.error(`case ${caseId} not found`); process.exit(2); }
  const env = buildEnvelope(c);
  console.log(JSON.stringify(env, null, 2));
  process.exit(0);
}

console.error('usage: runtime_harness.mjs prepare [P0|group:<name>|case:<id>]');
console.error('       runtime_harness.mjs replay <case_id>');
process.exit(2);
