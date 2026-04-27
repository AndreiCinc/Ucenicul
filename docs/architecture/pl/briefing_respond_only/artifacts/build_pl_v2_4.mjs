// build_pl_v2_4.mjs — derive PL_Build_Planner_Input v2.4 from live v2.3 and write
// the patched jsCode + a patch-node params JSON ready for n8n-patch CLI.
//
// v2.4 changes (PL_BRIEFING_INTENT_MAPPING_FOLLOWUP 2026-04-26):
//   - intentMap.briefing = 'respond_only'
//   - actionToModule.respond_only = 'response_module'
//   - extractInputsForAction adds a 'respond_only' clause emitting
//     { user_message, response_intent: 'briefing', no_domain_write: true }
//   - All other paths byte-identical to v2.3.
//
// Output:
//   docs/architecture/pl/briefing_respond_only/artifacts/pl_v2_4_jscode.txt
//   docs/architecture/pl/briefing_respond_only/artifacts/pl_v2_4_params.json
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('docs/architecture/pl/briefing_respond_only/artifacts/pl_v2_3_pre.txt', 'utf8');

// 1) Replace v2.3 header banner with v2.4 banner.
let out = src.replace(
  /^\/\/ PL_Build_Planner_Input — v2\.3 \(MEMORY-SUPERSEDE-PL-INTENTMAP-FOLLOWUP\)\n[\s\S]*?\/\/   - All other intents \/ paths byte-identical to v2\.2\.\n/,
  `// PL_Build_Planner_Input — v2.4 (PL_BRIEFING_INTENT_MAPPING_FOLLOWUP 2026-04-26)
// Changes vs v2.3:
//   - intentMap.briefing = 'respond_only'
//   - actionToModule.respond_only = 'response_module'
//   - extractInputsForAction('respond_only', goalText) emits user_message,
//     response_intent='briefing', no_domain_write=true. No DB writes; no module
//     side-effects; the response_module.respond_only ME lane is no-write.
//   - response_module is added to WF-DI-01.DI_Load_Module_Registry as a
//     'composer' module with capability 'respond_only'.
//   - All existing task/memory/improvement/reminder/supersede routes byte-identical to v2.3.
`);

// 2) Add briefing → respond_only in intentMap.  Anchor on the existing
//    log_improvement_request line.
const intentMapBefore = `  log_improvement_request: 'capture_feedback'\n};`;
const intentMapAfter = `  log_improvement_request: 'capture_feedback',
  // PL_BRIEFING_INTENT_MAPPING_FOLLOWUP: route briefing → response_module.respond_only.
  briefing: 'respond_only'
};`;
if (!out.includes(intentMapBefore)) throw new Error('intentMap anchor not found in v2.3 jsCode');
out = out.replace(intentMapBefore, intentMapAfter);

// 3) Add respond_only → response_module in actionToModule.  Anchor on observe.
const a2mBefore = `  search_memory: 'memory_module', capture_feedback: 'improvement_module',
  observe: 'watcher_module_basic'
};`;
const a2mAfter = `  search_memory: 'memory_module', capture_feedback: 'improvement_module',
  observe: 'watcher_module_basic',
  // PL_BRIEFING_INTENT_MAPPING_FOLLOWUP: response_module owns respond_only (no-write composer).
  respond_only: 'response_module'
};`;
if (!out.includes(a2mBefore)) throw new Error('actionToModule anchor not found in v2.3 jsCode');
out = out.replace(a2mBefore, a2mAfter);

// 4) Add extractInputsForAction clause for respond_only.  Anchor on the
//    existing observe clause.
const extractBefore = `  if (action === 'observe') return { observation_text: g };`;
const extractAfter = `  if (action === 'observe') return { observation_text: g };
  if (action === 'respond_only') {
    // PL_BRIEFING_INTENT_MAPPING_FOLLOWUP: pass user_message + response_intent
    // straight through; no_domain_write tags the request as a no-side-effect lane.
    return { user_message: g, response_intent: 'briefing', no_domain_write: true };
  }`;
if (!out.includes(extractBefore)) throw new Error('extractInputsForAction anchor not found in v2.3 jsCode');
out = out.replace(extractBefore, extractAfter);

// 5) Save.
writeFileSync('docs/architecture/pl/briefing_respond_only/artifacts/pl_v2_4_jscode.txt', out);

// 6) Build patch-node params JSON.
const paramsObj = { jsCode: out };
writeFileSync('docs/architecture/pl/briefing_respond_only/artifacts/pl_v2_4_params.json', JSON.stringify(paramsObj, null, 2));

console.log('v2.4 jsCode bytes:', out.length, '(was', src.length, ')');
console.log('Δ bytes:', out.length - src.length);
console.log('contains briefing→respond_only:', /briefing: 'respond_only'/.test(out));
console.log('contains respond_only→response_module:', /respond_only: 'response_module'/.test(out));
console.log('contains extractInputsForAction respond_only clause:', /action === 'respond_only'/.test(out));
