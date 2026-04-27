// build_c11_rg_runtimes.mjs — assemble shared-replay-group runtimes for C11.
//
// Reads the canonical harness primitives (no mutation), produces
// 5 runtime+envelope JSON files for C11-RG-001..005.
//
// Usage:
//   node docs/architecture/e2e/c11_replay_grouping_targeted_rerun/artifacts/build_c11_rg_runtimes.mjs
//
// Writes into the same artifacts/ directory.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMatrix } from '../../harness/case_loader.mjs';
import { buildCaseRuntime, buildTrEnvelope, deriveIdempotencyKey, deriveThreadId, detUuid } from '../../harness/tr_envelope.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');

const MATRIX_PATH = resolve(REPO_ROOT, 'docs/architecture/e2e/harness/e2e_matrix.json');
const matrix = loadMatrix(MATRIX_PATH);

function findCase(case_id) {
  const c = matrix.cases.find(x => x.case_id === case_id);
  if (!c) throw new Error(`case not found: ${case_id}`);
  return c;
}

const RUN_TAG = 'c11rg-2026-04-27';
const FRESH_RUN_TAG = 'c11rg-2026-04-27-fresh';

const v1 = findCase('C11-L1-V1');
const v2 = findCase('C11-L1-V2');
const v3 = findCase('C11-L1-V3');
const v4 = findCase('C11-L1-V4');

// ---- Replay group: V1 acts as first delivery, but uses the canonical replay key.
const v1Runtime = buildCaseRuntime(v1, RUN_TAG, null);
// Override v1.idempotency_key so all 4 fires share the canonical replay key.
const REPLAY_KEY = `e2e:${RUN_TAG}:C11-L1-replay`;
v1Runtime.idempotency_key = REPLAY_KEY;
// Force thread_id under the same C11:replay-L1 label that the harness uses for
// duplicate_delivery_/late_retry_ variants — pickThreadLabel returns
// `C11:replay-L1` when variant matches, but for first_delivery it returns
// `C11:replay-L1` too (the regex matches `first_delivery|duplicate_delivery_|late_retry_`).
// So buildCaseRuntime already gives us the right thread_id label. Keep as is.

const replayHint = {
  idempotency_key: v1Runtime.idempotency_key,
  message_id: v1Runtime.message_id,
  thread_id: v1Runtime.thread_id,
};

// V2/V3/V4: ctx.kind is 'replay' for these variants — buildCaseRuntime will
// honor replayHint (idempotency_key, message_id, thread_id all inherited).
const v2Runtime = buildCaseRuntime(v2, RUN_TAG, replayHint);
const v3Runtime = buildCaseRuntime(v3, RUN_TAG, replayHint);
const v4Runtime = buildCaseRuntime(v4, RUN_TAG, replayHint);

// Sanity assertions
function assertEq(label, a, b) {
  if (a !== b) throw new Error(`assert ${label} failed: ${a} !== ${b}`);
}
assertEq('v2 idempotency_key', v2Runtime.idempotency_key, REPLAY_KEY);
assertEq('v3 idempotency_key', v3Runtime.idempotency_key, REPLAY_KEY);
assertEq('v4 idempotency_key', v4Runtime.idempotency_key, REPLAY_KEY);
assertEq('v2 message_id', v2Runtime.message_id, v1Runtime.message_id);
assertEq('v3 message_id', v3Runtime.message_id, v1Runtime.message_id);
assertEq('v4 message_id', v4Runtime.message_id, v1Runtime.message_id);
assertEq('v2 thread_id', v2Runtime.thread_id, v1Runtime.thread_id);
assertEq('v3 thread_id', v3Runtime.thread_id, v1Runtime.thread_id);
assertEq('v4 thread_id', v4Runtime.thread_id, v1Runtime.thread_id);
assertEq('v2 tenant_id', v2Runtime.tenant_id, v1Runtime.tenant_id);

// ---- Fresh control: a new replay group, distinct thread_id, distinct key.
const v5Runtime = buildCaseRuntime(v1, FRESH_RUN_TAG, null);
const FRESH_KEY = `e2e:${FRESH_RUN_TAG}:C11-L1-replay`;
v5Runtime.idempotency_key = FRESH_KEY;

if (v5Runtime.thread_id === v1Runtime.thread_id) throw new Error('fresh control thread_id collides with replay-group thread_id');
if (v5Runtime.message_id === v1Runtime.message_id) throw new Error('fresh control message_id collides');

// Build envelopes & write files.
const cases = [
  { case_id: 'C11-RG-001', matrixCase: v1, runtime: v1Runtime, role: 'replay-group: first delivery' },
  { case_id: 'C11-RG-002', matrixCase: v2, runtime: v2Runtime, role: 'replay-group: duplicate_delivery_1' },
  { case_id: 'C11-RG-003', matrixCase: v3, runtime: v3Runtime, role: 'replay-group: duplicate_delivery_2' },
  { case_id: 'C11-RG-004', matrixCase: v4, runtime: v4Runtime, role: 'replay-group: late_retry_after_state_change' },
  { case_id: 'C11-RG-005', matrixCase: v1, runtime: v5Runtime, role: 'fresh-control' },
];

mkdirSync(__dirname, { recursive: true });
const summary = [];
for (const c of cases) {
  const env = buildTrEnvelope(c.matrixCase, c.runtime);
  // Override the metadata e2e_case_id to the RG label so we can correlate fires by case_id.
  env.metadata.e2e_case_id = c.case_id;
  env.metadata.e2e_replay_group = c.case_id.startsWith('C11-RG-005') ? 'fresh' : 'main';
  env.metadata.e2e_role = c.role;
  env.metadata.e2e_run_tag = c.runtime.run_tag;
  writeFileSync(join(__dirname, `${c.case_id}.runtime.json`), JSON.stringify(c.runtime, null, 2));
  writeFileSync(join(__dirname, `${c.case_id}.envelope.json`), JSON.stringify(env, null, 2));
  summary.push({
    case_id: c.case_id,
    role: c.role,
    tenant_id: c.runtime.tenant_id,
    thread_id: c.runtime.thread_id,
    message_id: c.runtime.message_id,
    idempotency_key: c.runtime.idempotency_key,
    user_input: env.normalized_content,
  });
}
writeFileSync(join(__dirname, 'C11_RG_RUNTIME_SUMMARY.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
