#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const D = dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(readFileSync(resolve(D, 'WF-PL-01.pre.json'), 'utf8'));
const NEW_JS = readFileSync(resolve(D, 'PL_Build_Planner_Input.next.js'), 'utf8');
let touched = 0;
const newNodes = wf.nodes.map(n => {
  if (n.name === 'PL_Build_Planner_Input') {
    touched++;
    return { ...n, parameters: { ...n.parameters, jsCode: NEW_JS } };
  }
  return n;
});
if (touched !== 1) { console.error(`expected 1 node touched, got ${touched}`); process.exit(1); }
const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress','saveManualExecutions','saveDataErrorExecution','saveDataSuccessExecution',
  'executionTimeout','errorWorkflow','timezone','executionOrder','callerPolicy','callerIds',
  'timeSavedPerExecution','availableInMCP'
]);
const settings = {};
if (wf.settings && typeof wf.settings === 'object') {
  for (const k of Object.keys(wf.settings)) {
    if (SETTINGS_WHITELIST.has(k)) settings[k] = wf.settings[k];
  }
}
const out = { name: wf.name, nodes: newNodes, connections: wf.connections, settings };
writeFileSync(resolve(D, 'WF-PL-01.next.json'), JSON.stringify(out, null, 2));
console.log(`wrote: nodes=${out.nodes.length} connections=${Object.keys(out.connections).length} touched=${touched}`);
