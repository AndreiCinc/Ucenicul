#!/usr/bin/env node
// Runs the pack's local_store_prep_50.json test matrix against the candidate storePrep().
// Oracles derived from pack text: defaults preserved on omit; valid passthrough; invalid normalize.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const [ , , matrixPath, candidatePath ] = process.argv;
if (!matrixPath || !candidatePath) { console.error('Usage: node run_local_store_prep_50.mjs <matrix.json> <candidate.mjs>'); process.exit(2); }

const matrix = JSON.parse(fs.readFileSync(matrixPath,'utf8'));
const mod = await import(pathToFileURL(candidatePath).href);
const storePrep = mod.default;

const env = {
  tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  thread_id: '77777777-0000-0000-0000-000000000007',
  execution_context_id: 'd4f82a41-01cd-4fb7-9d70-573557348e74'
};
function mkStep(testId, extraInputs = {}) {
  return {
    step_id: 'v2obs-sppt-local-' + testId,
    module_name: 'memory_module',
    purpose: 'local unit',
    execution_mode: 'execute',
    inputs: {
      content: 'test content for ' + testId,
      memory_type: 'fact',
      category: 'v2obs_sppt_local',
      source_thread_id: '77777777-0000-0000-0000-000000000007',
      ...extraInputs
    }
  };
}

const VALID_TIERS = ['recent','long_term'];
let pass = 0, fail = 0;
const failures = [];

for (const t of matrix.tests) {
  const rawInput = t.input;
  let extra = {};
  if (typeof rawInput === 'object' && rawInput !== null) {
    const { variant, ...rest } = rawInput;
    extra = rest;
  }
  const step = mkStep(t.id, extra);
  let result;
  try { result = storePrep(env, step); } catch (e) { fail++; failures.push({ id: t.id, msg: 'threw: '+e.message }); continue; }
  const out = Array.isArray(result) ? result[0].json : result;
  try {
    if (t.category === 'defaults_and_shape') {
      // SPU-01..10: caller omits -> defaults = recent/false/1; __db shape has 16 keys (13 pre + 3 new)
      assert.ok(!out._error, 'expected no error');
      assert.equal(out.__db.tier, 'recent');
      assert.equal(out.__db.user_confirmed, false);
      assert.equal(out.__db.corroboration_count, 1);
      assert.equal(out.__db.memory_type, 'fact');
      assert.equal(out.__db.tenant_id, env.tenant_id);
    } else if (t.category === 'tier_passthrough') {
      // SPU-11..20
      assert.equal(out.__db.tier, rawInput.tier);
      assert.equal(out.__db.user_confirmed, false);
      assert.equal(out.__db.corroboration_count, 1);
    } else if (t.category === 'user_confirmed_passthrough') {
      // SPU-21..30
      assert.equal(out.__db.user_confirmed, rawInput.user_confirmed);
      assert.equal(out.__db.tier, 'recent');
      assert.equal(out.__db.corroboration_count, 1);
    } else if (t.category === 'corroboration_count_passthrough') {
      // SPU-31..40: integers >=1 pass through; 0 safely-bounded to 1 per DB CHECK (corroboration_count >= 1)
      const expected = (rawInput.corroboration_count >= 1) ? rawInput.corroboration_count : 1;
      assert.equal(out.__db.corroboration_count, expected);
      assert.equal(out.__db.tier, 'recent');
      assert.equal(out.__db.user_confirmed, false);
    } else if (t.category === 'combinations_and_invalids') {
      // SPU-41..50: valid fields pass; invalid normalize to defaults
      if (rawInput.tier !== undefined) {
        if (VALID_TIERS.includes(rawInput.tier)) assert.equal(out.__db.tier, rawInput.tier);
        else assert.equal(out.__db.tier, 'recent');
      } else {
        assert.equal(out.__db.tier, 'recent');
      }
      if (rawInput.user_confirmed !== undefined) {
        if (rawInput.user_confirmed === true || rawInput.user_confirmed === false) assert.equal(out.__db.user_confirmed, rawInput.user_confirmed);
        else assert.equal(out.__db.user_confirmed, false);
      } else {
        assert.equal(out.__db.user_confirmed, false);
      }
      if (rawInput.corroboration_count !== undefined) {
        if (Number.isInteger(rawInput.corroboration_count) && rawInput.corroboration_count >= 1) assert.equal(out.__db.corroboration_count, rawInput.corroboration_count);
        else assert.equal(out.__db.corroboration_count, 1);
      } else {
        assert.equal(out.__db.corroboration_count, 1);
      }
    } else {
      throw new Error('unknown category: '+t.category);
    }
    pass++;
    if (pass <= 3 || pass === matrix.tests.length) console.log('PASS', t.id, t.category);
  } catch (e) {
    fail++;
    failures.push({ id: t.id, msg: e.message });
    console.error('FAIL', t.id, '-', e.message);
  }
}
console.log(`\n${pass}/${matrix.tests.length} PASS; ${fail} FAIL`);
if (fail) { console.error(JSON.stringify(failures.slice(0,10),null,2)); process.exit(1); }
