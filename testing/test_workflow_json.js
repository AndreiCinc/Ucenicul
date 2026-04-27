#!/usr/bin/env node

/**
 * N8N WORKFLOW JSON VALIDATOR
 * Validates brain_main_inbound_mvp_v3_memory_write.json BEFORE import.
 *
 * 9 structural checks — no API, no DB, no n8n needed.
 *
 * USAGE: node testing/test_workflow_json.js
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_PATH = path.join(__dirname, '../workflows/brain_main_inbound_mvp_v3_memory_write.json');

let passed = 0;
let failed = 0;
let warnings = 0;
const errors = [];
const warns = [];

function pass(check, detail) {
  passed++;
  console.log(`  ✅ ${check}${detail ? ' — ' + detail : ''}`);
}

function fail(check, detail) {
  failed++;
  const msg = `${check} — ${detail}`;
  errors.push(msg);
  console.log(`  ❌ ${check} — ${detail}`);
}

function warn(check, detail) {
  warnings++;
  warns.push(`${check} — ${detail}`);
  console.log(`  ⚠️  ${check} — ${detail}`);
}

// ============================================================================
// LOAD WORKFLOW
// ============================================================================

console.log('\n🔍 N8N WORKFLOW JSON VALIDATOR');
console.log('='.repeat(60));

let wf;
try {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  wf = JSON.parse(raw);
  pass('CHECK 0: Valid JSON', `${raw.length} bytes parsed OK`);
} catch (e) {
  fail('CHECK 0: Valid JSON', e.message);
  console.log('\n💀 Cannot continue — JSON is invalid.');
  process.exit(1);
}

const nodes = wf.nodes || [];
const connections = wf.connections || {};
const nodeNames = new Set(nodes.map(n => n.name));
const nodeIds = nodes.map(n => n.id);
const nonStickyNodes = nodes.filter(n => !n.type.includes('stickyNote'));

console.log(`\n📊 Workflow: "${wf.name}" — ${nodes.length} nodes, ${Object.keys(connections).length} connection sources\n`);

// ============================================================================
// CHECK 1: Unique node names
// ============================================================================

console.log('--- CHECK 1: Unique Node Names ---');
const nameCount = {};
nodes.forEach(n => { nameCount[n.name] = (nameCount[n.name] || 0) + 1; });
const dupeNames = Object.entries(nameCount).filter(([_, c]) => c > 1);
if (dupeNames.length === 0) {
  pass('No duplicate node names', `${nodes.length} nodes, all unique`);
} else {
  dupeNames.forEach(([name, count]) => {
    fail('Duplicate node name', `"${name}" appears ${count} times`);
  });
}

// ============================================================================
// CHECK 2: Unique node IDs
// ============================================================================

console.log('\n--- CHECK 2: Unique Node IDs ---');
const idCount = {};
nodeIds.forEach(id => { idCount[id] = (idCount[id] || 0) + 1; });
const dupeIds = Object.entries(idCount).filter(([_, c]) => c > 1);
if (dupeIds.length === 0) {
  pass('No duplicate node IDs', `${nodeIds.length} IDs, all unique`);
} else {
  dupeIds.forEach(([id, count]) => {
    fail('Duplicate node ID', `"${id}" appears ${count} times`);
  });
}

// ============================================================================
// CHECK 3: Connection integrity — all referenced nodes exist
// ============================================================================

console.log('\n--- CHECK 3: Connection Integrity ---');
let connOk = 0;
let connBad = 0;

for (const [srcName, outputs] of Object.entries(connections)) {
  if (!nodeNames.has(srcName)) {
    fail('Orphan connection source', `"${srcName}" not found in nodes`);
    connBad++;
    continue;
  }
  if (outputs.main) {
    outputs.main.forEach((targets, idx) => {
      targets.forEach(t => {
        if (!nodeNames.has(t.node)) {
          fail('Orphan connection target', `"${srcName}" [${idx}] -> "${t.node}" (not found)`);
          connBad++;
        } else {
          connOk++;
        }
      });
    });
  }
}

if (connBad === 0) {
  pass('All connections reference existing nodes', `${connOk} connections verified`);
} else {
  // already reported above
}

// ============================================================================
// CHECK 4: Code node JavaScript syntax
// ============================================================================

console.log('\n--- CHECK 4: Code Node JS Syntax ---');
const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');
let jsOk = 0;
let jsBad = 0;

codeNodes.forEach(n => {
  const code = n.parameters?.jsCode || '';
  if (!code.trim()) {
    warn('Empty Code node', `"${n.name}" has no JavaScript`);
    return;
  }
  try {
    // Try to parse as a function body (n8n Code nodes run as module)
    new Function(code);
    jsOk++;
  } catch (e) {
    // n8n Code nodes can use $input, $json etc which aren't defined
    // Try to check if it's a real syntax error vs undefined var
    const msg = e.message;
    if (msg.includes('Unexpected token') || msg.includes('Unexpected end') ||
        msg.includes('Invalid or unexpected') || msg.includes('missing )') ||
        msg.includes('Unterminated string') || msg.includes('Invalid regular expression')) {
      fail('JS syntax error', `"${n.name}": ${msg}`);
      jsBad++;
    } else {
      // Reference errors are OK — they mean valid syntax but undefined n8n globals
      jsOk++;
    }
  }
});

if (jsBad === 0) {
  pass('All Code nodes have valid JS syntax', `${jsOk}/${codeNodes.length} verified`);
}

// ============================================================================
// CHECK 5: Cross-node $('NodeName') references
// ============================================================================

console.log('\n--- CHECK 5: Cross-Node References ---');
let refOk = 0;
let refBad = 0;

function findNodeRefs(obj) {
  const refs = new Set();
  const str = JSON.stringify(obj);
  const matches = str.matchAll(/\$\(['"]([^'"]+)['"]\)/g);
  for (const m of matches) {
    refs.add(m[1]);
  }
  return refs;
}

nonStickyNodes.forEach(n => {
  const refs = findNodeRefs(n.parameters || {});
  refs.forEach(refName => {
    if (!nodeNames.has(refName)) {
      fail('Broken $() reference', `"${n.name}" references "$('${refName}')" — node not found`);
      refBad++;
    } else {
      refOk++;
    }
  });
});

if (refBad === 0) {
  pass('All $() references point to existing nodes', `${refOk} references verified`);
}

// ============================================================================
// CHECK 6: Merge nodes input count (connection-based)
// ============================================================================

console.log('\n--- CHECK 6: Merge/Context Restore Nodes ---');
// In this workflow, "Merge" nodes are Code nodes that restore context.
// They should have exactly 1 incoming connection each (from the DB/API node).
const mergeNodes = nodes.filter(n => n.name.startsWith('Merge'));
let mergeOk = 0;

mergeNodes.forEach(mn => {
  // Count incoming connections to this node
  let inCount = 0;
  for (const [srcName, outputs] of Object.entries(connections)) {
    if (outputs.main) {
      outputs.main.forEach(targets => {
        targets.forEach(t => {
          if (t.node === mn.name) inCount++;
        });
      });
    }
  }
  if (inCount === 0) {
    fail('Merge node with 0 inputs', `"${mn.name}" has no incoming connections`);
  } else {
    mergeOk++;
  }
});

if (mergeOk === mergeNodes.length) {
  pass('All Merge nodes have incoming connections', `${mergeOk}/${mergeNodes.length}`);
}

// ============================================================================
// CHECK 7: Switch node output coverage
// ============================================================================

console.log('\n--- CHECK 7: Switch Output Coverage ---');
const switchNodes = nodes.filter(n => n.type === 'n8n-nodes-base.switch');

switchNodes.forEach(sn => {
  const ruleCount = sn.parameters?.rules?.values?.length || 0;
  // n8n switch: each rule = 1 output, + 1 fallback output at the end
  const expectedOutputs = ruleCount + 1; // rules + fallback

  const actualConns = connections[sn.name]?.main || [];
  const connectedOutputs = actualConns.filter(targets => targets.length > 0).length;

  // Check that each rule output has at least one connection
  const disconnected = [];
  for (let i = 0; i < expectedOutputs; i++) {
    const targets = actualConns[i] || [];
    if (targets.length === 0) {
      // For Route by Intent, output 14 is fallback
      const label = sn.parameters?.rules?.values?.[i]?.outputKey || `output_${i}`;
      disconnected.push(i === ruleCount ? 'fallback' : label);
    }
  }

  if (disconnected.length === 0) {
    pass(`Switch "${sn.name}"`, `${connectedOutputs}/${expectedOutputs} outputs connected`);
  } else {
    // Some disconnected might be intentional (like extra fallback)
    disconnected.forEach(d => {
      warn(`Switch "${sn.name}" disconnected output`, `"${d}"`);
    });
  }
});

// ============================================================================
// CHECK 8: SQL $N placeholder matching
// ============================================================================

console.log('\n--- CHECK 8: SQL Placeholder Consistency ---');
const pgNodes = nodes.filter(n => n.type === 'n8n-nodes-base.postgres');
let sqlOk = 0;
let sqlBad = 0;

pgNodes.forEach(n => {
  const query = n.parameters?.query || '';
  if (!query.trim()) return;

  // Find highest $N placeholder in query
  const placeholders = query.match(/\$(\d+)/g) || [];
  const maxPlaceholder = placeholders.length > 0
    ? Math.max(...placeholders.map(p => parseInt(p.slice(1))))
    : 0;

  // Count query replacement values
  const replacementStr = n.parameters?.options?.queryReplacement || '';
  // n8n uses comma-separated expressions in queryReplacement
  const replacements = replacementStr ? replacementStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  const replacementCount = replacements.length;

  if (maxPlaceholder > 0 && replacementCount === 0) {
    fail('SQL placeholders without values', `"${n.name}": query has $1..$${maxPlaceholder} but no queryReplacement`);
    sqlBad++;
  } else if (maxPlaceholder > replacementCount) {
    fail('SQL placeholder mismatch', `"${n.name}": query uses $${maxPlaceholder} but only ${replacementCount} values provided`);
    sqlBad++;
  } else if (maxPlaceholder < replacementCount) {
    warn('Extra SQL replacement values', `"${n.name}": ${replacementCount} values but query only uses $1..$${maxPlaceholder}`);
  } else {
    sqlOk++;
  }
});

if (sqlBad === 0) {
  pass('All SQL placeholders have matching values', `${sqlOk}/${pgNodes.length} PostgreSQL nodes verified`);
}

// ============================================================================
// CHECK 9: Credential consistency
// ============================================================================

console.log('\n--- CHECK 9: Credential Consistency ---');
const credMap = {}; // type -> Set of IDs
nodes.forEach(n => {
  if (n.credentials) {
    for (const [type, cred] of Object.entries(n.credentials)) {
      if (!credMap[type]) credMap[type] = new Set();
      credMap[type].add(cred.id);
    }
  }
});

let credOk = true;
for (const [type, ids] of Object.entries(credMap)) {
  if (ids.size > 1) {
    fail('Mixed credential IDs', `Type "${type}" uses ${ids.size} different IDs: ${[...ids].join(', ')}`);
    credOk = false;
  }
}

if (credOk) {
  const credSummary = Object.entries(credMap).map(([t, ids]) => `${t}(${[...ids][0].slice(0,8)}...)`).join(', ');
  pass('All credentials consistent per type', credSummary);
}

// ============================================================================
// BONUS CHECK: Disconnected nodes (no inputs AND no outputs, excluding triggers)
// ============================================================================

console.log('\n--- BONUS: Disconnected Node Detection ---');
const connectedNodes = new Set();

// Nodes that are connection sources
for (const srcName of Object.keys(connections)) {
  connectedNodes.add(srcName);
}

// Nodes that are connection targets
for (const [_, outputs] of Object.entries(connections)) {
  if (outputs.main) {
    outputs.main.forEach(targets => {
      targets.forEach(t => connectedNodes.add(t.node));
    });
  }
}

const disconnectedNodes = nonStickyNodes.filter(n => !connectedNodes.has(n.name));
if (disconnectedNodes.length === 0) {
  pass('No disconnected nodes', `${nonStickyNodes.length} functional nodes all connected`);
} else {
  disconnectedNodes.forEach(n => {
    warn('Disconnected node', `"${n.name}" (${n.type}) has no connections`);
  });
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`\n📋 RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

if (errors.length > 0) {
  console.log('❌ ERRORS (will break import/execution):');
  errors.forEach(e => console.log(`   - ${e}`));
  console.log('');
}

if (warns.length > 0) {
  console.log('⚠️  WARNINGS (review before import):');
  warns.forEach(w => console.log(`   - ${w}`));
  console.log('');
}

if (failed === 0) {
  console.log('🟢 READY FOR IMPORT — all structural checks passed.\n');
} else {
  console.log('🔴 DO NOT IMPORT — fix errors first.\n');
}

process.exit(failed > 0 ? 1 : 0);
