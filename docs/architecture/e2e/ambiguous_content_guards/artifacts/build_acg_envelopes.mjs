#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url));
const RUN_TAG = 'acg-2026-04-25';
const OUT = resolve(D, 'envelopes', RUN_TAG);
mkdirSync(OUT, { recursive: true });

const TENANT = {
  DEFAULT: 'eee0e2e0-0000-0000-0000-000000000001',
  A:       'eee0e2e0-0000-0000-0000-00000000000a',
  B:       'eee0e2e0-0000-0000-0000-00000000000b',
};
function detUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}

// Three threads under default tenant.
const THREAD = {
  task_lane:    detUuid(`${RUN_TAG}|thread|task_lane|default`),
  memory_lane:  detUuid(`${RUN_TAG}|thread|memory_lane|default`),
  positive_lane:detUuid(`${RUN_TAG}|thread|positive_lane|default`),
  cross_tenant_a: detUuid(`${RUN_TAG}|thread|cross_tenant_a`),
};

const cases = [
  // ─── 3 ambiguous repros (must NOT write) ────────────────────────────
  { id: 'ACG-01', desc: 'ambiguous task repro of C7-01',         lane: 'task_lane',     tenant: 'DEFAULT', text: 'Fă chestia aia pentru mine.' },
  { id: 'ACG-02', desc: 'ambiguous memory repro of C7-05',       lane: 'memory_lane',   tenant: 'DEFAULT', text: 'Ține minte asta.' },
  { id: 'ACG-03', desc: 'ambiguous reminder→task repro of C7-07',lane: 'task_lane',     tenant: 'DEFAULT', text: 'Amintește-mi.' },
  // ─── 6 positive regressions (must WRITE / read-only as appropriate) ─
  { id: 'ACG-04', desc: 'valid create_task',                     lane: 'positive_lane', tenant: 'DEFAULT', text: 'Creează task: ACG smoke pentru chain post-guard.' },
  { id: 'ACG-05', desc: 'valid store_memory',                    lane: 'positive_lane', tenant: 'DEFAULT', text: 'Ține minte că ACG smoke se rulează din thread positive_lane.' },
  { id: 'ACG-06', desc: 'valid create_reminder→task',            lane: 'positive_lane', tenant: 'DEFAULT', text: 'Amintește-mi mâine la 11 să verific ACG runtime smoke.' },
  { id: 'ACG-07', desc: 'valid capture_feedback',                lane: 'positive_lane', tenant: 'DEFAULT', text: 'Sugestie: adaugă vizualizarea task-urilor în calendar pentru ACG smoke.' },
  { id: 'ACG-08', desc: 'valid search_memory (read-only)',       lane: 'positive_lane', tenant: 'DEFAULT', text: 'Ce știi despre ACG smoke?' },
  { id: 'ACG-09', desc: 'valid list_tasks (read-only)',          lane: 'positive_lane', tenant: 'DEFAULT', text: 'Listează task-urile mele.' },
  // ─── 4 safety probes ───────────────────────────────────────────────
  { id: 'ACG-10', desc: 'replay valid store_memory (idempotent)',lane: 'positive_lane', tenant: 'DEFAULT', text: 'Ține minte că ACG smoke se rulează din thread positive_lane.', replay_of: 'ACG-05' },
  { id: 'ACG-11', desc: 'replay valid create_task (idempotent)', lane: 'positive_lane', tenant: 'DEFAULT', text: 'Creează task: ACG smoke pentru chain post-guard.', replay_of: 'ACG-04' },
  { id: 'ACG-12', desc: 'cross-tenant memory recall (A search)', lane: 'cross_tenant_a',tenant: 'A',       text: 'Ce știi despre ACG smoke?' },
  { id: 'ACG-13', desc: 'reminders unchanged (probe-only SQL)',  lane: '__sql_only__',  tenant: 'DEFAULT', text: null },
];

const index = [];
for (const c of cases) {
  if (c.lane === '__sql_only__') { index.push({...c, sql_only: true}); continue; }
  const message_id = detUuid(`${RUN_TAG}|${c.id}|msg`);
  const thread_id = THREAD[c.lane];
  const tenant_id = TENANT[c.tenant];
  const idem = c.replay_of ? `acg:${RUN_TAG}:${c.replay_of}` : `acg:${RUN_TAG}:${c.id}`;
  const env = {
    message_id,
    tenant_id,
    channel: 'acg-runtime',
    direction: 'inbound',
    author_type: 'user',
    normalized_content: c.text,
    timestamp: new Date().toISOString(),
    source_message_ref: `acg:${c.id}:${idem}`,
    author_entity_id: null,
    related_entity_ids: [],
    metadata: { acg_case_id: c.id, acg_lane: c.lane, acg_run_tag: RUN_TAG, ...(c.replay_of ? { acg_replay_of: c.replay_of } : {}) },
    idempotency_key: idem,
    thread_id,
    reply_to_thread_id: null
  };
  writeFileSync(resolve(OUT, `${c.id}.envelope.json`), JSON.stringify(env, null, 2));
  index.push({ id: c.id, desc: c.desc, lane: c.lane, tenant: c.tenant, thread_id, message_id, tenant_id, idem, replay_of: c.replay_of || null });
}
writeFileSync(resolve(OUT, '_index.json'), JSON.stringify({ run_tag: RUN_TAG, threads: THREAD, tenants: TENANT, cases: index }, null, 2));

// Build seed SQL: 3 + 1 = 4 threads.
const seedLines = [];
seedLines.push('-- ACG seed: 4 threads under default + tenant A.');
for (const [lane, tid] of Object.entries(THREAD)) {
  const tenantId = lane === 'cross_tenant_a' ? TENANT.A : TENANT.DEFAULT;
  seedLines.push(`INSERT INTO public.threads (id, tenant_id, thread_type, status, source_channels, last_activity_at, created_at, updated_at) VALUES ('${tid}', '${tenantId}'::uuid, 'operational', 'active', ARRAY['acg-runtime']::varchar[], now(), now(), now()) ON CONFLICT (id) DO NOTHING;`);
}
writeFileSync(resolve(OUT, '_seed.sql'), seedLines.join('\n') + '\n');

console.log(`wrote ${cases.length} cases to ${OUT}`);
console.log(`threads: ${JSON.stringify(THREAD, null, 2)}`);
