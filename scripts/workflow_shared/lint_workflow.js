/**
 * lint_workflow.js
 * WF-TR-01 Thread Resolver — Static Workflow Linter
 *
 * Purpose: Validates the n8n workflow JSON structure against architectural rules.
 * Checks: node count, connection validity, reachability, query parameterization,
 * code node presence, forbidden patterns, naming conventions, contract compliance,
 * alwaysOutputData on postgres nodes, and cross-node references.
 *
 * Usage:
 *   node lint_workflow.js <workflow_json_file>
 *   node lint_workflow.js   (defaults to ../WF-TR-01_Thread_Resolver.json)
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = one or more checks failed
 */

const fs = require('fs');
const path = require('path');

const defaultFile = path.join(__dirname, '..', 'WF-TR-01_Thread_Resolver.json');
const file = process.argv[2] || defaultFile;

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
const nodes = wf.nodes || [];
const connections = wf.connections || {};

let passed = 0;
let failed = 0;
const results = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      passed++;
      results.push({ name, status: 'PASS' });
    } else {
      failed++;
      results.push({ name, status: 'FAIL', detail: result });
    }
  } catch (e) {
    failed++;
    results.push({ name, status: 'FAIL', detail: e.message });
  }
}

// --- Checks ---

check('JSON has name field', () => {
  if (!wf.name) return 'Missing workflow name';
});

check('JSON has nodes array', () => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 'No nodes found';
});

check('Workflow has exactly 19 nodes', () => {
  if (nodes.length !== 19) return `Expected 19 nodes, got ${nodes.length}`;
});

check('JSON has connections object', () => {
  if (typeof connections !== 'object') return 'No connections found';
});

check('All node IDs are unique', () => {
  const ids = nodes.map(n => n.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) return `Duplicate IDs: ${dupes.join(', ')}`;
});

check('All node names are unique', () => {
  const names = nodes.map(n => n.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) return `Duplicate names: ${dupes.join(', ')}`;
});

check('All connection sources exist as nodes', () => {
  const nameSet = new Set(nodes.map(n => n.name));
  const missing = Object.keys(connections).filter(n => !nameSet.has(n));
  if (missing.length > 0) return `Missing source nodes: ${missing.join(', ')}`;
});

check('All connection targets exist as nodes', () => {
  const nameSet = new Set(nodes.map(n => n.name));
  const missing = [];
  for (const [src, conn] of Object.entries(connections)) {
    for (const outputs of (conn.main || [])) {
      for (const link of outputs) {
        if (!nameSet.has(link.node)) missing.push(`${src} -> ${link.node}`);
      }
    }
  }
  if (missing.length > 0) return `Missing target nodes: ${missing.join(', ')}`;
});

check('All nodes reachable from trigger', () => {
  const nameSet = new Set(nodes.map(n => n.name));
  const adj = {};
  for (const [src, conn] of Object.entries(connections)) {
    adj[src] = adj[src] || [];
    for (const outputs of (conn.main || [])) {
      for (const link of outputs) adj[src].push(link.node);
    }
  }
  const visited = new Set();
  const queue = ['TR_Trigger'];
  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of (adj[node] || [])) queue.push(neighbor);
  }
  const unreachable = [...nameSet].filter(n => !visited.has(n));
  if (unreachable.length > 0) return `Unreachable nodes: ${unreachable.join(', ')}`;
});

check('No circular connections (simple cycle check)', () => {
  const adj = {};
  for (const [src, conn] of Object.entries(connections)) {
    adj[src] = [];
    for (const outputs of (conn.main || [])) {
      for (const link of outputs) adj[src].push(link.node);
    }
  }
  // Simple DFS cycle detection
  const visited = new Set();
  const inStack = new Set();
  function dfs(node) {
    if (inStack.has(node)) return true; // cycle
    if (visited.has(node)) return false;
    visited.add(node);
    inStack.add(node);
    for (const neighbor of (adj[node] || [])) {
      if (dfs(neighbor)) return true;
    }
    inStack.delete(node);
    return false;
  }
  for (const node of Object.keys(adj)) {
    if (dfs(node)) return `Cycle detected involving ${node}`;
  }
});

check('All postgres nodes have parameterized queries', () => {
  const pgNodes = nodes.filter(n => n.type.includes('postgres'));
  const issues = [];
  for (const n of pgNodes) {
    const query = (n.parameters || {}).query || '';
    if (!query.includes('$')) {
      issues.push(`${n.name}: no $ parameters found in query`);
    }
  }
  if (issues.length > 0) return issues.join('; ');
});

check('All postgres nodes have alwaysOutputData: true', () => {
  const pgNodes = nodes.filter(n => n.type.includes('postgres'));
  const issues = [];
  for (const n of pgNodes) {
    const opts = ((n.parameters || {}).options) || {};
    const alwaysOutput = opts.alwaysOutputData === true || (n.parameters || {}).alwaysOutputData === true;
    if (!alwaysOutput) {
      issues.push(`${n.name}: missing or false alwaysOutputData`);
    }
  }
  if (issues.length > 0) return issues.join('; ');
});

check('No raw string concatenation in postgres queries', () => {
  const pgNodes = nodes.filter(n => n.type.includes('postgres'));
  const issues = [];
  for (const n of pgNodes) {
    const query = (n.parameters || {}).query || '';
    // Check for dangerous patterns
    if (query.includes("' +") || query.includes("+ '") || query.includes('`${')) {
      issues.push(`${n.name}: possible raw string concatenation in query`);
    }
  }
  if (issues.length > 0) return issues.join('; ');
});

check('All code nodes have jsCode', () => {
  const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');
  const missing = codeNodes.filter(n => !(n.parameters || {}).jsCode);
  if (missing.length > 0) return `Missing jsCode: ${missing.map(n => n.name).join(', ')}`;
});

check('No code node references raw_content', () => {
  const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');
  const issues = [];
  for (const n of codeNodes) {
    const code = (n.parameters || {}).jsCode || '';
    // Check for raw_content consumption (not just mentioning it in comments or validation)
    const lines = code.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('//')) continue; // skip comments
      if (line.includes('raw_content') && !line.includes('FORBIDDEN') && !line.includes('forbidden') && !line.includes("'raw_content'")) {
        // Allow string literals mentioning raw_content for validation purposes
        if (line.includes('req.raw_content') || line.includes('.raw_content')) {
          issues.push(`${n.name}: references raw_content in code`);
        }
      }
    }
  }
  if (issues.length > 0) return issues.join('; ');
});

check('Trigger node is executeWorkflowTrigger', () => {
  const trigger = nodes.find(n => n.name === 'TR_Trigger');
  if (!trigger) return 'TR_Trigger node not found';
  if (trigger.type !== 'n8n-nodes-base.executeWorkflowTrigger') {
    return `TR_Trigger type is ${trigger.type}, expected executeWorkflowTrigger`;
  }
});

check('Node naming follows TR_ prefix convention', () => {
  const bad = nodes.filter(n => !n.name.startsWith('TR_'));
  if (bad.length > 0) return `Non-prefixed nodes: ${bad.map(n => n.name).join(', ')}`;
});

check('All switch nodes have at least 2 outputs', () => {
  const switchNodes = nodes.filter(n => n.type.includes('switch'));
  const issues = [];
  for (const n of switchNodes) {
    const rules = ((n.parameters || {}).rules || {}).rules || [];
    if (rules.length < 2) issues.push(`${n.name}: only ${rules.length} rules`);
  }
  if (issues.length > 0) return issues.join('; ');
});

check('All $("nodeName") cross-references match existing node names', () => {
  const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');
  const nodeNames = new Set(nodes.map(n => n.name));
  const issues = [];

  for (const n of codeNodes) {
    const code = (n.parameters || {}).jsCode || '';
    // Find all $('...') references
    const refRegex = /\$\('([^']+)'\)/g;
    let match;
    while ((match = refRegex.exec(code)) !== null) {
      const refName = match[1];
      if (!nodeNames.has(refName)) {
        issues.push(`${n.name}: references non-existent node '${refName}'`);
      }
    }
  }

  if (issues.length > 0) return issues.join('; ');
});

check('resolution_id generation does NOT use Date.now()', () => {
  const buildResultNode = nodes.find(n => n.name === 'TR_Build_Result');
  if (!buildResultNode) return 'TR_Build_Result node not found';

  const code = (buildResultNode.parameters || {}).jsCode || '';

  // Check that Date.now() is NOT used in resolution_id construction (skip comments)
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue; // skip comment lines
    if (line.includes('resolution_id') && line.includes('Date.now()')) {
      return 'TR_Build_Result: resolution_id includes Date.now() (non-deterministic)';
    }
  }
});

check('Error path writes audit record (error → audit → return)', () => {
  // Verify that TR_Build_Error_Result connects through TR_Write_Error_Audit (or TR_Write_Audit)
  // before TR_Return_Error

  const errorBuildNode = nodes.find(n => n.name === 'TR_Build_Error_Result');
  if (!errorBuildNode) return 'TR_Build_Error_Result node not found';

  const errorReturnNode = nodes.find(n => n.name === 'TR_Return_Error');
  if (!errorReturnNode) return 'TR_Return_Error node not found';

  // Get connections FROM TR_Build_Error_Result
  const errorConnections = connections['TR_Build_Error_Result'] || {};
  const errorTargets = [];
  for (const outputs of (errorConnections.main || [])) {
    for (const link of outputs) {
      errorTargets.push(link.node);
    }
  }

  // Check that error path goes through an audit node
  const hasAuditInPath = errorTargets.some(target =>
    target === 'TR_Write_Audit' ||
    target === 'TR_Write_Error_Audit' ||
    target.includes('Write_Audit')
  );

  if (!hasAuditInPath) {
    return 'Error path does not write audit record. TR_Build_Error_Result must connect to audit node.';
  }
});

check('Workflow has tags', () => {
  if (!wf.tags || wf.tags.length === 0) return 'No tags found';
});

check('Settings has executionOrder', () => {
  if (!wf.settings || !wf.settings.executionOrder) return 'Missing executionOrder in settings';
});

// Drift watchdog checks
check('DRIFT: No intent classification node exists', () => {
  const intentNodes = nodes.filter(n =>
    n.name.toLowerCase().includes('intent') ||
    n.name.toLowerCase().includes('brain') ||
    n.name.toLowerCase().includes('classify')
  );
  if (intentNodes.length > 0) return `Legacy intent nodes found: ${intentNodes.map(n => n.name).join(', ')}`;
});

check('DRIFT: No route-by-switch on intent', () => {
  const switchNodes = nodes.filter(n => n.type.includes('switch'));
  for (const n of switchNodes) {
    const code = JSON.stringify(n.parameters || {});
    if (code.includes('intent')) return `${n.name}: switch references intent`;
  }
});

// --- Report ---

console.log('\n=== STATIC WORKFLOW LINT REPORT ===\n');
for (const r of results) {
  const icon = r.status === 'PASS' ? '  PASS' : '  FAIL';
  console.log(`${icon}: ${r.name}`);
  if (r.detail) console.log(`        ${r.detail}`);
}
console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(failed === 0 ? '\n=== ALL CHECKS PASSED ===' : '\n=== SOME CHECKS FAILED ===');
process.exit(failed === 0 ? 0 : 1);
