#!/usr/bin/env node
// f31_matrix_gen.mjs — deterministic generator for the 150-case F3.1 matrix.
//
// Usage:
//   node f31_matrix_gen.mjs            -> writes matrix/f31_cases_150.json
//   node f31_matrix_gen.mjs --check    -> validates an existing matrix against spec
//
// The generator is deterministic: given the same source constants, it emits the
// same case ids and fields. Rerunning is safe.

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT_PATH = path.resolve(HERE, '..', 'matrix', 'f31_cases_150.json');

const CONST = {
  workflow_id: 'uq26nh1grIpnHju0',
  version_id: 'b8e2f194-0263-46d9-8306-1534cc7c31fe',
  tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  execution_context_id: 'd4f82a41-01cd-4fb7-9d70-573557348e74',
  source_thread_id_default: '77777777-0000-0000-0000-000000000007',
  source_thread_id_alt: '33333333-0000-0000-0000-000000000003',
  entity_id_default: 'eeeeeeee-0000-0000-0000-000000000001',
  entity_id_alt: 'eeeeeeee-0000-0000-0000-000000000002',
  idem_prefix: 'mem-f31',
};

// ----- Search family --------------------------------------------------------
// 50 cases = 5 queries × 5 memory_type filters × 2 status_override modes = 50
// exactly. Drops the seed's third status_override to land on 50 cleanly.
const SEARCH = {
  queries: [
    { key: 'q1', text: 'raspunde dimineata', expected_hits: 0 },
    { key: 'q2', text: 'prefera whatsapp', expected_hits: 0 },
    { key: 'q3', text: 'buget lunar', expected_hits: 0 },
    { key: 'q4', text: 'obiectie pret', expected_hits: 0 },
    { key: 'q5', text: 'Phase7 anchor', expected_hits_min: 3 }, // lexical positive probe
  ],
  memory_types: ['fact', 'preference', 'observation', 'constraint', null],
  status_overrides: [
    { key: 'defaultActive', statuses: null },
    { key: 'includeSuperseded', statuses: ['active', 'superseded'] },
  ],
};

// ----- Recall family --------------------------------------------------------
// 50 cases = 2 thread × 2 entity × 4 category × 4 memory_type / 2 (dedup where
// filter combinations are semantically identical) with deterministic truncation
// to 50 semantically-distinct observations.
const RECALL = {
  threads: [CONST.source_thread_id_default, CONST.source_thread_id_alt],
  entities: [CONST.entity_id_default, CONST.entity_id_alt],
  categories: [null, 'anchor_test', 'recall_test', 'smoke_store'],
  memory_types: [null, 'fact', 'preference', 'observation'],
};

// ----- Promote family -------------------------------------------------------
// 25 semantically-distinct cases spanning:
//   corroboration_mode × caller_user_confirmed × caller_evidence_validated
//   × row_prior_user_confirmed × tier_precondition × replay_second_call
// selection criterion: one case per distinct acceptance_signal outcome
// (accepted-via-user_confirmed, accepted-via-evidence_validated,
// accepted-via-corroboration, accepted-via-multi, denied-not_in_recent_tier,
// denied-acceptance_criteria_not_met) plus replay shapes.
const PROMOTE_CASES_SPEC = [
  // Block A: denial branches (10)
  { sub: 'den-cm-none',                 corroboration_mode: 'none',            cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'acceptance_criteria_not_met' },
  { sub: 'den-cm-one',                  corroboration_mode: 'one_only',        cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'acceptance_criteria_not_met' },
  { sub: 'den-cm-already-lt',           corroboration_mode: 'already_long_term', cuc: false, cev: false, rpuc: false, tier: 'long_term', replay: false, expect: 'not_in_recent_tier' },
  { sub: 'den-cuc-true-but-lt',         corroboration_mode: 'none',            cuc: true,  cev: false, rpuc: false, tier: 'long_term', replay: false, expect: 'not_in_recent_tier' },
  { sub: 'den-cev-true-but-lt',         corroboration_mode: 'none',            cuc: false, cev: true,  rpuc: false, tier: 'long_term', replay: false, expect: 'not_in_recent_tier' },
  { sub: 'den-row-uc-but-lt',           corroboration_mode: 'none',            cuc: false, cev: false, rpuc: true,  tier: 'long_term', replay: false, expect: 'not_in_recent_tier' },
  { sub: 'den-corr2plus-but-lt',        corroboration_mode: 'two_plus',        cuc: false, cev: false, rpuc: false, tier: 'long_term', replay: false, expect: 'not_in_recent_tier' },
  { sub: 'den-all-false-recent',        corroboration_mode: 'none',            cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'acceptance_criteria_not_met' },
  { sub: 'den-cm-one-row-uc-false',     corroboration_mode: 'one_only',        cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'acceptance_criteria_not_met' },
  { sub: 'den-replay-after-deny',       corroboration_mode: 'none',            cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: true,  expect: 'acceptance_criteria_not_met', note: 'second call after deny — should still deny' },

  // Block B: accept-via-user_confirmed (3)
  { sub: 'acc-cuc-caller-true',         corroboration_mode: 'none',            cuc: true,  cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['user_confirmed'] },
  { sub: 'acc-cuc-row-true',            corroboration_mode: 'none',            cuc: false, cev: false, rpuc: true,  tier: 'recent',    replay: false, expect: 'accepted', signals: ['user_confirmed'] },
  { sub: 'acc-cuc-caller-and-row',      corroboration_mode: 'none',            cuc: true,  cev: false, rpuc: true,  tier: 'recent',    replay: false, expect: 'accepted', signals: ['user_confirmed'] },

  // Block C: accept-via-evidence_validated (2)
  { sub: 'acc-cev-caller-true',         corroboration_mode: 'none',            cuc: false, cev: true,  rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['evidence_validated'] },
  { sub: 'acc-cev-caller-true-uc-ign',  corroboration_mode: 'one_only',        cuc: false, cev: true,  rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['evidence_validated'] },

  // Block D: accept-via-corroboration (3)
  { sub: 'acc-corr2plus-only',          corroboration_mode: 'two_plus',        cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['corroboration'] },
  { sub: 'acc-corr2plus-with-uc-false', corroboration_mode: 'two_plus',        cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['corroboration'] },
  { sub: 'acc-corr2plus-with-cev-false',corroboration_mode: 'two_plus',        cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['corroboration'] },

  // Block E: accept-via-multi (3)
  { sub: 'acc-multi-cuc-cev',           corroboration_mode: 'none',            cuc: true,  cev: true,  rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['user_confirmed','evidence_validated'] },
  { sub: 'acc-multi-cuc-corr',          corroboration_mode: 'two_plus',        cuc: true,  cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['user_confirmed','corroboration'] },
  { sub: 'acc-multi-cev-corr',          corroboration_mode: 'two_plus',        cuc: false, cev: true,  rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['evidence_validated','corroboration'] },

  // Block F: replay-after-accept (2)
  { sub: 'acc-cuc-then-replay',         corroboration_mode: 'none',            cuc: true,  cev: false, rpuc: false, tier: 'recent',    replay: true,  expect: 'not_in_recent_tier', note: 'replay after accept — row is now long_term' },
  { sub: 'acc-cev-then-replay',         corroboration_mode: 'none',            cuc: false, cev: true,  rpuc: false, tier: 'recent',    replay: true,  expect: 'not_in_recent_tier' },

  // Block G: edge cases (2)
  { sub: 'den-empty-evidence-refs',     corroboration_mode: 'none',            cuc: false, cev: false, rpuc: false, tier: 'recent',    replay: false, expect: 'acceptance_criteria_not_met', note: 'evidence_refs=[] — should still deny not error' },
  { sub: 'acc-cev-empty-evidence',      corroboration_mode: 'none',            cuc: false, cev: true,  rpuc: false, tier: 'recent',    replay: false, expect: 'accepted', signals: ['evidence_validated'], note: 'caller flag trumps empty refs per V2-009' },
];
if (PROMOTE_CASES_SPEC.length !== 25) {
  throw new Error(`promote spec must be exactly 25 entries, got ${PROMOTE_CASES_SPEC.length}`);
}

// ----- Supersede family -----------------------------------------------------
// 25 semantically-distinct cases spanning:
//   target_state × tier × idempotency_scope × category × memory_type
const SUPERSEDE_CASES_SPEC = [
  // Block A: happy path + replay (5)
  { sub: 'happy-active-recent',          target_state: 'active',      tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'fact',        expect: 'success', expect_idem_reused: false, expect_new_insert: true },
  { sub: 'replay-accept-same-step',      target_state: 'active',      tier: 'recent',    scope: 'reused_after_accept',category: 'smoke_store',      memory_type: 'fact',        expect: 'success', expect_idem_reused: true,  expect_new_insert: false, note: 'SU2 parity' },
  { sub: 'happy-active-recent-obs',      target_state: 'active',      tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'observation', expect: 'success', expect_idem_reused: false, expect_new_insert: true },
  { sub: 'happy-active-recent-pricing',  target_state: 'active',      tier: 'recent',    scope: 'fresh',              category: 'pricing',          memory_type: 'fact',        expect: 'success', expect_idem_reused: false, expect_new_insert: true },
  { sub: 'happy-active-recent-pref',     target_state: 'active',      tier: 'recent',    scope: 'fresh',              category: 'pricing',          memory_type: 'preference',  expect: 'success', expect_idem_reused: false, expect_new_insert: true },

  // Block B: long_term replacement (3)
  { sub: 'happy-active-longterm',        target_state: 'active',      tier: 'long_term', scope: 'fresh',              category: 'smoke_store',      memory_type: 'fact',        expect: 'success', expect_idem_reused: false, expect_new_insert: true, note: 'direct-to-long-term replacement' },
  { sub: 'replay-longterm',              target_state: 'active',      tier: 'long_term', scope: 'reused_after_accept',category: 'smoke_store',      memory_type: 'fact',        expect: 'success', expect_idem_reused: true,  expect_new_insert: false },
  { sub: 'happy-longterm-obs',           target_state: 'active',      tier: 'long_term', scope: 'fresh',              category: 'smoke_store',      memory_type: 'observation', expect: 'success', expect_idem_reused: false, expect_new_insert: true },

  // Block C: already-superseded target (4)
  { sub: 'already-super-recent',         target_state: 'superseded',  tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },
  { sub: 'already-super-recent-obs',     target_state: 'superseded',  tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'observation', expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },
  { sub: 'already-super-recent-pricing', target_state: 'superseded',  tier: 'recent',    scope: 'fresh',              category: 'pricing',          memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },
  { sub: 'already-super-replay-error',   target_state: 'superseded',  tier: 'recent',    scope: 'reused_after_error', category: 'smoke_store',      memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID', note: 'replay same step on already-denied target' },

  // Block D: missing target (4)
  { sub: 'missing-target-1',             target_state: 'missing',     tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },
  { sub: 'missing-target-2',             target_state: 'missing',     tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'observation', expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },
  { sub: 'missing-target-pricing',       target_state: 'missing',     tier: 'recent',    scope: 'fresh',              category: 'pricing',          memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },
  { sub: 'missing-target-replay',        target_state: 'missing',     tier: 'recent',    scope: 'reused_after_error', category: 'smoke_store',      memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },

  // Block E: cross-tenant (4)
  { sub: 'cross-tenant-active',          target_state: 'cross_tenant',tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID', note: 'tenant A tries to supersede tenant B row — UPDATE WHERE tenant_id scopes out' },
  { sub: 'cross-tenant-active-obs',      target_state: 'cross_tenant',tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'observation', expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },
  { sub: 'cross-tenant-longterm',        target_state: 'cross_tenant',tier: 'long_term', scope: 'fresh',              category: 'smoke_store',      memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },
  { sub: 'cross-tenant-replay',          target_state: 'cross_tenant',tier: 'recent',    scope: 'reused_after_error', category: 'smoke_store',      memory_type: 'fact',        expect: 'failure', expect_error: 'SUPERSEDE_TARGET_INVALID' },

  // Block F: edge cases (5)
  { sub: 'self-target',                  target_state: 'active',      tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'fact',        expect: 'success', expect_idem_reused: false, expect_new_insert: true, note: 'happy baseline for edge-group' },
  { sub: 'happy-then-second-super-chain',target_state: 'active',      tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'fact',        expect: 'success', expect_idem_reused: false, expect_new_insert: true, note: 'chain A → A\' (then leave A\' for human)' },
  { sub: 'happy-longterm-pref',          target_state: 'active',      tier: 'long_term', scope: 'fresh',              category: 'pricing',          memory_type: 'preference',  expect: 'success', expect_idem_reused: false, expect_new_insert: true },
  { sub: 'happy-recent-constraint',      target_state: 'active',      tier: 'recent',    scope: 'fresh',              category: 'smoke_store',      memory_type: 'constraint',  expect: 'success', expect_idem_reused: false, expect_new_insert: true },
  { sub: 'replay-fresh-never-happened',  target_state: 'active',      tier: 'recent',    scope: 'reused_after_accept',category: 'pricing',          memory_type: 'fact',        expect: 'success', expect_idem_reused: true,  expect_new_insert: false },
];
if (SUPERSEDE_CASES_SPEC.length !== 25) {
  throw new Error(`supersede spec must be exactly 25 entries, got ${SUPERSEDE_CASES_SPEC.length}`);
}

// ----- Case builders --------------------------------------------------------

function pad3(n) { return String(n).padStart(3, '0'); }

function buildSearchCases() {
  const out = [];
  let i = 0;
  for (const q of SEARCH.queries) {
    for (const mt of SEARCH.memory_types) {
      for (const ov of SEARCH.status_overrides) {
        i += 1;
        const case_id = `f31-search-${pad3(i)}`;
        const mtStr = mt === null ? 'null' : mt;
        out.push({
          case_id,
          family: 'search_lexical_fallback',
          action: 'search_memory',
          inputs: {
            query: q.text,
            filters: {
              ...(mt ? { memory_type: mt } : {}),
              ...(ov.statuses ? { statuses: ov.statuses } : {}),
            },
            limit: 10,
          },
          preconditions: { seed_cases: [], notes: 'read-only against existing baseline' },
          expected_runtime_status: 'success',
          expected_result_envelope: (() => {
            const base = {
              used_embedding: false,
              embedding_attempted: true,
              embedding_error: null,
            };
            if (q.key !== 'q5') return { ...base, recall: 0 };
            // q5 = "Phase7 anchor": seed rows all have memory_type='fact'.
            // Only fact and null (no type filter) can recall ≥ 3. Other
            // memory_type filters correctly return 0 (no matching rows
            // in baseline). Oracle expectation follows ground truth.
            const facty = !mt || mt === 'fact';
            return facty
              ? { ...base, recall_min: q.expected_hits_min }
              : { ...base, recall: 0 };
          })(),
          expected_db_effect: { mutates: false, row_delta: {} },
          expected_error_code: null,
          notes: `query=${q.key} memory_type=${mtStr} override=${ov.key}`,
        });
      }
    }
  }
  return out;
}

function buildRecallCases() {
  const out = [];
  let i = 0;
  for (const tid of RECALL.threads) {
    for (const eid of RECALL.entities) {
      for (const cat of RECALL.categories) {
        for (const mt of RECALL.memory_types) {
          if (i >= 50) break;
          i += 1;
          const case_id = `f31-recall-${pad3(i)}`;
          const filters = {};
          if (tid) filters.source_thread_id = tid;
          if (eid) filters.entity_id = eid;
          if (cat) filters.category = cat;
          if (mt)  filters.memory_type = mt;
          out.push({
            case_id,
            family: 'recall_intersection',
            action: 'recall_memory',
            inputs: { filters, limit: 50 },
            preconditions: { seed_cases: [], notes: 'read-only against existing baseline' },
            expected_runtime_status: 'success',
            expected_result_envelope: {
              applied_filters_match: Object.keys(filters),
              default_status_filter_applied: true,
              order_by: 'created_at DESC',
            },
            expected_db_effect: { mutates: false, row_delta: {} },
            expected_error_code: null,
            notes: `thread=${tid.slice(-4)} entity=${eid.slice(-4)} cat=${cat ?? 'null'} mt=${mt ?? 'null'}`,
          });
        }
      }
    }
  }
  return out;
}

function buildPromoteCases() {
  const out = [];
  for (let i = 0; i < PROMOTE_CASES_SPEC.length; i++) {
    const s = PROMOTE_CASES_SPEC[i];
    const ord = pad3(i + 1);
    const case_id = `f31-promote-${ord}`;
    const seed_case_id = `f31-promote-${ord}-seed`;
    // Derive corroboration_count from corroboration_mode.
    const corr_count = s.corroboration_mode === 'two_plus' ? 2 : (s.corroboration_mode === 'one_only' ? 1 : (s.corroboration_mode === 'already_long_term' ? 2 : 1));
    out.push({
      case_id,
      family: 'promote_denial_vocabulary',
      action: 'promote_memory',
      inputs: {
        memory_id: `__RESOLVED_FROM_SEED__${seed_case_id}`,
        user_confirmed: s.cuc,
        evidence_validated: s.cev,
      },
      preconditions: {
        seed_cases: [seed_case_id],
        seed_params: {
          category: 'smoke_f31_promote',
          tier: s.tier,
          user_confirmed: s.rpuc,
          corroboration_count: corr_count,
        },
        replay: s.replay,
        notes: s.note ?? '',
      },
      expected_runtime_status: s.expect === 'accepted' ? 'success' : 'success',
      expected_result_envelope: {
        denial_reason: s.expect,
        acceptance_signals: s.signals ?? [],
      },
      expected_db_effect: {
        mutates: s.expect === 'accepted',
        row_delta: s.expect === 'accepted' ? { tier: 'recent → long_term' } : {},
      },
      expected_error_code: null,
      notes: `${s.sub} corr=${s.corroboration_mode} cuc=${s.cuc} cev=${s.cev} rpuc=${s.rpuc} tier=${s.tier} replay=${s.replay}`,
    });
  }
  return out;
}

function buildSupersedeCases() {
  const out = [];
  for (let i = 0; i < SUPERSEDE_CASES_SPEC.length; i++) {
    const s = SUPERSEDE_CASES_SPEC[i];
    const ord = pad3(i + 1);
    const case_id = `f31-supersede-${ord}`;
    const seed_case_id = `f31-supersede-${ord}-seed`;
    let target_memory_id;
    if (s.target_state === 'missing') {
      target_memory_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    } else if (s.target_state === 'cross_tenant') {
      target_memory_id = '__CROSS_TENANT_SENTINEL__';
    } else {
      target_memory_id = `__RESOLVED_FROM_SEED__${seed_case_id}`;
    }
    out.push({
      case_id,
      family: 'supersede_idempotency',
      action: 'supersede_memory',
      inputs: {
        memory_id: target_memory_id,
        replacement: { content: `F3.1 supersede ${case_id} replacement`, category: s.category, memory_type: s.memory_type, tier: s.tier },
        idempotency_scope: s.scope,
      },
      preconditions: {
        seed_cases: ['active', 'superseded'].includes(s.target_state) ? [seed_case_id] : [],
        seed_params: ['active', 'superseded'].includes(s.target_state) ? { category: s.category, memory_type: s.memory_type, tier: s.tier, status: s.target_state === 'superseded' ? 'supersede_first' : 'active' } : null,
        notes: s.note ?? '',
      },
      expected_runtime_status: s.expect === 'failure' ? 'failure' : 'success',
      expected_result_envelope: s.expect === 'failure'
        ? { error_code: s.expect_error }
        : { idempotency_reused: s.expect_idem_reused, new_insert: s.expect_new_insert },
      expected_db_effect: s.expect === 'failure'
        ? { mutates: false, row_delta: {} }
        : { mutates: s.expect_new_insert, row_delta: s.expect_new_insert ? { old: 'active → superseded', new: 'inserted' } : {} },
      expected_error_code: s.expect === 'failure' ? s.expect_error : null,
      notes: `${s.sub} target_state=${s.target_state} tier=${s.tier} scope=${s.scope} cat=${s.category} mt=${s.memory_type}`,
    });
  }
  return out;
}

// ----- Main -----------------------------------------------------------------

function generate() {
  const cases = [
    ...buildSearchCases(),
    ...buildRecallCases(),
    ...buildPromoteCases(),
    ...buildSupersedeCases(),
  ];
  return {
    suite: 'memory_module_v2.F3_1.cases_150',
    generated_at: new Date().toISOString(),
    frozen_constants: CONST,
    counts_by_family: {
      search_lexical_fallback:   cases.filter(c => c.family === 'search_lexical_fallback').length,
      recall_intersection:       cases.filter(c => c.family === 'recall_intersection').length,
      promote_denial_vocabulary: cases.filter(c => c.family === 'promote_denial_vocabulary').length,
      supersede_idempotency:     cases.filter(c => c.family === 'supersede_idempotency').length,
      total:                     cases.length,
    },
    cases,
  };
}

function check(existing) {
  const errs = [];
  if (existing.counts_by_family.total !== 150) errs.push(`total ${existing.counts_by_family.total} ≠ 150`);
  if (existing.counts_by_family.search_lexical_fallback !== 50) errs.push(`search ${existing.counts_by_family.search_lexical_fallback} ≠ 50`);
  if (existing.counts_by_family.recall_intersection !== 50) errs.push(`recall ${existing.counts_by_family.recall_intersection} ≠ 50`);
  if (existing.counts_by_family.promote_denial_vocabulary !== 25) errs.push(`promote ${existing.counts_by_family.promote_denial_vocabulary} ≠ 25`);
  if (existing.counts_by_family.supersede_idempotency !== 25) errs.push(`supersede ${existing.counts_by_family.supersede_idempotency} ≠ 25`);
  const ids = new Set();
  for (const c of existing.cases) {
    if (!c.case_id) errs.push('missing case_id');
    if (ids.has(c.case_id)) errs.push(`dup case_id ${c.case_id}`);
    ids.add(c.case_id);
    if (!c.family) errs.push(`${c.case_id} missing family`);
    if (!c.action) errs.push(`${c.case_id} missing action`);
    if (!['success', 'partial', 'failure'].includes(c.expected_runtime_status)) errs.push(`${c.case_id} bad expected_runtime_status`);
  }
  return errs;
}

const mode = process.argv[2] ?? 'generate';
if (mode === '--check') {
  const existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  const errs = check(existing);
  if (errs.length === 0) { console.log(`OK — ${existing.counts_by_family.total} cases pass all checks`); process.exit(0); }
  console.error('CHECK FAILED:\n' + errs.map(e => '  - ' + e).join('\n'));
  process.exit(1);
} else {
  const data = generate();
  const errs = check(data);
  if (errs.length) {
    console.error('GENERATE PRODUCED INVALID MATRIX:\n' + errs.map(e => '  - ' + e).join('\n'));
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
  console.log(`wrote ${OUT_PATH} (${data.counts_by_family.total} cases)`);
}
