#!/usr/bin/env node
// Build 50 dispatcher envelopes (chatInput strings) from e2e_store_prep_50.json.
// Writes one JSON file with an ordered array; the runner pops each one and calls execute_workflow.

import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const matrixPath = path.join(here, '..', 'tests', 'e2e_store_prep_50.json');
const outPath = path.join(here, 'e2e_envelopes_step1.json');

const matrix = JSON.parse(fs.readFileSync(matrixPath,'utf8'));
const base = {
  status_kind: 'success',
  result_type: 'dispatch',
  execution_context_id: 'd4f82a41-01cd-4fb7-9d70-573557348e74',
  thread_id: '77777777-0000-0000-0000-000000000007',
  tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001'
};
const namespaceRoot = 'mem-smoke-v2obs-sppt';

// Parse payload strings/objects from the pack into a concrete `inputs` object
function parsePayload(t) {
  const p = t.payload;
  const inputs = {
    memory_type: 'fact',
    category: 'v2obs_sppt',
    source_thread_id: '77777777-0000-0000-0000-000000000007'
  };
  // content + step_id tag derived from family + variant
  const tag = t.id.toLowerCase();
  inputs.content = `v2obs-sppt e2e ${t.id} ${t.family} distinctive content`;

  if (typeof p === 'string') {
    // family `defaults_live_store` / `idempotent_replay` / `invalid_and_regression`
    const m = p.match(/step1-default-(\d+)/);
    if (m) return { inputs, tag: `step1-default-${m[1]}` };
    if (t.family === 'idempotent_replay') {
      // Replay prior seed: use SPE-01..SPE-05 step_ids (5 replays mapped to first 5 defaults)
      const replayIdx = (parseInt(t.id.slice(-2),10) - 40); // SPE-41..45 -> 1..5
      return { inputs, tag: `step1-default-${String(replayIdx).padStart(2,'0')}`, replay: true };
    }
    if (t.family === 'invalid_and_regression') {
      const n = parseInt(t.id.slice(-2),10);
      // Mix of invalids: 46 invalid tier, 47 invalid uc, 48 negative corro, 49 combo invalid, 50 store regression
      const tagX = `step1-invreg-${String(n).padStart(2,'0')}`;
      if (n===46) Object.assign(inputs, { tier: 'NOT_A_TIER' });
      else if (n===47) Object.assign(inputs, { user_confirmed: 'true' });
      else if (n===48) Object.assign(inputs, { corroboration_count: -3 });
      else if (n===49) Object.assign(inputs, { tier: null, user_confirmed: 1, corroboration_count: '2' });
      // n===50: regression spot, plain defaults
      return { inputs, tag: tagX };
    }
    return { inputs, tag: `step1-misc-${t.id}` };
  }
  // p is object
  if (p.tier !== undefined) inputs.tier = p.tier;
  if (p.user_confirmed !== undefined) inputs.user_confirmed = p.user_confirmed;
  if (p.corroboration_count !== undefined) inputs.corroboration_count = p.corroboration_count;
  return { inputs, tag: p.unique };
}

const envelopes = matrix.tests.map(t => {
  const { inputs, tag, replay } = parsePayload(t);
  const step_id = `${namespaceRoot}-${tag}`;
  const envelope = {
    ...base,
    dispatcher_input: {
      dispatch_allowed: true,
      module_execution_started: false,
      response_generation_allowed: false,
      domain_writes_performed: false,
      step: {
        step_id,
        module_name: 'memory_module',
        purpose: `Step1 E2E ${t.id} family=${t.family}`,
        execution_mode: 'execute',
        inputs: { action: 'store_memory', ...inputs }
      }
    }
  };
  return { id: t.id, family: t.family, step_id, chatInput: JSON.stringify(envelope), replay: !!replay };
});

fs.writeFileSync(outPath, JSON.stringify(envelopes, null, 2));
console.log('wrote', outPath, 'with', envelopes.length, 'envelopes');
