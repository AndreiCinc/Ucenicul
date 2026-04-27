// probes_seed_and_envelopes.mjs — IL probes for IMPROVEMENT_MODULE_LIST_FOLLOWUP.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detUuid, E2E } from '../../../e2e/harness/tr_envelope.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(__dirname, { recursive: true });

const RUN_TAG = 'il-2026-04-27';
const ORG = '38fde66e-3920-4bf3-9d70-ddbca9faf58a';
const NOW_ISO = new Date().toISOString();

function probe(case_id, tenant_id, intent, user_input) {
  const message_id = detUuid(`${RUN_TAG}|${case_id}|msg`);
  const thread_id  = detUuid(`${RUN_TAG}|${case_id}|thread`);
  const idempotency_key = `e2e:${RUN_TAG}:${case_id}`;
  return { case_id, tenant_id, intent, user_input, message_id, thread_id, idempotency_key };
}

const probes = [
  probe('IL-001', E2E.TENANT_DEFAULT, 'list_improvements', 'Listează sugestiile.'),
  probe('IL-002', E2E.TENANT_DEFAULT, 'list_improvements', 'Show all suggestions.'),
  probe('IL-003', E2E.TENANT_DEFAULT, 'list_improvements', 'Listează sugestiile cu status pending.'),
  probe('IL-004', E2E.TENANT_B,        'list_improvements', 'List my suggestions.'),
  probe('IL-005', E2E.TENANT_DEFAULT, 'save_suggestion',   'Sugestie: adaugă filtre avansate.'),
  probe('IL-R-task',  E2E.TENANT_DEFAULT, 'create_task',  'Creează task: scrie raportul'),
  probe('IL-R-store', E2E.TENANT_DEFAULT, 'store_memory', 'Ține minte că folosesc Node 22.'),
];

const sqlText = (s) => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
const lines = ['BEGIN;'];

const threadRows = probes.map(p =>
  `('${p.thread_id}'::uuid, '${p.tenant_id}'::uuid, ${sqlText('e2e:' + RUN_TAG + ':' + p.case_id)}, 'operational', 'new', ARRAY['e2e-rich-matrix']::varchar[])`
).join(',\n  ');
lines.push(`INSERT INTO threads (id, tenant_id, title, thread_type, status, source_channels) VALUES\n  ${threadRows}\nON CONFLICT (id) DO NOTHING;`);

const msgRows = probes.map(p =>
  `('${p.message_id}'::uuid, '${ORG}'::uuid, '${p.tenant_id}'::uuid, '${p.thread_id}'::uuid, 'inbound', 'user', 'e2e-rich-matrix', ${sqlText(p.user_input)}, ${sqlText('e2e:' + p.case_id)}, ${sqlText(p.user_input)}, ${sqlText(p.intent)}, NOW(), NOW())`
).join(',\n  ');
lines.push(`INSERT INTO messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES\n  ${msgRows}\nON CONFLICT (id) DO NOTHING;`);

lines.push('COMMIT;');
writeFileSync(join(__dirname, 'seed.sql'), lines.join('\n'));

for (const p of probes) {
  const env = {
    message_id: p.message_id,
    tenant_id: p.tenant_id,
    channel: E2E.CHANNEL,
    direction: 'inbound',
    author_type: 'user',
    normalized_content: p.user_input,
    timestamp: NOW_ISO,
    source_message_ref: `e2e:${p.case_id}:${p.idempotency_key}`,
    author_entity_id: null,
    related_entity_ids: [],
    metadata: { e2e_case_id: p.case_id, e2e_run_tag: RUN_TAG, e2e_intent_test: p.intent },
    idempotency_key: p.idempotency_key,
    thread_id: p.thread_id,
  };
  writeFileSync(join(__dirname, `${p.case_id}.envelope.json`), JSON.stringify(env, null, 2));
}
writeFileSync(join(__dirname, 'PROBE_SUMMARY.json'), JSON.stringify(probes, null, 2));
console.log(JSON.stringify(probes, null, 2));
