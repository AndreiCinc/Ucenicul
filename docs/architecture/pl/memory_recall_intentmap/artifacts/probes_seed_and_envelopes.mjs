// probes_seed_and_envelopes.mjs — produce SQL seed + envelopes for MR probes.
//
// 7 probes:
//   MR-001 RO recall (intent=recall_memory, tenant default)
//   MR-002 EN recall (intent=recall_memory, tenant default)
//   MR-003 search_memory regression (intent=search_memory, tenant default)
//   MR-004 cross-tenant recall (intent=recall_memory, tenant B)
//   R-1    store_memory regression (intent=store_memory, tenant default)
//   R-2    create_task regression (intent=create_task, tenant default)
//   R-3    capture_feedback regression (intent=save_suggestion, tenant default)
//
// Outputs: seed.sql + <case>.envelope.json files in artifacts/.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detUuid, E2E } from '../../../e2e/harness/tr_envelope.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(__dirname, { recursive: true });

const RUN_TAG = 'mr-2026-04-27';
const ORG = '38fde66e-3920-4bf3-9d70-ddbca9faf58a';
const NOW_ISO = new Date().toISOString();

function probe(case_id, tenant_id, intent, user_input) {
  const tag = case_id;
  const message_id = detUuid(`${RUN_TAG}|${tag}|msg`);
  const thread_id = detUuid(`${RUN_TAG}|${tag}|thread`);
  const idempotency_key = `e2e:${RUN_TAG}:${tag}`;
  return { case_id: tag, tenant_id, intent, user_input, message_id, thread_id, idempotency_key };
}

const probes = [
  probe('MR-001', E2E.TENANT_DEFAULT, 'recall_memory', 'Ce am notat despre preferințe?'),
  probe('MR-002', E2E.TENANT_DEFAULT, 'recall_memory', 'What did I save about preferences?'),
  probe('MR-003', E2E.TENANT_DEFAULT, 'search_memory', 'caută preferințe'),
  probe('MR-004', E2E.TENANT_B,        'recall_memory', 'What memories do I have?'),
  probe('R-1',    E2E.TENANT_DEFAULT, 'store_memory',  'Ține minte că folosesc Postgres 16.'),
  probe('R-2',    E2E.TENANT_DEFAULT, 'create_task',   'Creează un task: review pull request'),
  probe('R-3',    E2E.TENANT_DEFAULT, 'save_suggestion','Sugestie: adaugă export CSV.'),
];

// --- SQL seed ---
const sqlText = (s) => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
const lines = ['BEGIN;'];

// threads
const threadRows = probes.map(p =>
  `('${p.thread_id}'::uuid, '${p.tenant_id}'::uuid, ${sqlText('e2e:' + RUN_TAG + ':' + p.case_id)}, 'operational', 'new', ARRAY['e2e-rich-matrix']::varchar[])`
).join(',\n  ');
lines.push(`INSERT INTO threads (id, tenant_id, title, thread_type, status, source_channels) VALUES\n  ${threadRows}\nON CONFLICT (id) DO NOTHING;`);

// messages
const msgRows = probes.map(p =>
  `('${p.message_id}'::uuid, '${ORG}'::uuid, '${p.tenant_id}'::uuid, '${p.thread_id}'::uuid, 'inbound', 'user', 'e2e-rich-matrix', ${sqlText(p.user_input)}, ${sqlText('e2e:' + p.case_id)}, ${sqlText(p.user_input)}, ${sqlText(p.intent)}, NOW(), NOW())`
).join(',\n  ');
lines.push(`INSERT INTO messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES\n  ${msgRows}\nON CONFLICT (id) DO NOTHING;`);

lines.push('COMMIT;');
writeFileSync(join(__dirname, 'seed.sql'), lines.join('\n'));

// --- Envelopes ---
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
    metadata: {
      e2e_case_id: p.case_id,
      e2e_run_tag: RUN_TAG,
      e2e_intent_test: p.intent,
    },
    idempotency_key: p.idempotency_key,
    thread_id: p.thread_id,
  };
  writeFileSync(join(__dirname, `${p.case_id}.envelope.json`), JSON.stringify(env, null, 2));
}

writeFileSync(join(__dirname, 'PROBE_SUMMARY.json'), JSON.stringify(probes, null, 2));
console.log(JSON.stringify(probes, null, 2));
