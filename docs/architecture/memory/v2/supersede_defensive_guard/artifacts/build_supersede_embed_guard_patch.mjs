#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(readFileSync(resolve(D, 'WF-ME-01.pre.json'), 'utf8'));

// Defensive ternary: never dereference $json.__db.content when missing.
// Returns valid JSON in both branches. continueOnFail + alwaysOutputData added
// so the chain proceeds to ME_Memory_Supersede_Embed_Merge regardless of OpenAI's
// response (Merge already short-circuits on prep._error).
const NEW_JSONBODY = "={{ ($json && $json.__db && typeof $json.__db.content === 'string') ? JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) : JSON.stringify({ model: 'text-embedding-3-small', input: 'noop' }) }}";

let touched = 0;
const newNodes = wf.nodes.map(n => {
  if (n.name === 'ME_Memory_Supersede_Embed') {
    touched++;
    return {
      ...n,
      parameters: { ...n.parameters, jsonBody: NEW_JSONBODY },
      continueOnFail: true,
      alwaysOutputData: true
    };
  }
  return n;
});
if (touched !== 1) { console.error('expected 1 touched, got', touched); process.exit(1); }

const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress','saveManualExecutions','saveDataErrorExecution','saveDataSuccessExecution',
  'executionTimeout','errorWorkflow','timezone','executionOrder','callerPolicy','callerIds',
  'timeSavedPerExecution','availableInMCP'
]);
const settings = {};
if (wf.settings && typeof wf.settings === 'object') {
  for (const k of Object.keys(wf.settings)) if (SETTINGS_WHITELIST.has(k)) settings[k] = wf.settings[k];
}

const out = { name: wf.name, nodes: newNodes, connections: wf.connections, settings };
writeFileSync(resolve(D, 'WF-ME-01.next.json'), JSON.stringify(out, null, 2));
console.log(`wrote: nodes=${out.nodes.length} conns=${Object.keys(out.connections).length} touched=${touched}`);
