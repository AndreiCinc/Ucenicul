// build_di_registry.mjs — derive DI_Load_Module_Registry's new jsCode and the
// patch-node params JSON for n8n-patch CLI.
//
// PL_BRIEFING_INTENT_MAPPING_FOLLOWUP 2026-04-26: add response_module entry.
import { readFileSync, writeFileSync } from 'node:fs';

const live = JSON.parse(readFileSync('/tmp/di_full.json', 'utf8'));
const node = live.nodes.find(n => n.name === 'DI_Load_Module_Registry');
const before = node.parameters.jsCode || '';
writeFileSync('docs/architecture/pl/briefing_respond_only/artifacts/di_registry_pre.txt', before);

const expected = `  { module_name: 'watcher_module_basic', module_type: 'observer', capabilities: ['produce_observation'] }
] } }];`;
if (!before.includes(expected)) throw new Error('DI registry anchor not found');

const after = before.replace(
  expected,
  `  { module_name: 'watcher_module_basic', module_type: 'observer', capabilities: ['produce_observation'] },
  // PL_BRIEFING_INTENT_MAPPING_FOLLOWUP 2026-04-26: response_module composer lane (no-write).
  { module_name: 'response_module', module_type: 'composer', capabilities: ['respond_only'] }
] } }];`
);

writeFileSync('docs/architecture/pl/briefing_respond_only/artifacts/di_registry_jscode.txt', after);
writeFileSync('docs/architecture/pl/briefing_respond_only/artifacts/di_registry_params.json', JSON.stringify({ jsCode: after }, null, 2));

console.log('DI registry pre bytes:', before.length, 'post:', after.length);
console.log('contains response_module entry:', /module_name: 'response_module'/.test(after));
