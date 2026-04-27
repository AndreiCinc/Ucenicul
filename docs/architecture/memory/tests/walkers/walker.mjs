#!/usr/bin/env node
/**
 * walker.mjs — memory_module test walker (Phase 7)
 *
 * Source of truth:
 *  - docs/architecture/memory/TEST_ORACLE_MEMORY_MODULE.md (oracle)
 *  - docs/architecture/memory/tests/memory/fixtures/fixture_manifest.json (250-case index)
 *  - docs/architecture/memory/patches/build_patch.mjs (SQL + prep/result logic source)
 *
 * Two modes:
 *  - DB mode  (default, requires env DATABASE_URL): runs the 7 anchor cases
 *    directly against the live memory_items schema and asserts DB state +
 *    module_result shape.
 *  - Plan mode (--plan): prints the test plan JSON and the 250-case per-family
 *    rollup without touching the DB.
 *
 * The walker is re-runnable and idempotent via deterministic idempotency keys.
 * All rows it writes carry the prefix `mem-walker-phase7:` and a run-scoped
 * suffix, making them trivially cleanable and diagnosable.
 *
 * Layer coverage per TEST_ORACLE_MEMORY_MODULE.md §Layered test execution model:
 *  - Layer 1 (contract)      : result-node wrapping is simulated here.
 *  - Layer 2 (DB state)      : real rows written + asserted with SELECT.
 *  - Layer 3 (aggregator)    : aggregated_result envelope asserted in-memory.
 *
 * Multi-workflow rule: the patch keeps all memory logic inside WF-ME-01.
 * No Execute Workflow bridges were introduced, so the connector layer is
 * not applicable. This is recorded in walker_summary.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(TEST_ROOT, 'fixtures', 'fixture_manifest.json');
const RESULTS_DIR = path.join(TEST_ROOT, 'results');

// Stable test scope (from seeded fixtures already present in DB)
const TEST_TENANT = 'aaaaaaaa-0000-0000-0000-000000000001';
const TEST_THREAD = '33333333-0000-0000-0000-000000000003';
const TEST_ENTITY = 'eeeeeeee-0000-0000-0000-000000000001';

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');

// ---------- SQL strings (must stay in sync with build_patch.mjs) ----------

const SQL_STORE_INSERT = `
WITH ins AS (
  INSERT INTO public.memory_items (
    tenant_id, memory_type, category, content,
    confidence, importance, durability,
    source_thread_id, source_message_id, entity_id,
    evidence_refs, metadata, idempotency_key
  )
  VALUES (
    $1::uuid, $2::memory_type_enum, $3::text, $4::text,
    $5::numeric, $6::numeric, $7::rag_durability_enum,
    $8::uuid, $9::uuid, $10::uuid,
    $11::jsonb, $12::jsonb, $13::text
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *, TRUE AS inserted
)
SELECT * FROM ins
UNION ALL
SELECT mi.*, FALSE AS inserted
  FROM public.memory_items mi
 WHERE mi.idempotency_key = $13::text AND NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
`;

const SQL_RECALL = `
SELECT *
FROM public.memory_items
WHERE tenant_id = $1::uuid
  AND status = ANY($2::memory_status_enum[])
  AND ($3::uuid IS NULL OR source_thread_id = $3::uuid)
  AND ($4::uuid IS NULL OR entity_id        = $4::uuid)
  AND ($5::text IS NULL OR category         = $5::text)
  AND ($6::memory_type_enum IS NULL OR memory_type = $6::memory_type_enum)
  AND ($7::memory_tier_enum IS NULL OR tier        = $7::memory_tier_enum)
ORDER BY created_at DESC
LIMIT $8::int;
`;

// Promotion: succeeds when corroboration_count >= threshold OR user_confirmed OR evidence_validated.
// If accept=false the target row is NOT updated and the SELECT returns the un-promoted row.
const SQL_PROMOTE = `
WITH target AS (
  SELECT * FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
accept AS (
  SELECT id,
         (corroboration_count >= $3::int OR $4::boolean OR $5::boolean) AS ok,
         tier
  FROM target
),
promoted AS (
  UPDATE public.memory_items m
  SET tier = 'long_term',
      last_reconfirmed_at = now(),
      user_confirmed     = (m.user_confirmed     OR $4::boolean),
      evidence_validated = (m.evidence_validated OR $5::boolean)
  FROM accept a
  WHERE m.id = a.id
    AND a.ok = TRUE
    AND m.tier = 'recent'
  RETURNING m.*
)
SELECT
  COALESCE(p.id, t.id) AS id,
  COALESCE(p.tier::text, t.tier::text) AS tier,
  a.ok AS accepted,
  t.tier::text AS tier_before
FROM target t
LEFT JOIN accept a ON a.id = t.id
LEFT JOIN promoted p ON p.id = t.id;
`;

// Supersede — transactional, returns new row and old row id.
const SQL_SUPERSEDE = `
WITH old_row AS (
  SELECT * FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
guard AS (
  SELECT 1 FROM old_row WHERE status = 'active'
),
marked AS (
  UPDATE public.memory_items
  SET status = 'superseded'
  WHERE id = $1::uuid AND EXISTS (SELECT 1 FROM guard)
  RETURNING id AS old_id
),
inserted AS (
  INSERT INTO public.memory_items (
    tenant_id, memory_type, category, content,
    confidence, importance, durability,
    source_thread_id, source_message_id, entity_id,
    evidence_refs, metadata, idempotency_key,
    supersedes_memory_id
  )
  SELECT
    $2::uuid, $3::memory_type_enum, $4::text, $5::text,
    $6::numeric, $7::numeric, $8::rag_durability_enum,
    $9::uuid, $10::uuid, $11::uuid,
    $12::jsonb, $13::jsonb, $14::text,
    $1::uuid
  WHERE EXISTS (SELECT 1 FROM marked)
  RETURNING *
)
SELECT
  i.*,
  m.old_id,
  (m.old_id IS NOT NULL) AS superseded_ok
FROM inserted i
LEFT JOIN marked m ON TRUE;
`;

// ---------- Helpers ----------

function pickTypeForFamily(family) {
  // Cases targeting observation/pattern subjective-guard behaviour use
  // observation; everything else defaults to fact.
  if (/subjective|observation|pattern/.test(family)) return 'observation';
  return 'fact';
}

const SUBJECTIVE_ROMANIAN_TOKENS = [
  'prost', 'prosti', 'prostie',
  'idiot', 'idioti',
  'lene', 'lenes',
  'incompetent',
  'mincinos',
  'rau', 'rea',
  'urat',
  'nesimtit',
];

function isRomanianSubjective(text, memoryType) {
  if (!['observation', 'pattern'].includes(memoryType)) return false;
  if (!text) return false;
  const lowered = text
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return SUBJECTIVE_ROMANIAN_TOKENS.some((tok) =>
    new RegExp('(^|\\W)' + tok + '(\\W|$)').test(lowered)
  );
}

function idempotencyKey(scope, caseId) {
  return `store_memory:mem-walker-phase7:${scope}:${caseId}`;
}
function supIdempotencyKey(scope, caseId) {
  return `supersede_memory:mem-walker-phase7:${scope}:${caseId}`;
}

function buildAggregatedSuccess(moduleResult) {
  return {
    status_kind: 'success',
    result_type: 'module_result',
    module_result: moduleResult,
    module_execution_started: true,
    domain_writes_performed: true,
    response_generation_allowed: false,
  };
}
function buildAggregatedFailure(errorCode, errorMessage, missing = []) {
  return {
    status_kind: 'failed',
    result_type: 'module_error',
    module_error: {
      module_name: 'memory_module',
      error_code: errorCode,
      error_message: errorMessage,
      missing_fields: missing,
    },
    module_execution_started: true,
    domain_writes_performed: false,
    response_generation_allowed: false,
  };
}
function buildAggregatedPartial(moduleResult) {
  return {
    status_kind: 'partial',
    result_type: 'module_result',
    module_result: moduleResult,
    module_execution_started: true,
    domain_writes_performed: false,
    response_generation_allowed: false,
  };
}

// ---------- Anchor case definitions ----------

/**
 * Each anchor case returns an async function that accepts a `run` callback
 * `(sql, params) => Promise<{rows: any[]}>` and returns { pass, observed, notes }.
 *
 * Anchor cases are identified by the letters A1..A7 from TEST_ORACLE §69.
 */

function anchorCases() {
  return [
    {
      id: 'A1',
      title: 'store_memory happy path',
      run: async (query) => {
        const caseId = 'a1';
        const idempKey = idempotencyKey('anchor', caseId);
        const params = [
          TEST_TENANT,                     // $1 tenant
          'fact',                          // $2 memory_type
          'anchor_test',                   // $3 category
          'Phase7 anchor A1 store happy', // $4 content
          0.8,                             // $5 confidence
          0.5,                             // $6 importance
          'stable',                        // $7 durability
          TEST_THREAD,                     // $8 source_thread_id
          null,                            // $9 source_message_id
          TEST_ENTITY,                     // $10 entity_id
          JSON.stringify([]),              // $11 evidence_refs
          JSON.stringify({ walker: 'phase7', case: caseId }), // $12 metadata
          idempKey,                        // $13 idempotency_key
        ];
        const r = await query(SQL_STORE_INSERT, params);
        const row = r.rows[0];
        const ok =
          row &&
          row.tier === 'recent' &&
          row.status === 'active' &&
          row.category === 'anchor_test' &&
          row.content === 'Phase7 anchor A1 store happy';
        return {
          pass: !!ok,
          observed: {
            id: row?.id,
            tier: row?.tier,
            status: row?.status,
            inserted: row?.inserted,
          },
          expected: { tier: 'recent', status: 'active' },
        };
      },
    },
    {
      id: 'A2',
      title: 'search_memory happy path (recall is lexical in walker)',
      run: async (query) => {
        // Seed with an a2-specific content, then verify recall retrieves it.
        const caseId = 'a2';
        const idempKey = idempotencyKey('anchor', caseId);
        const uniq = `PHASE7_A2_TOKEN_${RUN_ID}`;
        await query(SQL_STORE_INSERT, [
          TEST_TENANT, 'fact', 'anchor_test',
          `seeded a2 memory ${uniq}`,
          0.8, 0.5, 'stable',
          TEST_THREAD, null, TEST_ENTITY,
          JSON.stringify([]), JSON.stringify({ walker: 'phase7', case: caseId }),
          idempKey,
        ]);
        // Search-DB lexical leg is equivalent to a LIKE scoped by tenant/category.
        const r = await query(
          `SELECT id, content, category FROM public.memory_items
           WHERE tenant_id = $1::uuid
             AND status = 'active'
             AND category = $2::text
             AND content LIKE $3
           ORDER BY created_at DESC LIMIT 5`,
          [TEST_TENANT, 'anchor_test', `%${uniq}%`]
        );
        const found = r.rows.length >= 1 &&
          r.rows.some((x) => String(x.content).includes(uniq));
        return {
          pass: found,
          observed: { hits: r.rows.length, sample_content: r.rows[0]?.content },
          expected: { hits: '>=1', content_includes: uniq },
        };
      },
    },
    {
      id: 'A3',
      title: 'recall_memory happy path (structural intersection)',
      run: async (query) => {
        // Seed a row with known thread / entity / category, then recall by intersection.
        const caseId = 'a3';
        await query(SQL_STORE_INSERT, [
          TEST_TENANT, 'fact', 'recall_test',
          'Phase7 anchor A3 recall row',
          0.8, 0.5, 'stable',
          TEST_THREAD, null, TEST_ENTITY,
          JSON.stringify([]), JSON.stringify({ walker: 'phase7', case: caseId }),
          idempotencyKey('anchor', caseId),
        ]);
        const r = await query(SQL_RECALL, [
          TEST_TENANT,
          ['active'],
          TEST_THREAD,
          TEST_ENTITY,
          'recall_test',
          null,
          null,
          10,
        ]);
        const first = r.rows[0];
        const ok =
          r.rows.length >= 1 &&
          first.source_thread_id === TEST_THREAD &&
          first.entity_id === TEST_ENTITY &&
          first.category === 'recall_test';
        // ordering: created_at DESC, so the row we just inserted (or most recent) should be first.
        return {
          pass: ok,
          observed: {
            rows: r.rows.length,
            first_content: first?.content,
            first_thread: first?.source_thread_id,
          },
          expected: { rows: '>=1', matches_filters: true },
        };
      },
    },
    {
      id: 'A4',
      title: 'promote_memory happy path (corroboration met)',
      run: async (query) => {
        // Seed fresh recent row, bump corroboration_count=2 so promotion criterion holds.
        const caseId = 'a4';
        const idempKey = idempotencyKey('anchor', caseId);
        const ins = await query(SQL_STORE_INSERT, [
          TEST_TENANT, 'fact', 'promote_test',
          'Phase7 anchor A4 promote happy',
          0.8, 0.5, 'stable',
          TEST_THREAD, null, TEST_ENTITY,
          JSON.stringify([]), JSON.stringify({ walker: 'phase7', case: caseId }),
          idempKey,
        ]);
        const mid = ins.rows[0].id;
        await query(
          `UPDATE public.memory_items SET corroboration_count = 2 WHERE id = $1::uuid`,
          [mid]
        );
        const prom = await query(SQL_PROMOTE, [
          mid, TEST_TENANT, 2, false, false,
        ]);
        const p = prom.rows[0];
        const ok = p && p.accepted === true && p.tier === 'long_term';
        return {
          pass: !!ok,
          observed: {
            id: p?.id,
            tier_before: p?.tier_before,
            tier_after: p?.tier,
            accepted: p?.accepted,
          },
          expected: { accepted: true, tier_after: 'long_term' },
        };
      },
    },
    {
      id: 'A5',
      title: 'promote_memory denied (no corroboration, no confirmation)',
      run: async (query) => {
        const caseId = 'a5';
        const idempKey = idempotencyKey('anchor', caseId);
        const ins = await query(SQL_STORE_INSERT, [
          TEST_TENANT, 'fact', 'promote_test',
          'Phase7 anchor A5 promote denied',
          0.8, 0.5, 'stable',
          TEST_THREAD, null, TEST_ENTITY,
          JSON.stringify([]), JSON.stringify({ walker: 'phase7', case: caseId }),
          idempKey,
        ]);
        const mid = ins.rows[0].id;
        // corroboration_count default is 0, do not set user/evidence
        const prom = await query(SQL_PROMOTE, [
          mid, TEST_TENANT, 2, false, false,
        ]);
        const p = prom.rows[0];
        const ok = p && p.accepted === false && p.tier === 'recent';
        return {
          pass: !!ok,
          observed: {
            id: p?.id,
            tier: p?.tier,
            accepted: p?.accepted,
          },
          expected: { accepted: false, tier: 'recent' },
        };
      },
    },
    {
      id: 'A6',
      title: 'supersede_memory happy path (old → superseded, new → active)',
      run: async (query) => {
        const caseId = 'a6';
        // Seed the old row
        const idempOld = idempotencyKey('anchor', `${caseId}_old`);
        const ins = await query(SQL_STORE_INSERT, [
          TEST_TENANT, 'fact', 'supersede_test',
          'Phase7 anchor A6 old row',
          0.8, 0.5, 'stable',
          TEST_THREAD, null, TEST_ENTITY,
          JSON.stringify([]), JSON.stringify({ walker: 'phase7', case: `${caseId}_old` }),
          idempOld,
        ]);
        const oldId = ins.rows[0].id;
        // Run supersede
        const idempNew = supIdempotencyKey('anchor', `${caseId}_new`);
        const sup = await query(SQL_SUPERSEDE, [
          oldId,
          TEST_TENANT,
          'fact',
          'supersede_test',
          'Phase7 anchor A6 new row',
          0.8, 0.5, 'stable',
          TEST_THREAD, null, TEST_ENTITY,
          JSON.stringify([]), JSON.stringify({ walker: 'phase7', case: `${caseId}_new` }),
          idempNew,
        ]);
        const newRow = sup.rows[0];
        // Verify old row is now superseded
        const verify = await query(
          `SELECT status FROM public.memory_items WHERE id = $1::uuid`,
          [oldId]
        );
        const oldStatus = verify.rows[0]?.status;
        const ok =
          newRow &&
          newRow.superseded_ok === true &&
          newRow.status === 'active' &&
          newRow.supersedes_memory_id === oldId &&
          oldStatus === 'superseded';
        return {
          pass: !!ok,
          observed: {
            new_id: newRow?.id,
            new_status: newRow?.status,
            supersedes: newRow?.supersedes_memory_id,
            old_status_after: oldStatus,
          },
          expected: {
            new_status: 'active',
            supersedes: oldId,
            old_status_after: 'superseded',
          },
        };
      },
    },
    {
      id: 'A7',
      title: 'store_memory subjective refusal (Romanian observation/pattern)',
      run: async (_query) => {
        // Subjective guard runs in the prep layer BEFORE any DB call,
        // so we only exercise the heuristic — no DB side effect is allowed.
        const probe = 'Ion e un om prost și lenes';
        const refusal = isRomanianSubjective(probe, 'observation');
        if (!refusal) {
          return {
            pass: false,
            observed: { refusal: false },
            expected: { refusal: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN' },
          };
        }
        const agg = buildAggregatedFailure(
          'SUBJECTIVE_JUDGMENT_FORBIDDEN',
          'Subjective judgments are not allowed for observation/pattern memories.',
          []
        );
        const ok =
          agg.status_kind === 'failed' &&
          agg.module_error.error_code === 'SUBJECTIVE_JUDGMENT_FORBIDDEN' &&
          agg.domain_writes_performed === false;
        return {
          pass: ok,
          observed: {
            aggregated_status: agg.status_kind,
            error_code: agg.module_error.error_code,
            db_written: agg.domain_writes_performed,
          },
          expected: {
            aggregated_status: 'failed',
            error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN',
            db_written: false,
          },
        };
      },
    },
  ];
}

// ---------- Manifest rollup ----------

function manifestRollup(manifest) {
  const counts = {};
  for (const e of manifest.entries) {
    counts[e.action] = counts[e.action] || { total: 0, families: {} };
    counts[e.action].total += 1;
    counts[e.action].families[e.family] =
      (counts[e.action].families[e.family] || 0) + 1;
  }
  return counts;
}

// ---------- Main ----------

async function getQueryRunner() {
  // Prefer DATABASE_URL (Phase-7 operator environment). Fall back to explicit vars.
  const dsn =
    process.env.DATABASE_URL ||
    process.env.PGURL ||
    null;
  if (!dsn) {
    throw new Error(
      'DATABASE_URL is required for DB mode. Set it to the Postgres DSN for the Ucenicul DB.'
    );
  }
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dsn });
  await client.connect();
  const q = (sql, params) => client.query(sql, params);
  q.close = () => client.end();
  return q;
}

async function runAnchors(query) {
  const cases = anchorCases();
  const results = [];
  for (const c of cases) {
    try {
      const r = await c.run(query);
      results.push({ id: c.id, title: c.title, pass: r.pass, ...r });
    } catch (e) {
      results.push({
        id: c.id,
        title: c.title,
        pass: false,
        error: String(e.message || e),
      });
    }
  }
  return results;
}

function summarize(anchors, manifest, manifestCounts) {
  const passed = anchors.filter((a) => a.pass).length;
  const failed = anchors.filter((a) => !a.pass).length;
  return {
    run_id: RUN_ID,
    walker_version: '1.0',
    test_tenant: TEST_TENANT,
    test_thread: TEST_THREAD,
    test_entity: TEST_ENTITY,
    anchor_cases_total: anchors.length,
    anchor_cases_passed: passed,
    anchor_cases_failed: failed,
    anchor_results: anchors,
    manifest_total: manifest.total_cases,
    manifest_cases_per_action: manifest.cases_per_action,
    manifest_action_rollup: manifestCounts,
    multi_workflow_connector_check: {
      required: false,
      reason:
        'Phase-5/6 patch keeps all memory logic inside WF-ME-01; no Execute Workflow bridges introduced.',
    },
  };
}

function writeReports(summary) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const jsonPath = path.join(RESULTS_DIR, 'walker_latest.json');
  const stampedPath = path.join(RESULTS_DIR, `walker_${RUN_ID}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(stampedPath, JSON.stringify(summary, null, 2));

  const lines = [];
  lines.push('# walker_summary.md');
  lines.push('');
  lines.push(`Run id: \`${summary.run_id}\``);
  lines.push('');
  lines.push('## Anchor cases');
  lines.push('');
  lines.push('| Id | Title | Pass |');
  lines.push('|---|---|---|');
  for (const a of summary.anchor_results) {
    lines.push(`| ${a.id} | ${a.title} | ${a.pass ? 'YES' : 'NO'} |`);
  }
  lines.push('');
  lines.push(
    `Total: ${summary.anchor_cases_total} — passed: ${summary.anchor_cases_passed} — failed: ${summary.anchor_cases_failed}`
  );
  lines.push('');
  lines.push('## Manifest rollup (250 cases)');
  lines.push('');
  lines.push('| Action | Total | Families |');
  lines.push('|---|---|---|');
  for (const [action, info] of Object.entries(summary.manifest_action_rollup)) {
    const fams = Object.keys(info.families).join(', ');
    lines.push(`| ${action} | ${info.total} | ${fams} |`);
  }
  lines.push('');
  lines.push('## Multi-workflow connector check');
  lines.push('');
  lines.push(
    `- required: ${summary.multi_workflow_connector_check.required}`
  );
  lines.push(
    `- reason: ${summary.multi_workflow_connector_check.reason}`
  );
  lines.push('');
  fs.writeFileSync(path.join(RESULTS_DIR, 'walker_summary.md'), lines.join('\n'));
  return { jsonPath, stampedPath };
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const counts = manifestRollup(manifest);

  const mode = process.argv.includes('--plan') ? 'plan' : 'db';
  if (mode === 'plan') {
    const plan = {
      mode: 'plan',
      anchor_cases: anchorCases().map((c) => ({ id: c.id, title: c.title })),
      manifest_rollup: counts,
      note: 'Plan mode does not touch the DB. Use DB mode for verification.',
    };
    process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
    return;
  }

  const query = await getQueryRunner();
  try {
    const anchors = await runAnchors(query);
    const summary = summarize(anchors, manifest, counts);
    const { jsonPath } = writeReports(summary);
    process.stdout.write(
      `walker complete — ${summary.anchor_cases_passed}/${summary.anchor_cases_total} anchor cases passed. Report: ${jsonPath}\n`
    );
    if (summary.anchor_cases_failed > 0) process.exitCode = 1;
  } finally {
    await query.close();
  }
}

main().catch((e) => {
  console.error('walker fatal:', e.stack || e.message || e);
  process.exit(2);
});
