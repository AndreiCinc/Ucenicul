#!/usr/bin/env node
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const candidatePath = process.argv[2];
if (!candidatePath) {
  console.error('Usage: node tests/local/run_merge_unit_tests.mjs <path-to-supersede-merge-fn.mjs>');
  process.exit(2);
}

const mod = await import(pathToFileURL(candidatePath).href);
const merge = mod.default || mod.mergeSupersedeEmbedding || mod.merge;
if (typeof merge !== 'function') {
  throw new Error('Candidate module must export default function, mergeSupersedeEmbedding, or merge');
}

function vec(n = 1536) {
  return Array.from({ length: n }, (_, i) => Number((i / 100000).toFixed(6)));
}

function normalize(out) {
  const value = Array.isArray(out) ? out[0] : out;
  return value && value.json ? value.json : value;
}

function prepBase(overrides = {}) {
  return {
    __db: {
      tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      old_memory_id: '11111111-1111-1111-1111-111111111111',
      memory_type: 'fact',
      category: 'f6a_followup_supersede',
      content: 'replacement memory content alpha unique',
      confidence: 0.77,
      importance: 0.66,
      durability: 'stable',
      source_thread_id: '77777777-0000-0000-0000-000000000007',
      source_message_id: null,
      entity_id: null,
      evidence_refs: JSON.stringify([]),
      metadata: JSON.stringify({ test: true }),
      idempotency_key: 'supersede_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-f6a-followup-supersede-embed-unit',
      ...overrides.__db,
    },
    passthrough: {
      action: 'supersede_memory',
      marker: 'preserve-me',
      ...overrides.passthrough,
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([k]) => !['__db','passthrough'].includes(k))),
  };
}

const cases = [
  {
    id: 'MU-1 valid vector',
    prep: prepBase(),
    http: { data: [{ embedding: vec(1536) }] },
    check(out) {
      assert.equal(typeof out.__db.embedding_text, 'string');
      assert.equal(JSON.parse(out.__db.embedding_text).length, 1536);
      assert.equal(out.passthrough.embedding_attempted, true);
      assert.equal(out.passthrough.embedding_error, null);
      assert.equal(out.passthrough.marker, 'preserve-me');
    },
  },
  {
    id: 'MU-2 OpenAI error object',
    prep: prepBase(),
    http: { error: { message: 'quota exceeded' } },
    check(out) {
      assert.equal(out.__db.embedding_text, null);
      assert.match(out.passthrough.embedding_error, /embedding_http_error|quota exceeded/);
    },
  },
  {
    id: 'MU-3 statusCode >= 400',
    prep: prepBase(),
    http: { statusCode: 429 },
    check(out) {
      assert.equal(out.__db.embedding_text, null);
      assert.match(out.passthrough.embedding_error, /embedding_http_429/);
    },
  },
  {
    id: 'MU-4 malformed response',
    prep: prepBase(),
    http: { data: [{}] },
    check(out) {
      assert.equal(out.__db.embedding_text, null);
      assert.equal(out.passthrough.embedding_error, 'embedding_response_unusable');
    },
  },
  {
    id: 'MU-5 wrong dimension',
    prep: prepBase(),
    http: { data: [{ embedding: vec(12) }] },
    check(out) {
      assert.equal(out.__db.embedding_text, null);
      assert.equal(out.passthrough.embedding_error, 'embedding_response_unusable');
    },
  },
  {
    id: 'MU-6 prep error short-circuit',
    prep: { _error: true, error_code: 'SUPERSEDE_TARGET_INVALID', passthrough: { marker: 'error-preserved' } },
    http: { data: [{ embedding: vec(1536) }] },
    check(out, originalPrep) {
      assert.deepEqual(out, originalPrep);
    },
  },
  {
    id: 'MU-7 existing embedding_text preserved',
    prep: prepBase({ __db: { embedding_text: '[0.1,0.2,0.3]' } }),
    http: { data: [{ embedding: vec(1536) }] },
    check(out) {
      assert.equal(out.__db.embedding_text, '[0.1,0.2,0.3]');
      assert.equal(out.passthrough.embedding_attempted, false);
      assert.equal(out.passthrough.embedding_error, null);
    },
  },
  {
    id: 'MU-8 non-embedding __db fields preserved',
    prep: prepBase(),
    http: { data: [{ embedding: vec(1536) }] },
    check(out, originalPrep) {
      for (const [key, value] of Object.entries(originalPrep.__db)) {
        if (key === 'embedding_text') continue;
        assert.deepEqual(out.__db[key], value, `__db.${key} changed`);
      }
    },
  },
  {
    id: 'MU-9 passthrough preserved with diagnostics appended',
    prep: prepBase({ passthrough: { marker: 'preserve-me', custom: { nested: true } } }),
    http: { data: [{ embedding: vec(1536) }] },
    check(out) {
      assert.deepEqual(out.passthrough.custom, { nested: true });
      assert.equal(out.passthrough.marker, 'preserve-me');
      assert.ok(Object.hasOwn(out.passthrough, 'embedding_attempted'));
      assert.ok(Object.hasOwn(out.passthrough, 'embedding_error'));
    },
  },
];

let passed = 0;
for (const test of cases) {
  const originalPrep = structuredClone(test.prep);
  const out = normalize(await merge(test.prep, test.http));
  try {
    test.check(out, originalPrep);
    console.log(`PASS ${test.id}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${test.id}`);
    console.error(err);
    process.exitCode = 1;
    break;
  }
}

if (passed === cases.length) {
  console.log(`ALL PASS ${passed}/${cases.length}`);
}
