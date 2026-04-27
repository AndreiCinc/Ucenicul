// build_pl_v26.mjs — derive WF-PL-01 PL_Build_Planner_Input v2.6 from v2.5.
// Adds list_improvements: intentMap + actionToModule + extractInputsForAction.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_PATH = resolve(__dirname, '..', '..', '..', 'pl', 'memory_recall_intentmap', 'artifacts', 'PL_Build_Planner_Input_v2.5.js');
const OUT_PATH = resolve(__dirname, 'PL_Build_Planner_Input_v2.6.js');

let src = readFileSync(SRC_PATH, 'utf8');

// 1) Header swap
src = src.replace(
  '// PL_Build_Planner_Input — v2.5 (MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP 2026-04-27)\n// Changes vs v2.4:',
  '// PL_Build_Planner_Input — v2.6 (IMPROVEMENT_MODULE_LIST_FOLLOWUP 2026-04-27)\n' +
  '// Changes vs v2.5:\n' +
  "//   - intentMap.list_improvements = 'list_improvements'\n" +
  "//   - actionToModule.list_improvements = 'improvement_module'\n" +
  "//   - extractInputsForAction('list_improvements', goalText) extracts safe filters\n" +
  '//     (limit, include_closed, status_filter) from goal text + defaults.\n' +
  '//   - All v2.5 routes byte-identical.\n' +
  '// (Earlier v2.4 → v2.5 changelog preserved below for lineage:)\n' +
  '// Changes v2.4 → v2.5:'
);

// 2) intentMap addition (after recall_memory line)
src = src.replace(
  "  // MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: route memory recall to memory_module.recall_memory.\n  recall_memory: 'recall_memory',",
  "  // MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: route memory recall to memory_module.recall_memory.\n  recall_memory: 'recall_memory',\n" +
  "  // IMPROVEMENT_MODULE_LIST_FOLLOWUP: route list_improvements through improvement_module.\n" +
  "  list_improvements: 'list_improvements',"
);

// 3) actionToModule addition
src = src.replace(
  "  // MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: memory_module owns recall_memory.\n  recall_memory: 'memory_module',",
  "  // MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: memory_module owns recall_memory.\n  recall_memory: 'memory_module',\n" +
  "  // IMPROVEMENT_MODULE_LIST_FOLLOWUP: improvement_module owns list_improvements (read-only lane).\n" +
  "  list_improvements: 'improvement_module',"
);

// 4) extractInputsForAction clause for list_improvements after recall_memory clause
const recallClause =
  "  if (action === 'recall_memory') {\n" +
  "    // Recall is structural; provide a safe default limit. The late-binding\n" +
  "    // pass below injects source_thread_id when no structural filter is set.\n" +
  "    return { limit: 25 };\n" +
  "  }";

const listClause = "  if (action === 'list_improvements') {\n" +
  "    // IMPROVEMENT_MODULE_LIST_FOLLOWUP: read-only tenant-scoped list.\n" +
  "    // Parse light filters from goal text; ME does parameterised SQL.\n" +
  "    const out = { limit: 25, include_closed: false };\n" +
  "    if (/\\b(closed|inchise|terminate|done)\\b/i.test(lower)) out.include_closed = true;\n" +
  "    const sm = lower.match(/\\b(?:status[:=]?\\s*|stare[:=]?\\s*)(pending|in_progress|closed|rejected|accepted)\\b/);\n" +
  "    if (sm) out.status_filter = sm[1];\n" +
  "    return out;\n" +
  "  }";

if (!src.includes(recallClause)) throw new Error('recall clause anchor not found in v2.5');
src = src.replace(recallClause, recallClause + '\n' + listClause);

writeFileSync(OUT_PATH, src);
console.log('v2.6 written:', OUT_PATH, 'len=', src.length, 'lines=', src.split('\n').length);

// Validate parse (n8n Code node semantics)
const wrapped = '(function($,$json,$items){' + src + '\n})';
try { new Function('return ' + wrapped); console.log('OK_PARSE'); } catch (e) { console.log('PARSE_ERR:', e.message); process.exit(1); }
