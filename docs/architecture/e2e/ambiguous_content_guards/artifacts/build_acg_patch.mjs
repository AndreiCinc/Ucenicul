#!/usr/bin/env node
// build_acg_patch.mjs — assemble PUT-ready JSON for AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(readFileSync(resolve(D, 'WF-ME-01.pre.json'), 'utf8'));
const TASK_PREP_JS = readFileSync(resolve(D, 'task_prep.js'), 'utf8');
const MEM_PREP_JS  = readFileSync(resolve(D, 'mem_prep.js'),  'utf8');

let touched = 0;
const newNodes = wf.nodes.map(n => {
  if (n.name === 'ME_Task_Create_Prep') {
    touched++;
    return { ...n, parameters: { ...n.parameters, jsCode: TASK_PREP_JS } };
  }
  if (n.name === 'ME_Memory_Store_Prep') {
    touched++;
    return { ...n, parameters: { ...n.parameters, jsCode: MEM_PREP_JS } };
  }
  return n;
});
if (touched !== 2) { console.error(`expected 2 nodes touched, got ${touched}`); process.exit(1); }

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
writeFileSync(resolve(D, 'WF-ME-01.next.json'), JSON.stringify(out, null, 2));
console.log(`wrote WF-ME-01.next.json: nodes=${out.nodes.length} connections=${Object.keys(out.connections).length} touched=${touched}`);
