// runtime_batch.mjs — emit seed SQL + envelopes + verify SQL for a runtime batch.
//
// Usage:
//   node runtime_batch.mjs <run_tag> <case_id> [<case_id>...]
//   node runtime_batch.mjs <run_tag> --auto P0   (selects P0 cases)
//   node runtime_batch.mjs <run_tag> --auto smoke (P0 representative subset, 1 per group + reminder-like)
//
// Writes:
//   runtime_envelopes/<run_tag>/_seed.sql        — INSERT messages + threads
//   runtime_envelopes/<run_tag>/<case_id>.envelope.json
//   runtime_envelopes/<run_tag>/_verify.json     — per-case verify info
//   runtime_envelopes/<run_tag>/_index.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = '/sessions/clever-magical-wozniak/mnt/outputs/claude_pack/ucenicul_task_module_user_ready_claude_pack';
const MATRIX_PATH = join(PACK_DIR, 'tests', 'task_module_user_ready_test_matrix.json');

const ORG_ID = '38fde66e-3920-4bf3-9d70-ddbca9faf58a';
const TENANT = {
  DEFAULT: 'eee0e2e0-0000-0000-0000-000000000001',
  A:       'eee0e2e0-0000-0000-0000-00000000000a',
  B:       'eee0e2e0-0000-0000-0000-00000000000b',
};
const CHANNEL = 'task-module-user-ready';

function detUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}

function pickTenant(c) {
  if (c.group === 'tenant_isolation') {
    if (/(_b\b|_b_|tenant_b)/i.test(c.name) || /\bB\b/.test(c.name)) return TENANT.B;
    return TENANT.A;
  }
  return TENANT.DEFAULT;
}

function actionForIntent(c) {
  // Map runtime case to messages.intent value the OR/PL chain consumes.
  if (c.group === 'reminder_like_as_task') return 'create_reminder';
  if (c.action) return c.action;
  return c.messages_intent || 'create_task';
}

function buildCaseRuntime(c, runTag, replayOf = null) {
  const tenant_id = pickTenant(c);
  const baseSeed = replayOf ? `${runTag}|${replayOf}` : `${runTag}|${c.case_id}`;
  const message_id = detUuid(`${baseSeed}|msg`);
  const thread_id = detUuid(`${baseSeed}|thread`);
  const idempotency_key = `tmr:${runTag}:${replayOf || c.case_id}`;
  return { tenant_id, message_id, thread_id, idempotency_key };
}

function buildEnvelope(c, rt, runTag) {
  return {
    message_id: rt.message_id,
    tenant_id: rt.tenant_id,
    channel: CHANNEL,
    direction: 'inbound',
    author_type: 'user',
    normalized_content: c.user_input,
    timestamp: new Date().toISOString(),
    source_message_ref: `tmr:${c.case_id}:${rt.idempotency_key}`,
    author_entity_id: null,
    related_entity_ids: [],
    metadata: { tmr_case_id: c.case_id, tmr_group: c.group, tmr_run_tag: runTag },
    idempotency_key: rt.idempotency_key,
    thread_id: rt.thread_id,
    reply_to_thread_id: null,
  };
}

function sqlText(s) {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function buildSeedSQL(items) {
  const tenants = `INSERT INTO public.tenants (id, organization_id, name, slug, vertical, display_name, is_active, timezone, currency_code, metadata)
VALUES
  ('${TENANT.DEFAULT}'::uuid, '${ORG_ID}'::uuid, 'e2e-default', 'e2e-default', 'e2e', 'E2E Default', true, 'Europe/Bucharest', 'EUR', '{"tmr":true}'::jsonb),
  ('${TENANT.A}'::uuid, '${ORG_ID}'::uuid, 'e2e-tenant-a', 'e2e-tenant-a', 'e2e', 'E2E Tenant A', true, 'Europe/Bucharest', 'EUR', '{"tmr":true}'::jsonb),
  ('${TENANT.B}'::uuid, '${ORG_ID}'::uuid, 'e2e-tenant-b', 'e2e-tenant-b', 'e2e', 'E2E Tenant B', true, 'Europe/Bucharest', 'EUR', '{"tmr":true}'::jsonb)
ON CONFLICT (id) DO NOTHING;`;

  const seenThreads = new Map();
  const threadRows = [];
  for (const it of items) {
    const k = `${it.rt.tenant_id}|${it.rt.thread_id}`;
    if (seenThreads.has(k)) continue;
    seenThreads.set(k, true);
    threadRows.push(`('${it.rt.thread_id}'::uuid, '${it.rt.tenant_id}'::uuid, ${sqlText('tmr:' + it.case.case_id)}, 'operational', 'new', ARRAY['${CHANNEL}']::varchar[])`);
  }
  const threads = threadRows.length
    ? `INSERT INTO public.threads (id, tenant_id, title, thread_type, status, source_channels) VALUES\n  ${threadRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`
    : '-- no threads';

  const seenMsg = new Set();
  const msgRows = [];
  for (const it of items) {
    if (seenMsg.has(it.rt.message_id)) continue;
    seenMsg.add(it.rt.message_id);
    const intent = actionForIntent(it.case);
    msgRows.push(`('${it.rt.message_id}'::uuid, '${ORG_ID}'::uuid, '${it.rt.tenant_id}'::uuid, '${it.rt.thread_id}'::uuid, 'inbound', 'user', '${CHANNEL}', ${sqlText(it.case.user_input)}, ${sqlText('tmr:' + it.case.case_id + ':' + it.rt.idempotency_key)}, ${sqlText(it.case.user_input)}, ${sqlText(intent)}, NOW(), NOW())`);
  }
  const messages = msgRows.length
    ? `INSERT INTO public.messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES\n  ${msgRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`
    : '-- no messages';

  return [
    'BEGIN;',
    '-- TENANTS',
    tenants,
    '-- THREADS',
    threads,
    '-- MESSAGES',
    messages,
    'COMMIT;',
  ].join('\n');
}

function pickSmokeSubset(cases) {
  // 1 per runtime group, prioritising P0 cases and including a reminder-like.
  const groups = {};
  for (const c of cases) {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  }
  const out = [];
  for (const group of Object.keys(groups)) {
    const sorted = groups[group].sort((a, b) => (a.priority === 'P0' ? -1 : 1) - (b.priority === 'P0' ? -1 : 1));
    out.push(sorted[0]);
  }
  return out;
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('usage: runtime_batch.mjs <run_tag> [--auto smoke|P0|all] | <case_id...>');
  process.exit(2);
}

const runTag = args[0];
const matrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8'));
let cases = [];
if (args[1] === '--auto') {
  if (args[2] === 'smoke') cases = pickSmokeSubset(matrix.runtime_cases);
  else if (args[2] === 'P0') cases = matrix.runtime_cases.filter(c => c.priority === 'P0');
  else cases = matrix.runtime_cases;
} else {
  const ids = new Set(args.slice(1));
  cases = matrix.runtime_cases.filter(c => ids.has(c.case_id));
}
if (cases.length === 0) {
  console.error('no cases selected');
  process.exit(2);
}

const items = cases.map(c => ({ case: c, rt: buildCaseRuntime(c, runTag) }));
const dir = join(__dirname, 'runtime_envelopes', runTag);
mkdirSync(dir, { recursive: true });
const seed = buildSeedSQL(items);
writeFileSync(join(dir, '_seed.sql'), seed);
const index = [];
for (const it of items) {
  const env = buildEnvelope(it.case, it.rt, runTag);
  const expectedAction = actionForIntent(it.case);
  const verify = {
    case_id: it.case.case_id,
    group: it.case.group,
    priority: it.case.priority,
    user_input: it.case.user_input,
    expected: it.case.expected,
    expected_intent: expectedAction,
    tenant_id: it.rt.tenant_id,
    message_id: it.rt.message_id,
    thread_id: it.rt.thread_id,
    idempotency_key: it.rt.idempotency_key,
  };
  writeFileSync(join(dir, `${it.case.case_id}.envelope.json`), JSON.stringify(env, null, 2));
  writeFileSync(join(dir, `${it.case.case_id}.verify.json`), JSON.stringify(verify, null, 2));
  index.push(verify);
}
writeFileSync(join(dir, '_index.json'), JSON.stringify({ run_tag: runTag, count: index.length, cases: index }, null, 2));
console.log(JSON.stringify({ run_tag: runTag, dir, count: index.length, ids: index.map(x => x.case_id) }, null, 2));
