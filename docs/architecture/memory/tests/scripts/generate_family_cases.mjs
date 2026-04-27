#!/usr/bin/env node
import fs from 'node:fs';

const seedPath = process.argv[2] || 'tests/memory/v2/fixtures/family_cases_seed.json';
const outPath = process.argv[3] || 'tests/memory/v2/fixtures/family_cases_generated.json';

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

function cartesian(obj) {
  const keys = Object.keys(obj);
  const vals = keys.map(k => obj[k]);
  const out = [];
  function rec(i, cur) {
    if (i === keys.length) return void out.push({ ...cur });
    for (const v of vals[i]) rec(i + 1, { ...cur, [keys[i]]: v });
  }
  rec(0, {});
  return out;
}

const generated = { suite: seed.suite, generated_at: new Date().toISOString(), cases: [] };

for (const [family, cfg] of Object.entries(seed.families)) {
  const combos = cartesian(cfg.variants);
  let idx = 0;
  for (const combo of combos.slice(0, cfg.count_target)) {
    idx += 1;
    generated.cases.push({
      case_id: `${family}-${String(idx).padStart(3, '0')}`,
      family,
      ...cfg.template,
      inputs: { ...(cfg.template.inputs || {}), ...combo }
    });
  }
}

fs.writeFileSync(outPath, JSON.stringify(generated, null, 2));
console.log(`wrote ${generated.cases.length} cases to ${outPath}`);
