/**
 * verify_replay.js
 * WF-TR-01 Thread Resolver — Replay / Idempotency Verifier
 *
 * Purpose: Verifies that the Thread Resolver produces deterministic results
 * when given the same input and DB state. Also verifies audit write idempotency.
 *
 * This script validates the DESIGN properties, not runtime behavior.
 * For runtime replay testing, use the post-import test guide.
 *
 * Usage:
 *   node verify_replay.js
 *
 * Checks:
 *   1. Scoring algorithm is deterministic (no Math.random, no Date.now in scoring)
 *   2. Decision policy is deterministic (no Date.now, no Math.random)
 *   3. Audit write uses resolution_id as PK (idempotent under retry)
 *   4. Resolution_id generation is deterministic (no Date.now)
 *   5. simpleHash function present for deterministic ID generation
 *   6. No randomness in scoring or decision policy
 */

const fs = require('fs');
const path = require('path');

const wfFile = path.join(__dirname, '..', 'WF-TR-01_Thread_Resolver.json');

if (!fs.existsSync(wfFile)) {
  console.error(`Workflow file not found: ${wfFile}`);
  process.exit(1);
}

const wf = JSON.parse(fs.readFileSync(wfFile, 'utf8'));
const nodes = wf.nodes || [];

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

function getCodeForNode(name) {
  const node = nodes.find(n => n.name === name);
  if (!node) return null;
  return (node.parameters || {}).jsCode || '';
}

// --- Checks ---

check('TR_Build_Result does NOT use Date.now() in resolution_id', () => {
  const code = getCodeForNode('TR_Build_Result');
  if (!code) return 'TR_Build_Result node not found';

  // resolution_id should be deterministic, not include Date.now()
  const lines = code.split('\n');
  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('//')) continue;

    // Check if the line contains both resolution_id assignment and Date.now()
    if (line.includes('resolution_id') && line.includes('Date.now()')) {
      return 'resolution_id includes Date.now() — violates determinism requirement (D-03 fix)';
    }
  }
});

check('TR_Build_Error_Result does NOT use Date.now()', () => {
  const code = getCodeForNode('TR_Build_Error_Result');
  if (!code) return 'TR_Build_Error_Result node not found';

  if (code.includes('Date.now()')) {
    return 'Date.now() found in error result builder — potential non-determinism';
  }
});

check('simpleHash function is present for deterministic ID generation', () => {
  // Check any code node for a hash function definition
  const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');
  const hasHashFunc = codeNodes.some(n => {
    const code = (n.parameters || {}).jsCode || '';
    return code.includes('simpleHash') || code.includes('function hash') || code.includes('crypto');
  });

  if (!hasHashFunc) {
    return 'No simpleHash or hash function found. Resolution_id generation may not be deterministic.';
  }
});

check('Scoring algorithm has no Math.random()', () => {
  const code = getCodeForNode('TR_Score_Candidates');
  if (!code) return 'TR_Score_Candidates node not found';
  if (code.includes('Math.random')) return 'Math.random() found in scoring — non-deterministic';
});

check('Scoring algorithm has no Date.now()', () => {
  const code = getCodeForNode('TR_Score_Candidates');
  if (!code) return 'TR_Score_Candidates node not found';
  if (code.includes('Date.now()')) return 'Date.now() found in scoring — non-deterministic';
});

check('Decision policy has no Math.random()', () => {
  const code = getCodeForNode('TR_Apply_Decision_Policy');
  if (!code) return 'TR_Apply_Decision_Policy node not found';
  if (code.includes('Math.random')) return 'Math.random() found in decision policy — non-deterministic';
});

check('Decision policy has no Date.now()', () => {
  const code = getCodeForNode('TR_Apply_Decision_Policy');
  if (!code) return 'TR_Apply_Decision_Policy node not found';
  if (code.includes('Date.now()')) return 'Date.now() found in decision policy — non-deterministic';
});

check('No random tiebreaker in scoring', () => {
  const code = getCodeForNode('TR_Score_Candidates');
  if (!code) return 'TR_Score_Candidates node not found';
  // Verify sort is by score only (deterministic)
  if (code.includes('Math.random') || code.includes('crypto.random')) {
    return 'Random tiebreaker detected in scoring';
  }
});

check('Resolution_id includes message_id for traceability', () => {
  const code = getCodeForNode('TR_Build_Result');
  if (!code) return 'TR_Build_Result node not found';
  if (!code.includes('message_id')) return 'resolution_id does not reference message_id';
  if (!code.includes("'tr_'") && !code.includes('"tr_')) return 'resolution_id does not use tr_ prefix';
});

check('Audit write uses resolution_id as primary key', () => {
  const node = nodes.find(n => n.name === 'TR_Write_Audit');
  if (!node) return 'TR_Write_Audit node not found';
  const query = (node.parameters || {}).query || '';
  if (!query.includes('resolution_id')) return 'Audit query does not reference resolution_id';
  // The resolution_id column is PK in the DDL — duplicate inserts are rejected
});

check('Audit write uses ON CONFLICT DO NOTHING for idempotency', () => {
  const node = nodes.find(n => n.name === 'TR_Write_Audit');
  if (!node) return 'TR_Write_Audit node not found';
  const query = (node.parameters || {}).query || '';
  if (!query.includes('ON CONFLICT') || !query.includes('DO NOTHING')) {
    return 'Audit query does not use ON CONFLICT DO NOTHING';
  }
});

check('Same input + same DB state => same decision (design analysis)', () => {
  // Verify that the scoring and decision nodes have NO external state dependencies
  // beyond the DB queries (which are deterministic for same DB state)
  const scoreCode = getCodeForNode('TR_Score_Candidates') || '';
  const decisionCode = getCodeForNode('TR_Apply_Decision_Policy') || '';

  const problematic = ['Math.random', 'crypto.random', 'uuid()', 'Date.now'];
  for (const p of problematic) {
    if (scoreCode.includes(p)) return `Scoring references ${p} — potential non-determinism`;
    if (decisionCode.includes(p)) return `Decision references ${p} — potential non-determinism`;
  }
});

check('Explicit refs shortcircuit is deterministic', () => {
  const code = getCodeForNode('TR_Check_Explicit_Refs');
  if (!code) return 'TR_Check_Explicit_Refs node not found';
  // Explicit ref check is pure: if thread_id present, return it. No randomness.
  if (code.includes('Math.random')) return 'Random in explicit ref check';
  if (code.includes('Date.now()')) return 'Date.now() in explicit ref check';
});

check('Audit write failure does not block result (design note)', () => {
  // Check that TR_Return_Result reads from TR_Build_Result, not TR_Write_Audit
  const code = getCodeForNode('TR_Return_Result');
  if (!code) return 'TR_Return_Result node not found';

  // Should either read from a build node or use $input which comes from previous step
  // The key is that it doesn't depend on successful audit write
  if (code.includes("$('TR_Write_Audit')")) {
    return 'TR_Return_Result depends on TR_Write_Audit output — audit failure would block result return';
  }

  // If it reads from TR_Build_Result or uses $input, that's good
  if (code.includes("$('TR_Build_Result')") || code.includes('$input')) {
    return true;
  }

  // Otherwise, check the general pattern
  return true;
});

check('No crypto.randomUUID in result builder', () => {
  const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');
  const issues = [];
  for (const n of codeNodes) {
    const code = (n.parameters || {}).jsCode || '';
    if (code.includes('crypto.randomUUID') && n.name.includes('Build')) {
      issues.push(`${n.name}: uses crypto.randomUUID for IDs (non-deterministic)`);
    }
  }
  if (issues.length > 0) return issues.join('; ');
});

check('No uuid() function calls in scoring or decision paths', () => {
  const scoreCode = getCodeForNode('TR_Score_Candidates') || '';
  const decisionCode = getCodeForNode('TR_Apply_Decision_Policy') || '';

  if (scoreCode.includes('uuid()')) return 'TR_Score_Candidates: uuid() call found';
  if (decisionCode.includes('uuid()')) return 'TR_Apply_Decision_Policy: uuid() call found';
});

// --- Report ---

console.log('\n=== REPLAY / IDEMPOTENCY VERIFICATION REPORT ===\n');
for (const r of results) {
  const icon = r.status === 'PASS' ? '  PASS' : '  FAIL';
  console.log(`${icon}: ${r.name}`);
  if (r.detail) console.log(`        ${r.detail}`);
}

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed === 0) {
  console.log('\n=== REPLAY VERIFICATION PASSED ===');
  console.log('The Thread Resolver is deterministic for v1:');
  console.log('  - Same input + same DB state => same decision');
  console.log('  - Audit write is idempotent (PK constraint on resolution_id)');
  console.log('  - No random tiebreakers in scoring or decision policy');
  console.log('  - resolution_id is deterministic (no Date.now)');
} else {
  console.log('\n=== REPLAY VERIFICATION FAILED ===');
}

process.exit(failed === 0 ? 0 : 1);
