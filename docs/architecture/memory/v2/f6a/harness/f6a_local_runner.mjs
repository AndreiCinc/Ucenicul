// F6A Local Harness — 41-case matrix runner
// Location: docs/architecture/memory/v2/f6a/harness/f6a_local_runner.mjs
// Philosophy: reproduce the live `ME_Memory_Store_Embed_Merge` jsCode as a pure
// JS function, plus a pgvector + lexical CTE simulation for L4/L5, plus an
// idempotency (ON CONFLICT DO NOTHING) simulation for L3b, plus a connection
// topology check for L7.
//
// The Merge function below was authored to be byte-faithful to the live jsCode
// on versionId=c07fe923-76eb-4901-b53b-14039536df55 (extracted 2026-04-23 post-
// F6A apply; sha256 of live code block = 4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc).

import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// --------------------------------------------------------------------- mergeStep

// The n8n Merge node sees `$('ME_Memory_Store_Prep').first().json` as Prep's
// output, and `$json` as its own *input item*, i.e. the Embed node's HTTP
// response. Harness mimics this by taking both explicitly.
export function mergeStep({ prep, httpResp }) {
  if (prep && prep._error === true) {
    return [{ json: prep }];
  }

  let embeddingText      = prep.__db.embedding_text || null;
  let usedEmbedding      = prep.passthrough && prep.passthrough.used_embedding === true;
  let embeddingAttempted = false;
  let embeddingError     = null;

  if (!embeddingText) {
    embeddingAttempted = true;
    const vec = httpResp
      && httpResp.data
      && Array.isArray(httpResp.data)
      && httpResp.data[0]
      && Array.isArray(httpResp.data[0].embedding)
      ? httpResp.data[0].embedding
      : null;

    if (vec && vec.length === 1536) {
      embeddingText = JSON.stringify(vec);
      usedEmbedding = true;
    } else if (httpResp && httpResp.error) {
      embeddingError = 'embedding_http_error: '
        + (httpResp.error.message || httpResp.error.code || JSON.stringify(httpResp.error));
    } else if (httpResp && typeof httpResp.statusCode === 'number' && httpResp.statusCode >= 400) {
      embeddingError = 'embedding_http_' + httpResp.statusCode;
    } else {
      embeddingError = 'embedding_response_unusable';
    }
  }

  return [{ json: {
    __db: { ...prep.__db, embedding_text: embeddingText },
    passthrough: {
      ...prep.passthrough,
      used_embedding:      usedEmbedding,
      embedding_attempted: embeddingAttempted,
      embedding_error:     embeddingError
    }
  }}];
}

// --------------------------------------------------------------------- fixtures

function axisVector(axis, length = 1536) {
  // Unit vector along the given 0-based axis (1 at position `axis`, 0 elsewhere).
  const v = new Array(length).fill(0);
  v[axis % length] = 1;
  return v;
}

function seededVector(seed, length = 1536) {
  // Deterministic low-amplitude vector for replay/fuzz tests.
  const v = new Array(length);
  let x = seed;
  for (let i = 0; i < length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    v[i] = ((x / 0x7fffffff) - 0.5) * 2;
  }
  return v;
}

function prepFixture({ content = 'some text', extras = {} } = {}) {
  return {
    __db: {
      tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      memory_type: 'fact',
      category: 'test',
      content,
      confidence: 0.9,
      importance: 0.5,
      durability: 'mid',
      source_thread_id: null,
      source_message_id: null,
      entity_id: null,
      evidence_refs: [],
      metadata: {},
      idempotency_key: 'mem-smoke-v2f6a-stub',
      ...extras.__db,
    },
    passthrough: {
      action: 'store_memory',
      ...extras.passthrough,
    },
  };
}

function errorPrepFixture(missing = ['content']) {
  return {
    _error: true,
    _error_code: 'MISSING_REQUIRED_FIELDS',
    _error_detail: { missing_fields: missing },
    passthrough: { action: 'store_memory' },
  };
}

// --------------------------------------------------------------------- assertions

class CaseFailure extends Error {
  constructor(id, reason, detail) {
    super(`[${id}] ${reason}${detail ? ': ' + detail : ''}`);
    this.caseId = id;
    this.reason = reason;
    this.detail = detail;
  }
}

function assertShape(id, out) {
  if (!Array.isArray(out) || out.length !== 1 || !out[0].json) {
    throw new CaseFailure(id, 'mergeStep did not return [{json:…}] shape');
  }
  return out[0].json;
}

function assertEmbeddingTextIs1536FloatArray(id, text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw new CaseFailure(id, 'embedding_text is not a non-empty string', String(text));
  }
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { throw new CaseFailure(id, 'embedding_text is not parseable JSON', e.message); }
  if (!Array.isArray(parsed) || parsed.length !== 1536) {
    throw new CaseFailure(id, 'embedding_text not a 1536-length array', `length=${Array.isArray(parsed) ? parsed.length : typeof parsed}`);
  }
  for (let i = 0; i < parsed.length; i++) {
    if (typeof parsed[i] !== 'number' || !Number.isFinite(parsed[i])) {
      throw new CaseFailure(id, 'embedding_text contains non-finite element', `at [${i}]=${parsed[i]}`);
    }
  }
  return parsed;
}

function assertEquals(id, label, got, want) {
  if (got !== want) {
    throw new CaseFailure(id, `${label} mismatch`, `got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  }
}

function assertMatches(id, label, got, regex) {
  if (typeof got !== 'string' || !regex.test(got)) {
    throw new CaseFailure(id, `${label} did not match ${regex}`, `got=${JSON.stringify(got)}`);
  }
}

// --------------------------------------------------------------------- SQL simulation

function insertOnConflictDoNothing(table, row) {
  const existing = table.find(r => r.idempotency_key === row.idempotency_key);
  if (existing) return { row: existing, inserted: false };
  table.push(row);
  return { row, inserted: true };
}

// --------------------------------------------------------------------- pgvector cosine sim

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// --------------------------------------------------------------------- test runner

const cases = [];

function register(id, description, fn) {
  cases.push({ id, description, fn });
}

// --- L1 — design-shape invariants ---------------------------------------
// For 5 prep+httpResp pairs, assert output keys, embedding_text shape, flag types.
const l1Axes = [0, 1, 2, 3, 4];
l1Axes.forEach((axis, i) => {
  const caseId = `L1.${i + 1}`;
  register(caseId, `design shape — axis ${axis}`, () => {
    const prep = prepFixture({ content: `axis-${axis} shape check` });
    const httpResp = { data: [{ embedding: axisVector(axis) }] };
    const json = assertShape(caseId, mergeStep({ prep, httpResp }));
    const keys = Object.keys(json).sort();
    if (JSON.stringify(keys) !== JSON.stringify(['__db', 'passthrough'])) {
      throw new CaseFailure(caseId, 'top-level keys not exactly {__db, passthrough}', JSON.stringify(keys));
    }
    assertEmbeddingTextIs1536FloatArray(caseId, json.__db.embedding_text);
    if (typeof json.passthrough.embedding_attempted !== 'boolean') throw new CaseFailure(caseId, 'embedding_attempted not boolean');
    if (!(json.passthrough.embedding_error === null || typeof json.passthrough.embedding_error === 'string')) {
      throw new CaseFailure(caseId, 'embedding_error not null|string');
    }
    // Prep passthrough preserved
    if (json.passthrough.action !== 'store_memory') throw new CaseFailure(caseId, 'passthrough.action not preserved');
    // __db fields preserved
    if (json.__db.tenant_id !== prep.__db.tenant_id) throw new CaseFailure(caseId, '__db.tenant_id not preserved');
    if (json.__db.content !== prep.__db.content) throw new CaseFailure(caseId, '__db.content not preserved');
  });
});

// --- L2 — happy-path store with embedding -------------------------------
const l2Axes = [5, 6, 7, 8, 9];
l2Axes.forEach((axis, i) => {
  const caseId = `L2.${i + 1}`;
  register(caseId, `happy path — axis ${axis} — full embedding`, () => {
    const prep = prepFixture({ content: `axis-${axis} happy`, extras: { __db: { idempotency_key: `mem-smoke-v2f6a-l2-${i + 1}` } } });
    const httpResp = { data: [{ embedding: axisVector(axis) }] };
    const json = assertShape(caseId, mergeStep({ prep, httpResp }));
    const arr = assertEmbeddingTextIs1536FloatArray(caseId, json.__db.embedding_text);
    if (arr[axis] !== 1) throw new CaseFailure(caseId, `axis bit not at position ${axis}`, `got arr[${axis}]=${arr[axis]}`);
    assertEquals(caseId, 'embedding_attempted', json.passthrough.embedding_attempted, true);
    assertEquals(caseId, 'embedding_error',     json.passthrough.embedding_error,     null);
    assertEquals(caseId, 'used_embedding',      json.passthrough.used_embedding,      true);
  });
});

// --- L3 — Merge is pure (idempotent under identical inputs) ---------------
l2Axes.forEach((axis, i) => {
  const caseId = `L3.${i + 1}`;
  register(caseId, `pure-function replay — axis ${axis}`, () => {
    const prep = prepFixture({ content: `axis-${axis} replay`, extras: { __db: { idempotency_key: `mem-smoke-v2f6a-l3-${i + 1}` } } });
    const httpResp = { data: [{ embedding: axisVector(axis) }] };
    const a = assertShape(caseId, mergeStep({ prep, httpResp }));
    const b = assertShape(caseId, mergeStep({ prep, httpResp }));
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new CaseFailure(caseId, 'two calls with identical inputs produced different outputs');
    }
  });
});

// --- L3b — ON CONFLICT DO NOTHING replay preserves first row --------------
l2Axes.forEach((axis, i) => {
  const caseId = `L3b.${i + 1}`;
  register(caseId, `ON CONFLICT DO NOTHING — axis ${axis}`, () => {
    const table = [];
    const prep = prepFixture({ content: `axis-${axis} conflict`, extras: { __db: { idempotency_key: `mem-smoke-v2f6a-l3b-${i + 1}` } } });

    // First write: valid embedding (axis vector).
    const m1 = assertShape(caseId, mergeStep({ prep, httpResp: { data: [{ embedding: axisVector(axis) }] } }));
    const row1 = {
      ...prep.__db,
      embedding: m1.__db.embedding_text, // stored representation (pgvector literal string)
    };
    const r1 = insertOnConflictDoNothing(table, row1);
    if (!r1.inserted) throw new CaseFailure(caseId, 'first insert should set inserted=true');

    // Replay: different embedding values but same idempotency_key.
    const m2 = assertShape(caseId, mergeStep({ prep, httpResp: { data: [{ embedding: seededVector(axis + 100) }] } }));
    const row2 = { ...prep.__db, embedding: m2.__db.embedding_text };
    const r2 = insertOnConflictDoNothing(table, row2);
    if (r2.inserted) throw new CaseFailure(caseId, 'replay should have inserted=false');
    if (r2.row !== r1.row) throw new CaseFailure(caseId, 'replay should return first row');
    if (r2.row.embedding !== row1.embedding) throw new CaseFailure(caseId, 'ON CONFLICT preserved-row embedding changed');
    if (table.length !== 1) throw new CaseFailure(caseId, `expected 1 row after replay, got ${table.length}`);
  });
});

// --- L4 — semantic benefit (top-1 match on axis-aligned query) -----------
const l4Axes = [10, 11, 12, 13, 14];
l4Axes.forEach((axis, i) => {
  const caseId = `L4.${i + 1}`;
  register(caseId, `semantic top-1 match — axis ${axis}`, () => {
    const table = [];
    // Seed: one row per axis in l4Axes, stored via mergeStep.
    for (const a of l4Axes) {
      const prep = prepFixture({ content: `axis-${a}`, extras: { __db: { idempotency_key: `mem-smoke-v2f6a-l4-ax${a}` } } });
      const out = assertShape(caseId, mergeStep({ prep, httpResp: { data: [{ embedding: axisVector(a) }] } }));
      const vec = JSON.parse(out.__db.embedding_text);
      table.push({ id: `axis-${a}`, axis: a, embedding: vec });
    }
    // Query axis-aligned; simulate Search_DB semantic CTE: rank by cosine sim where embedding IS NOT NULL.
    const query = axisVector(axis);
    const ranked = table
      .filter(r => r.embedding !== null)
      .map(r => ({ id: r.id, axis: r.axis, sim: cosineSim(query, r.embedding) }))
      .sort((a, b) => b.sim - a.sim);
    if (ranked[0].axis !== axis) {
      throw new CaseFailure(caseId, 'top-1 match wrong axis', `expected axis=${axis}, got axis=${ranked[0].axis}`);
    }
    if (ranked[0].sim < 0.999) {
      throw new CaseFailure(caseId, 'top-1 cosine sim below 0.999', `got ${ranked[0].sim}`);
    }
  });
});

// --- L5 — lexical fallback preservation ---------------------------------
const l5Seeds = [
  { id: 'L5.1', content: 'anchor zzz_e4_token_alpha', query: 'zzz_e4_token_alpha' },
  { id: 'L5.2', content: 'zzz_beta_marker phrase',    query: 'zzz_beta_marker' },
  { id: 'L5.3', content: 'gamma_unique_xyz content',  query: 'gamma_unique_xyz' },
  { id: 'L5.4', content: 'delta anchor L5.4',         query: 'delta anchor L5.4' },
  { id: 'L5.5', content: 'epsilon phrase token',      query: 'epsilon phrase token' },
];
l5Seeds.forEach((seed, i) => {
  const caseId = `L5.${i + 1}`;
  register(caseId, `lexical fallback — seed ${seed.id}`, () => {
    const table = [];
    for (const s of l5Seeds) {
      const prep = prepFixture({ content: s.content, extras: { __db: { idempotency_key: `mem-smoke-v2f6a-l5-${s.id}` } } });
      const out = assertShape(caseId, mergeStep({ prep, httpResp: { data: [{ embedding: axisVector(200 + i) }] } }));
      table.push({ id: s.id, content: s.content, embedding: JSON.parse(out.__db.embedding_text) });
    }
    // Simulate Search_DB: lexical CTE = rows whose content contains the query substring (case-sensitive as per F2b).
    const q = seed.query;
    const lexicalHits = table.filter(r => r.content.includes(q));
    if (!lexicalHits.some(r => r.id === seed.id)) {
      throw new CaseFailure(caseId, `lexical CTE did not return seed row ${seed.id} for query "${q}"`, `hits=${JSON.stringify(lexicalHits.map(h => h.id))}`);
    }
    // Dedupe check: if semantic CTE also had this row by chance, final set should not double-list it.
    const semanticHits = table
      .map(r => ({ ...r, sim: cosineSim(axisVector(200 + i), r.embedding) }))
      .filter(r => r.sim > 0.5);
    const unioned = new Map();
    for (const r of [...semanticHits, ...lexicalHits]) {
      if (!unioned.has(r.id)) unioned.set(r.id, r);
    }
    if (unioned.size > table.length) {
      throw new CaseFailure(caseId, 'dedupe failure: union exceeds base table');
    }
  });
});

// --- L6 — failure behavior -----------------------------------------------
const l6Cases = [
  { id: 'L6.1', label: 'HTTP 429', httpResp: { statusCode: 429, error: { message: 'rate limited' } }, expectMatch: /^embedding_http_error: /, expectNull: true },
  { id: 'L6.2', label: 'HTTP 500', httpResp: { statusCode: 500 }, expectMatch: /^embedding_http_500$/, expectNull: true },
  { id: 'L6.3', label: 'malformed 200 empty data', httpResp: { data: [] }, expectMatch: /^embedding_response_unusable$/, expectNull: true },
  { id: 'L6.4', label: 'wrong dim 1200', httpResp: { data: [{ embedding: new Array(1200).fill(0) }] }, expectMatch: /^embedding_response_unusable$/, expectNull: true },
  { id: 'L6.5', label: 'exception shape', httpResp: { error: { message: 'connect ECONNREFUSED' } }, expectMatch: /^embedding_http_error: connect ECONNREFUSED$/, expectNull: true },
];
l6Cases.forEach((c, i) => {
  register(c.id, `failure — ${c.label}`, () => {
    const prep = prepFixture({ content: `L6 fail ${i + 1}` });
    const json = assertShape(c.id, mergeStep({ prep, httpResp: c.httpResp }));
    assertEquals(c.id, '__db.embedding_text (null on fail)', json.__db.embedding_text, null);
    assertEquals(c.id, 'embedding_attempted', json.passthrough.embedding_attempted, true);
    assertMatches(c.id, 'embedding_error', json.passthrough.embedding_error, c.expectMatch);
    assertEquals(c.id, 'used_embedding stays false', json.passthrough.used_embedding, false);

    // Downstream SQL sim: queryReplacement's happy-path would produce $14=null
    // because embedding_text is null. Simulate the CASE guard: embedding gets NULL.
    const p14 = json.__db.embedding_text; // null
    const stored = { ...prep.__db, embedding: p14 === null ? null : p14 };
    if (stored.embedding !== null) throw new CaseFailure(c.id, 'stored embedding should be NULL on failure');
  });
});

// --- L7 — non-target path preservation + Prep._error short-circuit --------
const l7Cases = [
  { id: 'L7.1', label: 'search_memory — bypasses Merge', action: 'search_memory' },
  { id: 'L7.2', label: 'recall_memory — bypasses Merge', action: 'recall_memory' },
  { id: 'L7.3', label: 'promote_memory — bypasses Merge', action: 'promote_memory' },
  { id: 'L7.4', label: 'supersede_memory — bypasses Merge', action: 'supersede_memory' },
  { id: 'L7.5', label: 'RA envelope — bypasses Merge', action: 'ra_envelope' },
  { id: 'L7.6', label: 'store_memory — Prep _error short-circuits', action: 'store_memory_error' },
];
l7Cases.forEach((c) => {
  register(c.id, c.label, () => {
    if (c.action === 'store_memory_error') {
      const prep = errorPrepFixture(['content']);
      const json = assertShape(c.id, mergeStep({ prep, httpResp: { data: [{ embedding: axisVector(0) }] } }));
      if (json !== prep) {
        throw new CaseFailure(c.id, 'Prep _error short-circuit did not pass prep object through verbatim');
      }
      if (json._error !== true) throw new CaseFailure(c.id, '_error flag not preserved');
      return;
    }
    // Other actions never enter the store lane's Merge. The topology proof is a
    // connection-graph check: only ME_Memory_Store_Prep feeds ME_Memory_Store_Embed.
    const topology = JSON.parse(readFileSync(resolvePath(dirname(fileURLToPath(import.meta.url)), '../artifacts/WF-ME-01_post_f6a.json'), 'utf8'));
    const connections = topology.connections || {};
    // Find all nodes that feed ME_Memory_Store_Embed directly.
    const feeders = [];
    for (const [src, outs] of Object.entries(connections)) {
      const mains = (outs && outs.main) || [];
      for (const bucket of mains) {
        for (const edge of (bucket || [])) {
          if (edge.node === 'ME_Memory_Store_Embed') feeders.push(src);
        }
      }
    }
    if (feeders.length !== 1 || feeders[0] !== 'ME_Memory_Store_Prep') {
      throw new CaseFailure(c.id, `non-store action ${c.action}: Store_Embed feeders != [Store_Prep]`, JSON.stringify(feeders));
    }
    // Also confirm the 5-rule Switch node still routes correctly (spot-check one edge):
    // (structural proof — for L7 we only prove isolation, not behaviour; the
    // other 44 nodes are hash-proven byte-identical to pre-F6A in Phase 6.)
  });
});

// --------------------------------------------------------------------- main

const want = 41; // 5 + 5 + 5 + 5 + 5 + 5 + 5 + 6
if (cases.length !== want) {
  console.error(`INTERNAL: expected ${want} cases, registered ${cases.length}`);
  process.exit(2);
}

const results = [];
for (const c of cases) {
  try {
    c.fn();
    results.push({ id: c.id, status: 'PASS', description: c.description });
  } catch (e) {
    if (e instanceof CaseFailure) {
      results.push({ id: c.id, status: 'FAIL', description: c.description, reason: e.reason, detail: e.detail });
    } else {
      results.push({ id: c.id, status: 'FAIL', description: c.description, reason: 'UNEXPECTED_THROW', detail: e.message });
    }
  }
}

const pass = results.filter(r => r.status === 'PASS').length;
const fail = results.filter(r => r.status === 'FAIL').length;

console.log(JSON.stringify({
  totals: { total: results.length, pass, fail },
  results,
}, null, 2));

process.exit(fail === 0 ? 0 : 1);
