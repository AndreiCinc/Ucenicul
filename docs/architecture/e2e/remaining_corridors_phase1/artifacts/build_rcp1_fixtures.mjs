// build_rcp1_fixtures.mjs — generate seed SQL + per-case envelopes for
// REMAINING-CORRIDORS-PHASE1 (run-tag rcp1-2026-04-25).

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUN_TAG = process.argv[2] || 'rcp1-2026-04-25';
const ORG_ID = '38fde66e-3920-4bf3-9d70-ddbca9faf58a';
const TENANT = {
  DEFAULT: 'eee0e2e0-0000-0000-0000-000000000001',
  A:       'eee0e2e0-0000-0000-0000-00000000000a',
  B:       'eee0e2e0-0000-0000-0000-00000000000b',
};
const CHANNEL = 'rcp1-rich-matrix';

function detUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}
function sqlText(s) { if (s == null) return 'NULL'; return `'${String(s).replace(/'/g, "''")}'`; }

// ───── Cases (57 unique, 1 explicit replay = 58 fires) ─────────────
// Each entry: { id, corridor, intent, tenant ('DEFAULT'|'A'|'B'), text, thread_alias?, replay_of? }
// thread_alias = string used to derive a SHARED thread_id (for C8 continuity / C9 cross-thread).
//   When omitted, thread_id is unique per case_id.
// replay_of = case_id whose envelope (message_id, thread_id) is reused.
const CASES = [
  // C1 — response-only (5)
  { id: 'RC-C1-01', corridor: 'C1', intent: 'briefing', tenant: 'DEFAULT', text: 'Bună, cum funcționează agentul în general?' },
  { id: 'RC-C1-02', corridor: 'C1', intent: 'briefing', tenant: 'DEFAULT', text: 'Hi, can you summarize what you can do?' },
  { id: 'RC-C1-03', corridor: 'C1', intent: 'briefing', tenant: 'DEFAULT', text: 'Care e capitala Franței?' },
  { id: 'RC-C1-04', corridor: 'C1', intent: 'briefing', tenant: 'DEFAULT', text: 'Cât e 2+2?' },
  { id: 'RC-C1-05', corridor: 'C1', intent: 'briefing', tenant: 'DEFAULT', text: 'What is the difference between a task and a reminder for you?' },

  // C2 — memory write (8 + 1 replay)
  { id: 'RC-C2-01', corridor: 'C2', intent: 'store_memory', tenant: 'DEFAULT', text: 'Ține minte că prefer întâlnirile online via Google Meet, nu Zoom.' },
  { id: 'RC-C2-02', corridor: 'C2', intent: 'store_memory', tenant: 'DEFAULT', text: 'Notează că Andrei este partenerul nostru tehnic principal.' },
  { id: 'RC-C2-03', corridor: 'C2', intent: 'store_memory', tenant: 'DEFAULT', text: 'Remember that our quarterly review meeting is on Mondays at 9am.' },
  { id: 'RC-C2-04', corridor: 'C2', intent: 'store_memory', tenant: 'DEFAULT', text: 'Salvează că biroul meu preferat pentru clienți VIP este sala 3.' },
  { id: 'RC-C2-05', corridor: 'C2', intent: 'store_memory', tenant: 'DEFAULT', text: 'Memorează că deadline-ul fiscal pentru declarații este 25 ale lunii.' },
  { id: 'RC-C2-06', corridor: 'C2', intent: 'store_memory', tenant: 'A',       text: 'Ține minte că tenant-A folosește exclusiv RON ca monedă oficială.' },
  { id: 'RC-C2-07', corridor: 'C2', intent: 'store_memory', tenant: 'B',       text: 'Ține minte că tenant-B funcționează în EUR și are sediul în Cluj.' },
  { id: 'RC-C2-08', corridor: 'C2', intent: 'store_memory', tenant: 'DEFAULT', text: 'Note that the legal contact email is legal@ucenicul.test.' },
  // explicit replay (re-fires RC-C2-01 envelope; must produce 0 new memory_items rows)
  { id: 'RC-C2-01-replay', corridor: 'C2', intent: 'store_memory', tenant: 'DEFAULT', text: 'Ține minte că prefer întâlnirile online via Google Meet, nu Zoom.', replay_of: 'RC-C2-01' },

  // C3 — memory recall / search (7) — assumes C3 seed memory rows pre-loaded under default + A
  { id: 'RC-C3-01', corridor: 'C3', intent: 'search_memory', tenant: 'DEFAULT', text: 'Ce știi despre culoarea preferată a echipei?' },
  { id: 'RC-C3-02', corridor: 'C3', intent: 'search_memory', tenant: 'DEFAULT', text: 'Caută în memorie pentru orele standard de lucru.' },
  { id: 'RC-C3-03', corridor: 'C3', intent: 'search_memory', tenant: 'DEFAULT', text: 'What do you know about our investor preference?' },
  { id: 'RC-C3-04', corridor: 'C3', intent: 'search_memory', tenant: 'A',       text: 'Ce știi despre moneda oficială tenant-A?' },
  { id: 'RC-C3-05', corridor: 'C3', intent: 'search_memory', tenant: 'B',       text: 'Ce știi despre culoarea preferată tenant-A?' /* must NOT recall A's memory */ },
  { id: 'RC-C3-06', corridor: 'C3', intent: 'search_memory', tenant: 'DEFAULT', text: 'Ce știi despre xyz_marker_inexistent_qwerty?' /* zero-result probe */ },
  { id: 'RC-C3-07', corridor: 'C3', intent: 'search_memory', tenant: 'DEFAULT', text: 'Tot ce știi despre programul nostru de revisit.' },

  // C4 — memory update / supersede (3) — deflection probes; PL.intentMap lacks supersede_memory
  { id: 'RC-C4-01', corridor: 'C4', intent: 'supersede_memory', tenant: 'DEFAULT', text: 'Corectează: nu mai prefer Google Meet, prefer Microsoft Teams începând de azi.' },
  { id: 'RC-C4-02', corridor: 'C4', intent: 'supersede_memory', tenant: 'DEFAULT', text: 'Update memory: legal contact email is now legal-new@ucenicul.test.' },
  { id: 'RC-C4-03', corridor: 'C4', intent: 'supersede_memory', tenant: 'A',       text: 'Corectează: tenant-A folosește acum EUR, nu RON.' },

  // C5 — no-memory / social / filler (5)
  { id: 'RC-C5-01', corridor: 'C5', intent: 'briefing', tenant: 'DEFAULT', text: 'Mulțumesc, ești foarte util!' },
  { id: 'RC-C5-02', corridor: 'C5', intent: 'briefing', tenant: 'DEFAULT', text: 'Bună dimineața!' },
  { id: 'RC-C5-03', corridor: 'C5', intent: 'briefing', tenant: 'DEFAULT', text: 'Scuze, greșeala mea de mai devreme.' },
  { id: 'RC-C5-04', corridor: 'C5', intent: 'briefing', tenant: 'DEFAULT', text: 'Thanks, that was helpful!' },
  { id: 'RC-C5-05', corridor: 'C5', intent: 'briefing', tenant: 'DEFAULT', text: 'OK, am înțeles.' },

  // C7 — ambiguous request / clarification (7)
  { id: 'RC-C7-01', corridor: 'C7', intent: 'create_task',     tenant: 'DEFAULT', text: 'Fă chestia aia pentru mine.' /* ambiguous task — no specific target */ },
  { id: 'RC-C7-02', corridor: 'C7', intent: 'update_task',     tenant: 'DEFAULT', text: 'Mută-l pe altă dată.' /* ambiguous update target */ },
  { id: 'RC-C7-03', corridor: 'C7', intent: 'complete_task',   tenant: 'DEFAULT', text: 'Marchează ca făcut.' /* ambiguous complete target */ },
  { id: 'RC-C7-04', corridor: 'C7', intent: 'delete_task',     tenant: 'DEFAULT', text: 'Anulează-l.' /* ambiguous delete target */ },
  { id: 'RC-C7-05', corridor: 'C7', intent: 'store_memory',    tenant: 'DEFAULT', text: 'Ține minte asta.' /* ambiguous content */ },
  { id: 'RC-C7-06', corridor: 'C7', intent: 'save_suggestion', tenant: 'DEFAULT', text: 'Sugestie:' /* ambiguous feedback */ },
  { id: 'RC-C7-07', corridor: 'C7', intent: 'create_reminder', tenant: 'DEFAULT', text: 'Amintește-mi.' /* ambiguous reminder content */ },

  // C8 — thread continuity (6 fires across 2 thread clusters)
  // Cluster A — same thread used for 3 sequential messages.
  { id: 'RC-C8-01', corridor: 'C8', intent: 'create_task',  tenant: 'DEFAULT', text: 'Creează task: pregătește contractul cu clientul X mâine la 10.', thread_alias: 'C8-cluster-A' },
  { id: 'RC-C8-02', corridor: 'C8', intent: 'update_task',  tenant: 'DEFAULT', text: 'Mută taskul cu contractul X pe poimâine la 11.', thread_alias: 'C8-cluster-A' },
  { id: 'RC-C8-03', corridor: 'C8', intent: 'list_tasks',   tenant: 'DEFAULT', text: 'Listează taskurile mele deschise.', thread_alias: 'C8-cluster-A' },
  // Cluster B — fresh thread, separate continuity.
  { id: 'RC-C8-04', corridor: 'C8', intent: 'create_task',  tenant: 'DEFAULT', text: 'Creează task: pregătește prezentarea pentru investitori vineri.', thread_alias: 'C8-cluster-B' },
  { id: 'RC-C8-05', corridor: 'C8', intent: 'complete_task', tenant: 'DEFAULT', text: 'Marchează taskul cu prezentarea pentru investitori ca făcut.', thread_alias: 'C8-cluster-B' },
  { id: 'RC-C8-06', corridor: 'C8', intent: 'list_tasks',   tenant: 'DEFAULT', text: 'Ce am rămas deschis acum?', thread_alias: 'C8-cluster-B' },

  // C9 — cross-thread durable vs session (7)
  // 1 store in thread C9-store; 3 recalls in different threads (same tenant default); 2 cross-tenant probes; 1 session-only no-durable.
  { id: 'RC-C9-01', corridor: 'C9', intent: 'store_memory',  tenant: 'DEFAULT', text: 'Ține minte că our annual planning session is in November.', thread_alias: 'C9-store' },
  { id: 'RC-C9-02', corridor: 'C9', intent: 'search_memory', tenant: 'DEFAULT', text: 'When is our annual planning session?', thread_alias: 'C9-recall-1' /* fresh thread, same tenant */ },
  { id: 'RC-C9-03', corridor: 'C9', intent: 'search_memory', tenant: 'DEFAULT', text: 'Ce știi despre planificarea anuală?',                       thread_alias: 'C9-recall-2' /* fresh thread, same tenant */ },
  { id: 'RC-C9-04', corridor: 'C9', intent: 'search_memory', tenant: 'DEFAULT', text: 'Caută în memorie planificarea sesiunii anuale.',            thread_alias: 'C9-recall-3' /* fresh thread, same tenant */ },
  { id: 'RC-C9-05', corridor: 'C9', intent: 'search_memory', tenant: 'A',       text: 'When is our annual planning session?', thread_alias: 'C9-cross-tenant-A' /* cross-tenant probe — must NOT recall default's memory */ },
  { id: 'RC-C9-06', corridor: 'C9', intent: 'search_memory', tenant: 'B',       text: 'Ce știi despre planificarea anuală?',  thread_alias: 'C9-cross-tenant-B' /* cross-tenant probe */ },
  { id: 'RC-C9-07', corridor: 'C9', intent: 'briefing',      tenant: 'DEFAULT', text: 'Apropo, miercuri am o ședință scurtă cu echipa.', thread_alias: 'C9-session-only' /* session-only mention; no store */ },

  // Regression pack (8) — explicitly per mission spec
  { id: 'RC-REG-01', corridor: 'REG', intent: 'create_task',     tenant: 'DEFAULT', text: 'Creează task: regression smoke pentru chain post-improvement.' },
  { id: 'RC-REG-02', corridor: 'REG', intent: 'create_reminder', tenant: 'DEFAULT', text: 'Remind me tomorrow at 17 to validate regression smoke.' },
  { id: 'RC-REG-03', corridor: 'REG', intent: 'save_suggestion', tenant: 'DEFAULT', text: 'Sugestie: rapoarte săptămânale automate sunt utile pentru manageri.' },
  { id: 'RC-REG-04', corridor: 'REG', intent: 'log_improvement_request', tenant: 'DEFAULT', text: 'Feature request: please add CSV export for improvement_requests.' },
  { id: 'RC-REG-05', corridor: 'REG', intent: 'store_memory',    tenant: 'DEFAULT', text: 'Ține minte că adresa noastră de billing este billing@ucenicul.test.' },
  { id: 'RC-REG-06', corridor: 'REG', intent: 'search_memory',   tenant: 'DEFAULT', text: 'Ce știi despre adresa noastră de billing?' },
  { id: 'RC-REG-07', corridor: 'REG', intent: 'list_tasks',      tenant: 'DEFAULT', text: 'Listează taskurile mele deschise.' },
  // REG-08 is an SQL invariant probe (reminders unchanged) — no execute_workflow fire required, just verified post-run.
];

// ───── Pre-seeded memory rows for C3 / C9 ──────────────────────────
const MEMORY_SEEDS = [
  // Default tenant — generic facts for C3 recalls
  { id: '99000001-0001-4001-8001-aa1111110001', tenant: 'DEFAULT', content: 'Culoarea preferată a echipei pentru branding este albastru navy (#1B2A4E).', source_thread_alias: 'C3-seed-team-color' },
  { id: '99000001-0002-4001-8001-aa1111110002', tenant: 'DEFAULT', content: 'Orele standard de lucru ale echipei sunt 09:00-18:00 ora României.', source_thread_alias: 'C3-seed-work-hours' },
  { id: '99000001-0003-4001-8001-aa1111110003', tenant: 'DEFAULT', content: 'Investor preference is quarterly written reports rather than monthly calls.', source_thread_alias: 'C3-seed-investor-pref' },
  // Tenant A — for cross-tenant isolation probe
  { id: '99000002-0001-4002-8002-aa2222220001', tenant: 'A', content: 'Tenant-A moneda oficială este RON conform configurației iniţiale.', source_thread_alias: 'C3-seed-tenant-a-currency' },
];

// ───── Build envelopes + index ─────────────────────────────────────
const dir = join(__dirname, 'envelopes', RUN_TAG);
mkdirSync(dir, { recursive: true });

const items = CASES.map(c => {
  const tenant_id = TENANT[c.tenant];
  const baseSeed = c.replay_of ? `${RUN_TAG}|${c.replay_of}` : `${RUN_TAG}|${c.id}`;
  const message_id = c.replay_of ? detUuid(`${RUN_TAG}|${c.replay_of}|msg`) : detUuid(`${baseSeed}|msg`);
  const thread_id = c.thread_alias
    ? detUuid(`${RUN_TAG}|thread|${c.thread_alias}|${tenant_id}`)
    : detUuid(`${baseSeed}|thread`);
  const idempotency_key = `rcp1:${RUN_TAG}:${c.replay_of || c.id}`;
  const env = {
    message_id,
    tenant_id,
    channel: CHANNEL,
    direction: 'inbound',
    author_type: 'user',
    normalized_content: c.text,
    timestamp: new Date().toISOString(),
    source_message_ref: `rcp1:${c.id}`,
    author_entity_id: null,
    related_entity_ids: [],
    metadata: { rcp1_case_id: c.id, rcp1_corridor: c.corridor, rcp1_run_tag: RUN_TAG },
    idempotency_key,
    thread_id,
    reply_to_thread_id: null,
  };
  return { case: c, tenant_id, message_id, thread_id, idempotency_key, env };
});

for (const it of items) {
  writeFileSync(join(dir, `${it.case.id}.envelope.json`), JSON.stringify(it.env, null, 2));
}

// ───── Seed SQL ────────────────────────────────────────────────────
function seedTenantsSQL() {
  return `INSERT INTO public.tenants (id, organization_id, name, slug, vertical, display_name, is_active, timezone, currency_code, metadata) VALUES
  ('${TENANT.DEFAULT}'::uuid, '${ORG_ID}'::uuid, 'e2e-default', 'e2e-default', 'e2e', 'E2E Default', true, 'Europe/Bucharest', 'EUR', '{"rcp1":true}'::jsonb),
  ('${TENANT.A}'::uuid, '${ORG_ID}'::uuid, 'e2e-tenant-a', 'e2e-tenant-a', 'e2e', 'E2E Tenant A', true, 'Europe/Bucharest', 'EUR', '{"rcp1":true}'::jsonb),
  ('${TENANT.B}'::uuid, '${ORG_ID}'::uuid, 'e2e-tenant-b', 'e2e-tenant-b', 'e2e', 'E2E Tenant B', true, 'Europe/Bucharest', 'EUR', '{"rcp1":true}'::jsonb)
ON CONFLICT (id) DO NOTHING;`;
}

const seenThread = new Set();
const threadRows = [];
for (const it of items) {
  const k = `${it.tenant_id}|${it.thread_id}`;
  if (seenThread.has(k)) continue;
  seenThread.add(k);
  const titleSuffix = it.case.thread_alias || it.case.id;
  threadRows.push(`('${it.thread_id}'::uuid, '${it.tenant_id}'::uuid, ${sqlText('rcp1:' + titleSuffix)}, 'operational', 'new', ARRAY['${CHANNEL}']::varchar[])`);
}
const threadsSQL = `INSERT INTO public.threads (id, tenant_id, title, thread_type, status, source_channels) VALUES\n  ${threadRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`;

const seenMsg = new Set();
const msgRows = [];
for (const it of items) {
  if (seenMsg.has(it.message_id)) continue;
  seenMsg.add(it.message_id);
  msgRows.push(`('${it.message_id}'::uuid, '${ORG_ID}'::uuid, '${it.tenant_id}'::uuid, '${it.thread_id}'::uuid, 'inbound', 'user', '${CHANNEL}', ${sqlText(it.case.text)}, ${sqlText('rcp1:' + (it.case.replay_of || it.case.id))}, ${sqlText(it.case.text)}, ${sqlText(it.case.intent)}, NOW(), NOW())`);
}
const messagesSQL = `INSERT INTO public.messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES\n  ${msgRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`;

// Memory seeds — separate threads per source_thread_id (Memory V2 contract)
const memThreadRows = [];
const memMsgRows = [];
const memInsertRows = [];
for (const m of MEMORY_SEEDS) {
  const tid = TENANT[m.tenant];
  const seedThreadId = detUuid(`${RUN_TAG}|memseed|${m.source_thread_alias}|${tid}`);
  const seedMsgId = detUuid(`${RUN_TAG}|memseed|${m.source_thread_alias}|${tid}|msg`);
  memThreadRows.push(`('${seedThreadId}'::uuid, '${tid}'::uuid, ${sqlText('rcp1:memseed:' + m.source_thread_alias)}, 'operational', 'new', ARRAY['${CHANNEL}']::varchar[])`);
  memMsgRows.push(`('${seedMsgId}'::uuid, '${ORG_ID}'::uuid, '${tid}'::uuid, '${seedThreadId}'::uuid, 'inbound', 'user', '${CHANNEL}', ${sqlText('memseed: ' + m.content)}, ${sqlText('rcp1:memseed:' + m.source_thread_alias)}, ${sqlText('memseed: ' + m.content)}, 'store_memory', NOW(), NOW())`);
  memInsertRows.push(`('${m.id}'::uuid, '${tid}'::uuid, 'fact'::memory_type_enum, 'general'::text, ${sqlText(m.content)}, 0.95, 0.7, 'stable'::rag_durability_enum, '${seedThreadId}'::uuid, '${seedMsgId}'::uuid, '{}'::jsonb, '{"rcp1_seed":true,"alias":"${m.source_thread_alias}"}'::jsonb, ${sqlText('rcp1-seed:' + m.id)})`);
}
const memThreadsSQL = `INSERT INTO public.threads (id, tenant_id, title, thread_type, status, source_channels) VALUES\n  ${memThreadRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`;
const memMsgsSQL = `INSERT INTO public.messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES\n  ${memMsgRows.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`;
const memInsertsSQL = `INSERT INTO public.memory_items (id, tenant_id, memory_type, category, content, confidence, importance, durability, source_thread_id, source_message_id, evidence_refs, metadata, idempotency_key) VALUES\n  ${memInsertRows.join(',\n  ')}\nON CONFLICT (idempotency_key) DO NOTHING;`;

const seedSQL = [
  'BEGIN;',
  '-- TENANTS',  seedTenantsSQL(),
  '-- THREADS (cases)', threadsSQL,
  '-- MESSAGES (cases)', messagesSQL,
  '-- MEMORY-SEED THREADS', memThreadsSQL,
  '-- MEMORY-SEED MESSAGES', memMsgsSQL,
  '-- MEMORY-SEED ROWS', memInsertsSQL,
  'COMMIT;',
].join('\n');

writeFileSync(join(dir, '_seed.sql'), seedSQL);

writeFileSync(join(dir, '_index.json'), JSON.stringify({
  run_tag: RUN_TAG,
  count: items.length,
  cases: items.map(it => ({
    case_id: it.case.id,
    corridor: it.case.corridor,
    tenant: it.case.tenant,
    tenant_id: it.tenant_id,
    message_id: it.message_id,
    thread_id: it.thread_id,
    idempotency_key: it.idempotency_key,
    intent: it.case.intent,
    user_input: it.case.text,
    thread_alias: it.case.thread_alias || null,
    replay_of: it.case.replay_of || null,
  })),
}, null, 2));

console.log(JSON.stringify({
  run_tag: RUN_TAG,
  dir,
  total_fires: items.length,
  unique_cases: items.filter(x => !x.case.replay_of).length,
  replays: items.filter(x => x.case.replay_of).length,
  by_corridor: items.reduce((m, x) => { m[x.case.corridor] = (m[x.case.corridor] || 0) + 1; return m; }, {}),
  memory_seeds: MEMORY_SEEDS.length,
}, null, 2));
