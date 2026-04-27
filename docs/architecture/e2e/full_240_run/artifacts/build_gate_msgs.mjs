// build_gate_msgs.mjs — emit a single INSERT for the 20 gate-case messages
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSystemIntent } from '../../harness/intent_mapping.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const m = JSON.parse(readFileSync(join(REPO_ROOT, 'docs/architecture/e2e/harness/e2e_matrix.json'), 'utf8'));

const gateIds = [
  'C1-L1-V1','C2-L1-V1','C2-L4-V3','C3-L1-V1','C3-L3-V3',
  'C4-L1-V1','C4-L2-V2','C4-L3-V3','C5-L1-V1','C6-L1-V1',
  'C7-L1-V1','C7-L2-V2','C7-L3-V3','C8-L1-V1',
  'C9-L1-V1','C9-L1-V2','C9-L1-V3','C10-L1-V1','C11-L1-V1','C12-L1-V1'
];

const ORG = '38fde66e-3920-4bf3-9d70-ddbca9faf58a';
const safe = (s) => s.replace(/'/g, "''");

let sql = `INSERT INTO messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES\n`;
const fragments = [];
for (const id of gateIds) {
  const c = m.cases.find(x => x.case_id === id);
  const env = JSON.parse(readFileSync(join(REPO_ROOT, `docs/architecture/e2e/full_240_run/artifacts/envelopes/${id}.envelope.json`), 'utf8'));
  const intent = getSystemIntent(c);
  fragments.push(`  ('${env.message_id}'::uuid, '${ORG}'::uuid, '${env.tenant_id}'::uuid, '${env.thread_id}'::uuid, 'inbound', 'user', 'e2e-rich-matrix', '${safe(env.normalized_content)}', 'e2e:${id}', '${safe(env.normalized_content)}', '${intent}', NOW(), NOW())`);
}
sql += fragments.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';
writeFileSync(join(REPO_ROOT, 'docs/architecture/e2e/full_240_run/artifacts/_gate_msgs.sql'), sql);
console.log('rows=', gateIds.length, 'bytes=', sql.length);
