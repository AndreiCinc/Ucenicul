#!/usr/bin/env node
// Local integration-style tests LI-1..LI-8.
// Mocks the supersede-DB step as a pure function over the merge output, then
// asserts end-to-end properties named in the pack TEST_PLAN §D.

import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const candidatePath = process.argv[2];
if (!candidatePath) {
  console.error('Usage: node run_integration_tests.mjs <path-to-supersede-merge-fn.mjs>');
  process.exit(2);
}
const mod = await import(pathToFileURL(candidatePath).href);
const merge = mod.default;

function vec(n = 1536) {
  return Array.from({ length: n }, (_, i) => Number((i / 100000).toFixed(6)));
}

function basePrep(overrides = {}) {
  return {
    __db: {
      old_id: '11111111-1111-1111-1111-111111111111',
      tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      memory_type: 'fact',
      category: 'f6af_li_case',
      content: 'alpha replacement content unique marker',
      confidence: 0.77,
      importance: 0.66,
      durability: 'stable',
      source_thread_id: '77777777-0000-0000-0000-000000000007',
      source_message_id: null,
      entity_id: null,
      evidence_refs: '[]',
      metadata: '{}',
      idempotency_key: 'supersede_memory:ctx1:li-1',
      tier: 'recent',
      ...overrides.__db,
    },
    passthrough: { env: {}, step: {}, inputs: {}, idempotency_key: 'supersede_memory:ctx1:li-1', ...overrides.passthrough }
  };
}

// --- Mock DB step: pure function simulating Supersede_DB SQL semantics ---

function mockDB(state, mergeOut) {
  const row = Array.isArray(mergeOut) ? mergeOut[0].json : mergeOut.json || mergeOut;
  if (row._error) {
    // queryReplacement error branch -> NOT NULL INSERT fails, continueOnFail catches
    return { status: 'error_path_null_insert_failed', row: null };
  }
  const key = row.__db.idempotency_key;
  const existing = state.rows.find(r => r.idempotency_key === key);
  if (existing) {
    // ON CONFLICT DO NOTHING + UNION ALL fallback
    return { status: 'idempotent_replay', row: existing, new_insert: false };
  }
  // Mark old row superseded
  const oldRow = state.rows.find(r => r.id === row.__db.old_id);
  if (!oldRow || oldRow.status !== 'active') {
    return { status: 'invalid_target', row: null };
  }
  oldRow.status = 'superseded';
  // Insert replacement
  const emb = row.__db.embedding_text;
  const newRow = {
    id: 'new-' + state.rows.length,
    tenant_id: row.__db.tenant_id,
    memory_type: row.__db.memory_type,
    category: row.__db.category,
    content: row.__db.content,
    idempotency_key: key,
    supersedes_memory_id: row.__db.old_id,
    tier: row.__db.tier,
    status: 'active',
    embedding: emb ? JSON.parse(emb) : null
  };
  state.rows.push(newRow);
  return { status: 'ok', row: newRow, new_insert: true };
}

function seedState(extra = []) {
  return {
    rows: [
      { id: '11111111-1111-1111-1111-111111111111', tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001', status: 'active', idempotency_key: 'store_memory:ctx0:seed-1', embedding: null, content: 'old alpha content' },
      ...extra
    ]
  };
}

const results = [];
function run(id, body) {
  try { body(); results.push({ id, ok: true }); console.log('PASS', id); }
  catch (e) { results.push({ id, ok: false, msg: e.message }); console.error('FAIL', id, e.message); }
}

// LI-1: valid supersede + valid embedding -> replacement row carries embedding
run('LI-1 valid supersede with embedding', () => {
  const state = seedState();
  const out = merge(basePrep(), { data: [{ embedding: vec(1536) }] });
  const r = mockDB(state, out);
  assert.equal(r.status, 'ok');
  assert.ok(Array.isArray(r.row.embedding));
  assert.equal(r.row.embedding.length, 1536);
  assert.equal(state.rows.find(x => x.id === '11111111-1111-1111-1111-111111111111').status, 'superseded');
});

// LI-2: idempotent replay: first wins, no duplicate
run('LI-2 idempotent replay', () => {
  const state = seedState();
  const out1 = merge(basePrep(), { data: [{ embedding: vec(1536) }] });
  const r1 = mockDB(state, out1);
  const out2 = merge(basePrep(), { data: [{ embedding: vec(1536) }] });
  const r2 = mockDB(state, out2);
  assert.equal(r1.new_insert, true);
  assert.equal(r2.new_insert, false);
  assert.equal(r2.row.id, r1.row.id);
  const count = state.rows.filter(r => r.idempotency_key === 'supersede_memory:ctx1:li-1').length;
  assert.equal(count, 1);
});

// LI-3: embedding HTTP failure -> supersede still valid, embedding NULL
run('LI-3 http error still supersedes', () => {
  const state = seedState();
  const out = merge(basePrep({ __db: { idempotency_key: 'supersede_memory:ctx1:li-3' } , passthrough: { idempotency_key: 'supersede_memory:ctx1:li-3' }}), { error: { message: 'quota exceeded' } });
  const r = mockDB(state, out);
  assert.equal(r.status, 'ok');
  assert.equal(r.row.embedding, null);
  assert.equal(state.rows.find(x => x.id === '11111111-1111-1111-1111-111111111111').status, 'superseded');
});

// LI-4: malformed response -> supersede valid, embedding NULL
run('LI-4 malformed response', () => {
  const state = seedState();
  const out = merge(basePrep({ __db: { idempotency_key: 'supersede_memory:ctx1:li-4' }, passthrough: { idempotency_key: 'supersede_memory:ctx1:li-4' } }), { data: [{}] });
  const r = mockDB(state, out);
  assert.equal(r.status, 'ok');
  assert.equal(r.row.embedding, null);
});

// LI-5: invalid target (no active row with that id) -> existing error (mock DB returns invalid_target)
run('LI-5 invalid target -> no replacement row', () => {
  const state = { rows: [] };  // no seed
  const out = merge(basePrep({ __db: { old_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', idempotency_key: 'supersede_memory:ctx1:li-5' }, passthrough: { idempotency_key: 'supersede_memory:ctx1:li-5' } }), { data: [{ embedding: vec(1536) }] });
  const r = mockDB(state, out);
  assert.equal(r.status, 'invalid_target');
  assert.equal(state.rows.length, 0);
});

// LI-6: Prep _error:true -> merge passes through verbatim, mockDB treats as error path
run('LI-6 prep _error short-circuit + DB error path', () => {
  const state = seedState();
  const prepErr = { _error: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN' };
  const out = merge(prepErr, { data: [{ embedding: vec(1536) }] });
  const val = Array.isArray(out) ? out[0].json : out;
  assert.equal(val._error, true);
  const r = mockDB(state, out);
  assert.equal(r.status, 'error_path_null_insert_failed');
  assert.equal(state.rows.find(x => x.id === '11111111-1111-1111-1111-111111111111').status, 'active');
});

// LI-7: old row keeps its prior embedding when superseded (not overwritten by this mission)
run('LI-7 old row embedding preserved', () => {
  const state = seedState();
  const oldEmb = vec(1536).map(x => x + 1);
  state.rows[0].embedding = oldEmb;
  const out = merge(basePrep({ __db: { idempotency_key: 'supersede_memory:ctx1:li-7' }, passthrough: { idempotency_key: 'supersede_memory:ctx1:li-7' } }), { data: [{ embedding: vec(1536) }] });
  const r = mockDB(state, out);
  assert.equal(r.status, 'ok');
  assert.deepEqual(state.rows[0].embedding, oldEmb);
  assert.equal(state.rows[0].status, 'superseded');
});

// LI-8: search selectability -> replacement row has non-null embedding and active status
run('LI-8 replacement row semantically eligible', () => {
  const state = seedState();
  const out = merge(basePrep({ __db: { idempotency_key: 'supersede_memory:ctx1:li-8' }, passthrough: { idempotency_key: 'supersede_memory:ctx1:li-8' } }), { data: [{ embedding: vec(1536) }] });
  const r = mockDB(state, out);
  assert.equal(r.status, 'ok');
  // semantic eligibility predicate: embedding IS NOT NULL AND status='active'
  assert.ok(r.row.embedding !== null);
  assert.equal(r.row.status, 'active');
});

const passed = results.filter(r => r.ok).length;
console.log(`ALL ${passed}/${results.length}`);
if (passed !== results.length) process.exit(1);
