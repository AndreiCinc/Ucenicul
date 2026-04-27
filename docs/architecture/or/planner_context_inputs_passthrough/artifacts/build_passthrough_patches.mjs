#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const D = dirname(fileURLToPath(import.meta.url));

const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress','saveManualExecutions','saveDataErrorExecution','saveDataSuccessExecution',
  'executionTimeout','errorWorkflow','timezone','executionOrder','callerPolicy','callerIds',
  'timeSavedPerExecution','availableInMCP'
]);
function buildOut(wf, patches) {
  let touched = 0;
  const newNodes = wf.nodes.map(n => {
    if (patches[n.name]) { touched++; return { ...n, parameters: { ...n.parameters, jsCode: patches[n.name] } }; }
    return n;
  });
  const settings = {};
  if (wf.settings && typeof wf.settings === 'object') {
    for (const k of Object.keys(wf.settings)) if (SETTINGS_WHITELIST.has(k)) settings[k] = wf.settings[k];
  }
  return { out: { name: wf.name, nodes: newNodes, connections: wf.connections, settings }, touched };
}

// TR
{
  const wf = JSON.parse(readFileSync(resolve(D, 'WF-TR-01.pre.json'), 'utf8'));
  const patches = { 'TR_Build_EC_Envelope': readFileSync(resolve(D, 'TR_Build_EC_Envelope.next.js'),'utf8') };
  const { out, touched } = buildOut(wf, patches);
  if (touched !== 1) { console.error('TR expected 1 touched, got', touched); process.exit(1); }
  writeFileSync(resolve(D, 'WF-TR-01.next.json'), JSON.stringify(out, null, 2));
  console.log(`TR: nodes=${out.nodes.length} conns=${Object.keys(out.connections).length} touched=${touched}`);
}

// EC
{
  const wf = JSON.parse(readFileSync(resolve(D, 'WF-EC-01.pre.json'), 'utf8'));
  const patches = {
    'EC_Validate_Input': readFileSync(resolve(D, 'EC_Validate_Input.next.js'), 'utf8'),
    'EC_Return_Result':  readFileSync(resolve(D, 'EC_Return_Result.next.js'),  'utf8')
  };
  const { out, touched } = buildOut(wf, patches);
  if (touched !== 2) { console.error('EC expected 2 touched, got', touched); process.exit(1); }
  writeFileSync(resolve(D, 'WF-EC-01.next.json'), JSON.stringify(out, null, 2));
  console.log(`EC: nodes=${out.nodes.length} conns=${Object.keys(out.connections).length} touched=${touched}`);
}

// OR
{
  const wf = JSON.parse(readFileSync(resolve(D, 'WF-OR-01.pre.json'), 'utf8'));
  const patches = {
    'OR_Validate_EC_Result':    readFileSync(resolve(D, 'OR_Validate_EC_Result.next.js'),    'utf8'),
    'OR_Extract_Handoff_Input': readFileSync(resolve(D, 'OR_Extract_Handoff_Input.next.js'), 'utf8'),
    'OR_Build_Handoff_Payload': readFileSync(resolve(D, 'OR_Build_Handoff_Payload.next.js'), 'utf8')
  };
  const { out, touched } = buildOut(wf, patches);
  if (touched !== 3) { console.error('OR expected 3 touched, got', touched); process.exit(1); }
  writeFileSync(resolve(D, 'WF-OR-01.next.json'), JSON.stringify(out, null, 2));
  console.log(`OR: nodes=${out.nodes.length} conns=${Object.keys(out.connections).length} touched=${touched}`);
}
