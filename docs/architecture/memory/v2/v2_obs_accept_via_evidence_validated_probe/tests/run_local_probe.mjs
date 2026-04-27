#!/usr/bin/env node
// Run 50 local probe tests against promote_lane_candidate.mjs
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const [, , matrixPath, candidatePath] = process.argv;
const j = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const mod = await import(pathToFileURL(candidatePath).href);
const runLane = mod.default;

const env = {
  tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  thread_id: '77777777-0000-0000-0000-000000000007',
  execution_context_id: 'd4f82a41-01cd-4fb7-9d70-573557348e74'
};

let pass = 0, fail = 0;
const failures = [];

for (const c of j.cases) {
  const seed = c.seed_row || {};
  const promote = c.promote_call || {};
  const exp = c.expected || {};

  // Synthesize a seed row for the simulator
  const memory_id = 'aaaaaaaa-bbbb-cccc-dddd-' + c.id.replace(/[^a-z0-9]/gi, '').toLowerCase().padEnd(12, '0').slice(0, 12);
  const rowBefore = {
    id: memory_id,
    tenant_id: env.tenant_id,
    tier: seed.tier || 'recent',
    corroboration_count: typeof seed.corroboration_count === 'number' ? seed.corroboration_count : 1,
    user_confirmed: seed.user_confirmed === true,
    evidence_validated: seed.evidence_validated === true,
    status: 'active'
  };
  const step = {
    step_id: 'evp-' + c.id.toLowerCase(),
    module_name: 'memory_module',
    inputs: {
      action: 'promote_memory',
      memory_id,
      promotion_target: 'long_term',
      user_confirmed: promote.user_confirmed === true,
      evidence_validated: promote.evidence_validated === true
    }
  };

  try {
    const out = runLane(env, step, rowBefore);
    // expected.accept: true|false
    const actions = out && out.module_result && out.module_result.actions_executed;
    if (!actions || actions.length !== 1) throw new Error('expected 1 action');
    const details = actions[0].details;
    const accepted = out.module_result.status === 'success';
    if (typeof exp.accept === 'boolean') {
      assert.equal(accepted, exp.accept, `accept mismatch (expected ${exp.accept}, got ${accepted})`);
    }
    if (exp.acceptance_signals_contains) {
      const signals = details.acceptance_signals || [];
      assert.ok(signals.includes(exp.acceptance_signals_contains), `acceptance_signals missing '${exp.acceptance_signals_contains}' — got ${JSON.stringify(signals)}`);
    }
    if (exp.denial_reason) {
      assert.equal(details.denial_reason, exp.denial_reason, `denial_reason mismatch`);
    }
    if (exp.acceptance_signals_contains_all) {
      const signals = details.acceptance_signals || [];
      for (const s of exp.acceptance_signals_contains_all) {
        assert.ok(signals.includes(s), `missing signal '${s}' in ${JSON.stringify(signals)}`);
      }
    }
    pass++;
  } catch (e) {
    fail++;
    failures.push({ id: c.id, family: c.family, msg: e.message });
  }
}
console.log(`${pass}/${j.cases.length} PASS; ${fail} FAIL`);
if (fail) {
  console.error(JSON.stringify(failures.slice(0, 10), null, 2));
  process.exit(1);
}
