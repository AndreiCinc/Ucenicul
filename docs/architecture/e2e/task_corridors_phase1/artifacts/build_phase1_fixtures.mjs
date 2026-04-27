// build_phase1_fixtures.mjs — generate seed SQL + per-case envelopes for
// TASK_CORRIDORS_PHASE1.
//
// Cases are encoded inline in this script (single source of truth alongside
// TASK_CORRIDORS_PHASE1_CASE_MATRIX.md). The script writes:
//   artifacts/envelopes/<run_tag>/_seed.sql
//   artifacts/envelopes/<run_tag>/<case_id>.envelope.json
//   artifacts/envelopes/<run_tag>/_index.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RUN_TAG = process.argv[2] || 'tcp1-2026-04-25';
const ORG_ID = '38fde66e-3920-4bf3-9d70-ddbca9faf58a';
const TENANT = {
  DEFAULT: 'eee0e2e0-0000-0000-0000-000000000001',
  A:       'eee0e2e0-0000-0000-0000-00000000000a',
  B:       'eee0e2e0-0000-0000-0000-00000000000b',
};
const CHANNEL = 'tcp1-task-corridors';

function detUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}
function sqlText(s) {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

// ───── Cases ─────────────────────────────────────────────────────────
const CASES = [
  // C6 — planning / composition (12)
  { id: 'TC-C6-01', priority: 'P0', tenant: 'DEFAULT', text: 'Creează task: revizuiește contractul.', intent: 'create_task' },
  { id: 'TC-C6-02', priority: 'P0', tenant: 'DEFAULT', text: 'Add task: review the contract.', intent: 'create_task' },
  { id: 'TC-C6-03', priority: 'P1', tenant: 'DEFAULT', text: 'Creează task: pregătește slide-urile pentru întâlnire mâine.', intent: 'create_task' },
  { id: 'TC-C6-04', priority: 'P1', tenant: 'DEFAULT', text: 'Make a task: draft the Q3 report tomorrow at 10.', intent: 'create_task' },
  { id: 'TC-C6-05', priority: 'P0', tenant: 'DEFAULT', text: 'Creează task: sună-l pe Andrei mâine la 9 pentru a discuta oferta.', intent: 'create_task' },
  { id: 'TC-C6-06', priority: 'P1', tenant: 'DEFAULT', text: 'Setează un task urgent: blocăm site-ul de mentenanță azi la 22.', intent: 'create_task' },
  { id: 'TC-C6-07', priority: 'P1', tenant: 'DEFAULT', text: 'Adaugă task: trimite contractul către Andrei până poimâine.', intent: 'create_task' },
  { id: 'TC-C6-08', priority: 'P1', tenant: 'DEFAULT', text: 'Creează task: pregătește prezentarea pentru investitori.', intent: 'create_task' },
  { id: 'TC-C6-09', priority: 'P0', tenant: 'DEFAULT', text: 'Listează taskurile mele deschise.', intent: 'list_tasks' },
  { id: 'TC-C6-10', priority: 'P1', tenant: 'DEFAULT', text: 'Marchează taskul cu prezentarea ca făcut.', intent: 'complete_task' },
  { id: 'TC-C6-11', priority: 'P1', tenant: 'DEFAULT', text: 'Anulează taskul cu site-ul de mentenanță.', intent: 'delete_task' },
  { id: 'TC-C6-12', priority: 'P1', tenant: 'DEFAULT', text: 'Mută taskul cu Q3 report pe vineri la 11.', intent: 'update_task' },

  // C10 — tenant isolation (12)
  { id: 'TC-C10-01', priority: 'P0', tenant: 'A', text: 'Creează task tenant-A: scope_isolation_marker_A1.', intent: 'create_task' },
  { id: 'TC-C10-02', priority: 'P0', tenant: 'A', text: 'Creează task tenant-A: marker A2 unique.', intent: 'create_task' },
  { id: 'TC-C10-03', priority: 'P0', tenant: 'A', text: 'Add task tenant-A: marker A3 isolation.', intent: 'create_task' },
  { id: 'TC-C10-04', priority: 'P0', tenant: 'A', text: 'Creează task: pregătește raportul tenant-A specific.', intent: 'create_task' },
  { id: 'TC-C10-05', priority: 'P0', tenant: 'A', text: 'Setează un task pentru clientul tenant-A: oferta tenant-A.', intent: 'create_task' },
  { id: 'TC-C10-06', priority: 'P0', tenant: 'A', text: 'Creează task: marker tenant-A oferta_isolation_A6 mâine la 11.', intent: 'create_task' },
  { id: 'TC-C10-07', priority: 'P0', tenant: 'B', text: 'Creează task tenant-B: scope_isolation_marker_B1.', intent: 'create_task' },
  { id: 'TC-C10-08', priority: 'P0', tenant: 'B', text: 'Creează task tenant-B: marker B2 unique.', intent: 'create_task' },
  { id: 'TC-C10-09', priority: 'P0', tenant: 'B', text: 'Add task tenant-B: marker B3 isolation.', intent: 'create_task' },
  { id: 'TC-C10-10', priority: 'P0', tenant: 'B', text: 'Creează task: pregătește raportul tenant-B specific.', intent: 'create_task' },
  { id: 'TC-C10-11', priority: 'P0', tenant: 'B', text: 'Setează un task pentru clientul tenant-B: oferta tenant-B.', intent: 'create_task' },
  { id: 'TC-C10-12', priority: 'P0', tenant: 'B', text: 'Listează taskurile tenant-B.', intent: 'list_tasks' },

  // C11 — idempotency / retry (12)
  { id: 'TC-C11-01', priority: 'P0', tenant: 'DEFAULT', text: 'Creează task C11: replay_marker_01 unique.', intent: 'create_task', replays: 1 },
  { id: 'TC-C11-02', priority: 'P0', tenant: 'DEFAULT', text: 'Creează task C11: replay_marker_02 unique.', intent: 'create_task', replays: 1 },
  { id: 'TC-C11-03', priority: 'P0', tenant: 'DEFAULT', text: 'Creează task C11: replay_marker_03 unique.', intent: 'create_task', replays: 2 },
  { id: 'TC-C11-04', priority: 'P0', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_04 unique.', intent: 'create_task', replays: 1 },
  { id: 'TC-C11-05', priority: 'P0', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_05 unique.', intent: 'create_task', replays: 1 },
  { id: 'TC-C11-06', priority: 'P0', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_06 unique.', intent: 'create_task' },
  { id: 'TC-C11-07', priority: 'P1', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_07 unique.', intent: 'create_task' },
  { id: 'TC-C11-08', priority: 'P1', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_08 unique.', intent: 'create_task' },
  { id: 'TC-C11-09', priority: 'P0', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_09 unique.', intent: 'create_task' },
  { id: 'TC-C11-10', priority: 'P0', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_10 unique.', intent: 'create_task' },
  { id: 'TC-C11-11', priority: 'P0', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_11 unique.', intent: 'create_task' },
  { id: 'TC-C11-12', priority: 'P0', tenant: 'DEFAULT', text: 'Add task C11: replay_marker_12 unique.', intent: 'create_task' },

  // C12 — large composition (12)
  { id: 'TC-C12-01', priority: 'P0', tenant: 'DEFAULT', text: 'Bună, sper că ești bine. Creează task: trimite oferta pentru clientul X mâine la 10. Dacă X nu răspunde, revenim săptămâna viitoare. Mulțumesc!', intent: 'create_task' },
  { id: 'TC-C12-02', priority: 'P1', tenant: 'DEFAULT', text: 'Hi there. Quick task: prepare the Q3 review for Monday at 11am. If the materials are missing, we will follow up later. Thanks!', intent: 'create_task' },
  { id: 'TC-C12-03', priority: 'P0', tenant: 'DEFAULT', text: 'Ignoră ce am zis înainte. Creează task: pregătește prezentarea finală până vineri la 12, dacă nu, mutăm pe luni.', intent: 'create_task' },
  { id: 'TC-C12-04', priority: 'P1', tenant: 'DEFAULT', text: 'Listează-mi toate taskurile pe care le am, te rog. Vreau să văd în ce stadiu sunt.', intent: 'list_tasks' },
  { id: 'TC-C12-05', priority: 'P0', tenant: 'DEFAULT', text: 'Compose: pregătește slide-urile pentru investitori, planifică call mâine la 15, urmărește feedbackul lui Andrei.', intent: 'create_task' },
  { id: 'TC-C12-06', priority: 'P1', tenant: 'DEFAULT', text: 'Mută taskul cu Q3 review pe joi la 9 pentru că X a cerut amânare.', intent: 'update_task' },
  { id: 'TC-C12-07', priority: 'P1', tenant: 'DEFAULT', text: 'Marchează taskul cu prezentarea finală ca făcut, am terminat slide-urile aseară.', intent: 'complete_task' },
  { id: 'TC-C12-08', priority: 'P1', tenant: 'DEFAULT', text: 'Anulează taskul cu callul de marți, clientul a anulat.', intent: 'delete_task' },
  { id: 'TC-C12-09', priority: 'P0', tenant: 'DEFAULT', text: 'Hai să zicem așa: dacă X confirmă, programează call la 11; dacă nu, lasă-l pe joi. Pentru moment creează task: pregătește agenda call.', intent: 'create_task' },
  { id: 'TC-C12-10', priority: 'P1', tenant: 'DEFAULT', text: 'Listează doar taskurile completate săptămâna asta.', intent: 'list_tasks' },
  { id: 'TC-C12-11', priority: 'P0', tenant: 'DEFAULT', text: 'Eu nu te-am întrebat încă. Întâi salut. Apoi creează un task minor: actualizează lista de invitați.', intent: 'create_task' },
  { id: 'TC-C12-12', priority: 'P1', tenant: 'DEFAULT', text: 'Creează task: trimite update la echipa de marketing.', intent: 'create_task' },

  // reminder-like (8)
  { id: 'TC-RL-01', priority: 'P0', tenant: 'DEFAULT', text: 'Amintește-mi mâine la 9 să sun clientul.', intent: 'create_reminder' },
  { id: 'TC-RL-02', priority: 'P0', tenant: 'DEFAULT', text: 'Remind me tomorrow at 10 to send the report.', intent: 'create_reminder' },
  { id: 'TC-RL-03', priority: 'P0', tenant: 'DEFAULT', text: 'Amintește-mi poimâine să verific contractul.', intent: 'create_reminder' },
  { id: 'TC-RL-04', priority: 'P0', tenant: 'DEFAULT', text: 'Remind me today at 18 to call back the client.', intent: 'create_reminder' },
  { id: 'TC-RL-05', priority: 'P0', tenant: 'DEFAULT', text: 'Nu mă lăsa să uit să trimit factura mâine.', intent: 'create_reminder' },
  { id: 'TC-RL-06', priority: 'P0', tenant: 'DEFAULT', text: 'Don\'t let me forget tomorrow at 9 to update the deck.', intent: 'create_reminder' },
  { id: 'TC-RL-07', priority: 'P0', tenant: 'DEFAULT', text: 'Amintește-mi azi să răspund email-ului de la Andrei.', intent: 'create_reminder' },
  { id: 'TC-RL-08', priority: 'P0', tenant: 'DEFAULT', text: 'Amintește-mi mâine la 14:30 să trimit oferta finală pentru clientul Z.', intent: 'create_reminder' },
];

// ───── Generate envelopes + index ────────────────────────────────────
const dir = join(__dirname, 'envelopes', RUN_TAG);
mkdirSync(dir, { recursive: true });
mkdirSync(join(__dirname, 'runs', RUN_TAG), { recursive: true });

const items = CASES.map(c => {
  const tenant_id = TENANT[c.tenant];
  const message_id = detUuid(`${RUN_TAG}|${c.id}|msg`);
  const thread_id = detUuid(`${RUN_TAG}|${c.id}|thread`);
  const idempotency_key = `tmr:${RUN_TAG}:${c.id}`;
  const env = {
    message_id,
    tenant_id,
    channel: CHANNEL,
    direction: 'inbound',
    author_type: 'user',
    normalized_content: c.text,
    timestamp: new Date().toISOString(),
    source_message_ref: `tcp1:${c.id}:${idempotency_key}`,
    author_entity_id: null,
    related_entity_ids: [],
    metadata: { tcp1_case_id: c.id, tcp1_run_tag: RUN_TAG, tcp1_priority: c.priority },
    idempotency_key,
    thread_id,
    reply_to_thread_id: null,
  };
  return { case: c, tenant_id, message_id, thread_id, idempotency_key, env };
});

for (const it of items) {
  writeFileSync(join(dir, `${it.case.id}.envelope.json`), JSON.stringify(it.env, null, 2));
}

// ───── Seed SQL ──────────────────────────────────────────────────────
const seenTenants = new Set();
const tenantValues = [];
for (const t of [
  [TENANT.DEFAULT, 'e2e-default', 'E2E Default'],
  [TENANT.A,       'e2e-tenant-a', 'E2E Tenant A'],
  [TENANT.B,       'e2e-tenant-b', 'E2E Tenant B'],
]) {
  if (!seenTenants.has(t[0])) {
    seenTenants.add(t[0]);
    tenantValues.push(`('${t[0]}'::uuid, '${ORG_ID}'::uuid, '${t[1]}', '${t[1]}', 'e2e', '${t[2]}', true, 'Europe/Bucharest', 'EUR', '{"tcp1":true}'::jsonb)`);
  }
}
const tenantsSQL = `INSERT INTO public.tenants (id, organization_id, name, slug, vertical, display_name, is_active, timezone, currency_code, metadata) VALUES\n  ${tenantValues.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`;

const threadRows = [];
const seenThread = new Set();
for (const it of items) {
  const k = `${it.tenant_id}|${it.thread_id}`;
  if (seenThread.has(k)) continue;
  seenThread.add(k);
  threadRows.push(`('${it.thread_id}'::uuid, '${it.tenant_id}'::uuid, ${sqlText('tcp1:' + it.case.id)}, 'operational', 'new', ARRAY['${CHANNEL}']::varchar[])`);
}
const threadsSQL = `INSERT INTO public.threads (id, tenant_id, title, thread_type, status, source_channels) VALUES\n  ${threadRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`;

const msgRows = [];
const seenMsg = new Set();
for (const it of items) {
  if (seenMsg.has(it.message_id)) continue;
  seenMsg.add(it.message_id);
  msgRows.push(`('${it.message_id}'::uuid, '${ORG_ID}'::uuid, '${it.tenant_id}'::uuid, '${it.thread_id}'::uuid, 'inbound', 'user', '${CHANNEL}', ${sqlText(it.case.text)}, ${sqlText('tcp1:' + it.case.id + ':' + it.idempotency_key)}, ${sqlText(it.case.text)}, ${sqlText(it.case.intent)}, NOW(), NOW())`);
}
const messagesSQL = `INSERT INTO public.messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES\n  ${msgRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`;

const seedSQL = ['BEGIN;', '-- TENANTS', tenantsSQL, '-- THREADS', threadsSQL, '-- MESSAGES', messagesSQL, 'COMMIT;'].join('\n');

writeFileSync(join(dir, '_seed.sql'), seedSQL);

// ───── Pre-existing target tasks for update/complete/delete cases ────
// These are seeded into tenant DEFAULT so update/complete/delete cases find
// a single distinct match. Titles are deliberately unique substrings.
const PRE_TASKS = [
  // Each: id, title, description (uses unique substring extracted by the case's title_match heuristic)
  { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaa0001', title: 'pregătirea prezentării pentru investitori — TCP1', desc: 'pregătirea prezentării pentru investitori — TCP1' }, // matches TC-C6-10
  { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaa0002', title: 'site-ul de mentenanță TCP1', desc: 'site-ul de mentenanță TCP1' }, // matches TC-C6-11
  { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaa0003', title: 'Q3 report TCP1 baseline', desc: 'Q3 report TCP1 baseline' }, // matches TC-C6-12
  { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaa0004', title: 'Q3 review TCP1 baseline', desc: 'Q3 review TCP1 baseline' }, // matches TC-C12-06
  { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaa0005', title: 'prezentarea finală TCP1', desc: 'prezentarea finală TCP1' }, // matches TC-C12-07
  { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaa0006', title: 'callul de marți TCP1', desc: 'callul de marți TCP1' }, // matches TC-C12-08
];
const preTasksSQL = PRE_TASKS.map(t =>
  `('${t.id}'::uuid, '${TENANT.DEFAULT}'::uuid, ${sqlText(t.title)}, ${sqlText(t.desc)}, 'normal'::task_priority_enum, 'flexible'::due_type_enum, 'open'::task_status_enum, 'tcp1:seed', '{"tcp1_seed":true,"idempotency_key":"tcp1-seed:${t.id}"}'::jsonb)`
).join(',\n  ');
const preTasksSQLBatch = `INSERT INTO public.tasks (id, tenant_id, title, description, priority, due_type, status, source, metadata) VALUES\n  ${preTasksSQL}\nON CONFLICT (id) DO NOTHING;`;

writeFileSync(join(dir, '_seed_pre_tasks.sql'), 'BEGIN;\n' + preTasksSQLBatch + '\nCOMMIT;');

writeFileSync(join(dir, '_index.json'), JSON.stringify({
  run_tag: RUN_TAG,
  count: items.length,
  cases: items.map(it => ({
    case_id: it.case.id,
    priority: it.case.priority,
    tenant: it.case.tenant,
    tenant_id: it.tenant_id,
    message_id: it.message_id,
    thread_id: it.thread_id,
    idempotency_key: it.idempotency_key,
    intent: it.case.intent,
    user_input: it.case.text,
    replays: it.case.replays || 0,
  })),
}, null, 2));

console.log(JSON.stringify({ run_tag: RUN_TAG, dir, count: items.length, replay_cases: items.filter(x => x.case.replays).length }, null, 2));
