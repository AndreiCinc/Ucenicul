#!/usr/bin/env node
// f31_seed_resolve.mjs — Stage C helper.
//
// Given a seed case_id (e.g. "f31-promote-001-seed"), emits the SELECT query
// that will return the memory_id of the row inserted by that seed's
// store_memory execution.
//
// Usage:
//   node harness/f31_seed_resolve.mjs sql <seed_case_id>
//     → prints a SELECT statement to look up the memory_id by
//       idempotency_key = 'store_memory:<ctx>:mem-f31-<seed_case_id>'
//
//   node harness/f31_seed_resolve.mjs substitute <case_id> <resolved_memory_id>
//     → prints a JSON fragment suitable for injection into the probe payload,
//       replacing the "__RESOLVED_FROM_SEED__<seed_case_id>" sentinel.

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MATRIX_PATH = path.resolve(HERE, '..', 'matrix', 'f31_cases_150.json');

const CONST = {
  execution_context_id: 'd4f82a41-01cd-4fb7-9d70-573557348e74',
  idem_prefix: 'mem-f31',
};

function loadMatrix() {
  return JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
}

function sqlFor(seedCaseId) {
  const idempotencyKey = `store_memory:${CONST.execution_context_id}:${CONST.idem_prefix}-${seedCaseId}`;
  return `SELECT id, tier, status, category, memory_type, created_at FROM memory_items WHERE idempotency_key = '${idempotencyKey}' LIMIT 1;`;
}

function cmdSql(seedCaseId) {
  console.log(sqlFor(seedCaseId));
}

function cmdSubstitute(caseId, resolvedMemoryId) {
  const matrix = loadMatrix();
  const c = matrix.cases.find(x => x.case_id === caseId);
  if (!c) throw new Error(`case not found: ${caseId}`);
  const inputs = JSON.parse(JSON.stringify(c.inputs));
  // Walk and replace sentinel.
  function walk(obj) {
    if (Array.isArray(obj)) return obj.map(walk);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) out[k] = walk(v);
      return out;
    }
    if (typeof obj === 'string' && obj.startsWith('__RESOLVED_FROM_SEED__')) {
      return resolvedMemoryId;
    }
    return obj;
  }
  const resolved = walk(inputs);
  console.log(JSON.stringify({ case_id: caseId, resolved_inputs: resolved }, null, 2));
}

const [, , cmd, arg1, arg2] = process.argv;
if (cmd === 'sql' && arg1) cmdSql(arg1);
else if (cmd === 'substitute' && arg1 && arg2) cmdSubstitute(arg1, arg2);
else {
  console.error('usage: f31_seed_resolve.mjs sql <seed_case_id>');
  console.error('       f31_seed_resolve.mjs substitute <case_id> <resolved_memory_id>');
  process.exit(1);
}
