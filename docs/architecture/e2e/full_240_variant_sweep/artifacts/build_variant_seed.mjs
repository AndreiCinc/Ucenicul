// build_variant_seed.mjs — emit a focused seed SQL for the variant sweep cases
// to be fired in this autonomous window. Includes only:
//   - thread rows whose case_id is in CASES_TO_FIRE
//   - message rows whose case_id is in CASES_TO_FIRE
//   - C4 supersede target memory_items (one per L1 V1..V4)
//
// All idempotent (ON CONFLICT DO NOTHING).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCaseRuntime, pickThreadLabel, E2E } from '../../harness/tr_envelope.mjs';
import { getSystemIntent } from '../../harness/intent_mapping.mjs';
import { loadMatrix } from '../../harness/case_loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const matrix = loadMatrix(join(REPO_ROOT, 'docs/architecture/e2e/harness/e2e_matrix.json'));
const ORG = '38fde66e-3920-4bf3-9d70-ddbca9faf58a';

// Variant sweep target list — risk order (C10 → C11 → C4 → C7 → C9 → C2/C3 → C6/C12 → C1/C5 → C8).
// L1 V2/V3/V4 across all 12 corridors plus C8 specials + C9 V4.
const CASES_TO_FIRE = [
  // C10 tenant isolation V2/V3/V4
  'C10-L1-V2','C10-L1-V3','C10-L1-V4',
  // C11 idempotency V2/V3/V4
  'C11-L1-V2','C11-L1-V3','C11-L1-V4',
  // C4 supersede V2/V3/V4
  'C4-L1-V2','C4-L1-V3','C4-L1-V4',
  // C7 ambiguity V2/V3/V4
  'C7-L1-V2','C7-L1-V3','C7-L1-V4',
  // C9 durable variants — V4 thread_C_ambiguous_reference
  'C9-L1-V4',
  // C2 memory write V2/V3/V4
  'C2-L1-V2','C2-L1-V3','C2-L1-V4',
  // C3 search V2/V3/V4
  'C3-L1-V2','C3-L1-V3','C3-L1-V4',
  // C6 task V2/V3/V4
  'C6-L1-V2','C6-L1-V3','C6-L1-V4',
  // C12 large V2/V3/V4
  'C12-L1-V2','C12-L1-V3','C12-L1-V4',
  // C1 response V2/V3/V4
  'C1-L1-V2','C1-L1-V3','C1-L1-V4',
  // C5 social V2/V3/V4
  'C5-L1-V2','C5-L1-V3','C5-L1-V4',
  // C8 thread V2/V3/V4
  'C8-L1-V2','C8-L1-V3','C8-L1-V4',
];

const RUN_TAG = 'f240r-2026-04-26';
const safe = s => String(s).replace(/'/g, "''");

const threadRows = new Map();   // key = `${tenant}|${thread_id}` → SQL fragment
const msgRows = [];

for (const id of CASES_TO_FIRE) {
  const c = matrix.cases.find(x => x.case_id === id);
  if (!c) { console.error('missing matrix case:', id); continue; }
  const rt = buildCaseRuntime(c, RUN_TAG, null);
  const intent = getSystemIntent(c);
  // Thread (skip new_thread_negative_control which has thread_id=null)
  if (rt.thread_id) {
    const key = `${rt.tenant_id}|${rt.thread_id}`;
    if (!threadRows.has(key)) {
      const label = pickThreadLabel(c);
      threadRows.set(key, `('${rt.thread_id}'::uuid, '${rt.tenant_id}'::uuid, ${"'"+safe('e2e:'+RUN_TAG+':'+label)+"'"}, 'operational', 'new', ARRAY['e2e-rich-matrix']::varchar[])`);
    }
  }
  // Message
  const tid = rt.thread_id ? `'${rt.thread_id}'::uuid` : 'NULL';
  msgRows.push(`('${rt.message_id}'::uuid, '${ORG}'::uuid, '${rt.tenant_id}'::uuid, ${tid}, 'inbound', 'user', 'e2e-rich-matrix', '${safe(c.user_input)}', '${safe('e2e:'+id)}', '${safe(c.user_input)}', '${intent}', NOW(), NOW())`);
}

const out = [];
out.push('BEGIN;');
if (threadRows.size) {
  out.push('INSERT INTO threads (id, tenant_id, title, thread_type, status, source_channels) VALUES');
  out.push('  ' + Array.from(threadRows.values()).join(',\n  '));
  out.push('ON CONFLICT (id) DO NOTHING;');
}
if (msgRows.length) {
  out.push('INSERT INTO messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES');
  out.push('  ' + msgRows.join(',\n  '));
  out.push('ON CONFLICT (id) DO NOTHING;');
}
// 3 C4 target memories for L1-V2/V3/V4 supersede fires (each fire needs its own target).
const C4_TARGETS = [
  { id: 'c4f24026-aaaa-4bbb-8ccc-000000000002', case: 'C4-L1-V2' },
  { id: 'c4f24026-aaaa-4bbb-8ccc-000000000003', case: 'C4-L1-V3' },
  { id: 'c4f24026-aaaa-4bbb-8ccc-000000000004', case: 'C4-L1-V4' },
];
out.push('-- C4 supersede target memories');
for (const tgt of C4_TARGETS) {
  const c = matrix.cases.find(x => x.case_id === tgt.case);
  const rt = buildCaseRuntime(c, RUN_TAG, null);
  out.push(`INSERT INTO memory_items (id, tenant_id, memory_type, category, content, status, idempotency_key, source_thread_id, created_at, updated_at) VALUES ('${tgt.id}'::uuid, '${rt.tenant_id}'::uuid, 'fact', 'general', 'Andrei preferă antrenamente dimineața (target ${tgt.case}).', 'active', 'e2e:${RUN_TAG}:${tgt.case}:seed', '${rt.thread_id}'::uuid, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;`);
}
out.push('COMMIT;');
out.push('SELECT count(*) AS threads_after FROM threads WHERE source_channels @> ARRAY[\'e2e-rich-matrix\']::varchar[] AND title LIKE \'e2e:f240r-2026-04-26:%\';');
out.push('SELECT count(*) AS msgs_after FROM messages WHERE channel=\'e2e-rich-matrix\' AND source_message_ref LIKE \'e2e:C%-L1-V%\';');

writeFileSync(join(REPO_ROOT, 'docs/architecture/e2e/full_240_variant_sweep/artifacts/_variant_seed.sql'), out.join('\n'));
console.log('CASES_TO_FIRE:', CASES_TO_FIRE.length);
console.log('thread rows:', threadRows.size);
console.log('msg rows:', msgRows.length);
console.log('bytes:', out.join('\n').length);
