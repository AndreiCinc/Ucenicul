// case_loader.mjs — load + filter the 240-case matrix.

import { readFileSync } from 'node:fs';

export function loadMatrix(matrixPath) {
  const j = JSON.parse(readFileSync(matrixPath, 'utf8'));
  if (!j.cases || !Array.isArray(j.cases)) throw new Error('matrix missing cases array');
  return j;
}

export function filterCases(cases, filt = {}) {
  let out = cases.slice();
  if (filt.case_ids?.length) out = out.filter(c => filt.case_ids.includes(c.case_id));
  if (filt.corridors?.length) out = out.filter(c => filt.corridors.includes(c.corridor_id));
  if (filt.priorities?.length) out = out.filter(c => filt.priorities.includes(c.priority));
  if (filt.phases?.length) out = out.filter(c => filt.phases.includes(c.phase));
  if (filt.levels?.length) out = out.filter(c => filt.levels.includes(c.level));
  if (filt.variants?.length) out = out.filter(c => filt.variants.includes(c.variant));
  if (filt.exclude_case_ids?.length) out = out.filter(c => !filt.exclude_case_ids.includes(c.case_id));
  return out;
}
