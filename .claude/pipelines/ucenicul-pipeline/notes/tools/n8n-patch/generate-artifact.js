import { readFileSync, writeFileSync } from 'node:fs';
const src = 'workflow-TClXgmO8H8zsSwMb.json';
const wf = JSON.parse(readFileSync(src, 'utf8'));
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `backup-workflow-TClXgmO8H8zsSwMb-${ts}.json`;
writeFileSync(backup, JSON.stringify(wf, null, 2));
const whitelist = new Set([
  'saveExecutionProgress',
  'saveManualExecutions',
  'saveDataErrorExecution',
  'saveDataSuccessExecution',
  'executionTimeout',
  'errorWorkflow',
  'timezone',
  'executionOrder',
  'callerPolicy',
  'callerIds',
  'timeSavedPerExecution',
  'availableInMCP',
]);
const settings = Object.fromEntries(
  Object.entries(wf.settings || {}).filter(([k]) => whitelist.has(k))
);
const ready = {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings,
};
writeFileSync('TClXgmO8H8zsSwMb-put-ready.json', JSON.stringify(ready, null, 2));
const invalidSettings = Object.keys(wf.settings || {}).filter((k) => !whitelist.has(k));
const report = [
  '# n8n workflow patch readiness report',
  '',
  '**Workflow ID:** TClXgmO8H8zsSwMb',
  `**Workflow name:** ${wf.name}`,
  '',
  '## Blocker',
  '',
  '- The live `mcp__n8n__patch_workflow_nodes` wrapper does not filter invalid `settings` fields before PUT.',
  `- Workflow \'settings\' contains fields rejected by n8n OpenAPI: ${invalidSettings.join(', ') || 'none'}.`,
  '- This makes a cosmetic edit fail with HTTP 400 unless the payload is filtered.',
  '- Local `n8n-patch` CLI does filter these fields, but direct egress to the live n8n host is blocked from this sandbox.',
  '',
  '## Prepared artifacts',
  '',
  `- Backup of current local workflow JSON: ${backup}`,
  '- Filtered PUT-ready body: TClXgmO8H8zsSwMb-put-ready.json',
  '',
  '## Notes on credentials',
  '',
  '- Current workflow includes an OpenAI credential reference in the node `OpenAI Chat Model`.',
  '- There is no Postgres node in this workflow file, so no Postgres credential binding was inserted.',
  '- Credential association is a separate n8n surface; updating credentials via PUT is not reliably supported if the binding changes.',
  '',
  '## Next step',
  '',
  'Use the prepared `TClXgmO8H8zsSwMb-put-ready.json` in an environment with network access to the n8n host, or through a dedicated MCP wrapper that filters settings before PUT.',
];
writeFileSync('TClXgmO8H8zsSwMb-report.md', report.join('\n'));
console.log('prepared artifact and report', backup);