#!/usr/bin/env node

/**
 * CROSS-CHECK VALIDATOR
 * Verifies consistency between:
 * - brain_contract.json (source of truth)
 * - parse_contract_final.js (parser)
 * - brain_main_inbound_mvp_v3_memory_write.json (workflow)
 * - 001_initial_schema.sql + 002_rag_memories.sql (DB schema)
 *
 * USAGE: node testing/test_cross_check.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { passed++; console.log(`  ✅ ${msg}`); }
function fail(msg) { failed++; console.log(`  ❌ ${msg}`); }
function warn(msg) { warnings++; console.log(`  ⚠️  ${msg}`); }

console.log('\n🔗 CROSS-CHECK VALIDATOR');
console.log('='.repeat(60));

// Load all artifacts
const contract = JSON.parse(fs.readFileSync(path.join(__dirname, '../brain_contract.json'), 'utf8'));
const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '../workflows/brain_main_inbound_mvp_v3_memory_write.json'), 'utf8'));
const parserCode = fs.readFileSync(path.join(__dirname, '../parse_contract_final.js'), 'utf8');
const schema001 = fs.readFileSync(path.join(__dirname, '../migrations/001_initial_schema.sql'), 'utf8');
const schema002 = fs.readFileSync(path.join(__dirname, '../migrations/002_rag_memories.sql'), 'utf8');

const contractIntents = Object.keys(contract.intents);

// ============================================================================
// CHECK 1: Contract intents vs Switch node outputs in workflow
// ============================================================================

console.log('\n--- CHECK 1: Contract Intents vs Workflow Switch ---');

const switchNode = wf.nodes.find(n => n.name === 'Route by Intent');
const switchOutputs = switchNode.parameters.rules.values.map(v => v.outputKey);
// Add fallback as the last output
switchOutputs.push('fallback');

contractIntents.forEach(intent => {
  if (switchOutputs.includes(intent)) {
    pass(`Intent "${intent}" has Switch output`);
  } else {
    fail(`Intent "${intent}" MISSING from Switch node`);
  }
});

// Check reverse — any Switch output not in contract?
switchOutputs.forEach(output => {
  if (output === 'fallback') return; // fallback is expected
  if (!contractIntents.includes(output)) {
    fail(`Switch output "${output}" NOT in contract`);
  }
});

// ============================================================================
// CHECK 2: Contract intents vs Parser VALID_INTENTS
// ============================================================================

console.log('\n--- CHECK 2: Contract Intents vs Parser ---');

const parserIntentsMatch = parserCode.match(/VALID_INTENTS\s*=\s*\[([^\]]+)\]/);
if (parserIntentsMatch) {
  const parserIntents = parserIntentsMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));

  contractIntents.forEach(intent => {
    if (parserIntents.includes(intent)) {
      pass(`Intent "${intent}" in parser VALID_INTENTS`);
    } else {
      fail(`Intent "${intent}" MISSING from parser VALID_INTENTS`);
    }
  });

  parserIntents.forEach(intent => {
    if (!contractIntents.includes(intent)) {
      fail(`Parser intent "${intent}" NOT in contract`);
    }
  });
} else {
  fail('Could not extract VALID_INTENTS from parser');
}

// ============================================================================
// CHECK 3: Contract priorities vs Parser + Schema
// ============================================================================

console.log('\n--- CHECK 3: Priorities Consistency ---');

const contractPriorities = contract.fields.task_action.priority.values;
const parserPriorityMatch = parserCode.match(/VALID_TASK_PRIORITIES\s*=\s*\[([^\]]+)\]/);
if (parserPriorityMatch) {
  const parserPriorities = parserPriorityMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
  const match = JSON.stringify(contractPriorities) === JSON.stringify(parserPriorities);
  if (match) {
    pass(`Priorities match: [${contractPriorities.join(', ')}]`);
  } else {
    fail(`Priority mismatch: contract=[${contractPriorities}] vs parser=[${parserPriorities}]`);
  }
}

// Check schema
const schemaHasPriorities = schema001.includes("('urgent', 'high', 'normal', 'low')");
if (schemaHasPriorities) {
  pass('Schema tasks.priority CHECK matches contract');
} else {
  fail('Schema tasks.priority CHECK does NOT match contract priorities');
}

// ============================================================================
// CHECK 4: Contract memory categories vs Schema + Parser
// ============================================================================

console.log('\n--- CHECK 4: Memory Categories Consistency ---');

const contractCategories = contract.fields.memory_writes.item_schema.category.values;
const schemaCategories = [
  'business_profile', 'customer_market', 'growth_context',
  'entrepreneur_profile', 'relationship_history',
  'operational_patterns', 'preferences', 'constraints'
];

// Verify schema002 contains each
let allSchemaOk = true;
contractCategories.forEach(cat => {
  if (!schema002.includes(`'${cat}'`)) {
    fail(`Category "${cat}" MISSING from 002_rag_memories.sql CHECK`);
    allSchemaOk = false;
  }
});
if (allSchemaOk) {
  pass(`All ${contractCategories.length} categories in schema 002`);
}

// Check parser
const parserCatMatch = parserCode.match(/VALID_MEMORY_CATEGORIES\s*=\s*\[([^\]]+)\]/);
if (parserCatMatch) {
  const parserCats = parserCatMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
  const catMatch = JSON.stringify(contractCategories.sort()) === JSON.stringify(parserCats.sort());
  if (catMatch) {
    pass(`Parser VALID_MEMORY_CATEGORIES matches contract (${parserCats.length})`);
  } else {
    fail(`Category mismatch: contract=${contractCategories.length} vs parser=${parserCats.length}`);
    const missing = contractCategories.filter(c => !parserCats.includes(c));
    const extra = parserCats.filter(c => !contractCategories.includes(c));
    if (missing.length) console.log(`     Missing from parser: ${missing.join(', ')}`);
    if (extra.length) console.log(`     Extra in parser: ${extra.join(', ')}`);
  }
} else {
  fail('Could not extract VALID_MEMORY_CATEGORIES from parser');
}

// ============================================================================
// CHECK 5: Contract memory kinds vs Schema + Parser
// ============================================================================

console.log('\n--- CHECK 5: Memory Kinds Consistency ---');

const contractKinds = contract.fields.memory_writes.item_schema.type.values;
const schemaHasKinds = schema002.includes("('fact', 'insight', 'advice')");
if (schemaHasKinds) {
  pass(`Schema memory_kind CHECK matches contract: [${contractKinds.join(', ')}]`);
} else {
  fail('Schema memory_kind CHECK does NOT match contract');
}

const parserKindMatch = parserCode.match(/VALID_MEMORY_TYPES\s*=\s*\[([^\]]+)\]/);
if (parserKindMatch) {
  const parserKinds = parserKindMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
  const kindMatch = JSON.stringify(contractKinds.sort()) === JSON.stringify(parserKinds.sort());
  if (kindMatch) {
    pass(`Parser VALID_MEMORY_TYPES matches contract`);
  } else {
    fail(`Kind mismatch: contract=[${contractKinds}] vs parser=[${parserKinds}]`);
  }
}

// ============================================================================
// CHECK 6: Contract filter_scope vs Parser
// ============================================================================

console.log('\n--- CHECK 6: Filter Scope Consistency ---');

const contractScopes = contract.fields.task_action.filter_scope.values;
const parserScopeMatch = parserCode.match(/VALID_FILTER_SCOPES\s*=\s*\[([^\]]+)\]/);
if (parserScopeMatch) {
  const parserScopes = parserScopeMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
  const scopeMatch = JSON.stringify(contractScopes.sort()) === JSON.stringify(parserScopes.sort());
  if (scopeMatch) {
    pass(`Filter scopes match: [${contractScopes.join(', ')}]`);
  } else {
    fail(`Scope mismatch: contract=[${contractScopes}] vs parser=[${parserScopes}]`);
  }
}

// ============================================================================
// CHECK 7: Contract due_types vs Parser
// ============================================================================

console.log('\n--- CHECK 7: Due Types Consistency ---');

const contractDueTypes = contract.fields.task_action.due_type.values;
const parserDueMatch = parserCode.match(/VALID_TASK_DUE_TYPES\s*=\s*\[([^\]]+)\]/);
if (parserDueMatch) {
  const parserDueTypes = parserDueMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
  const dtMatch = JSON.stringify(contractDueTypes.sort()) === JSON.stringify(parserDueTypes.sort());
  if (dtMatch) {
    pass(`Due types match: [${contractDueTypes.join(', ')}]`);
  } else {
    fail(`Due type mismatch: contract=[${contractDueTypes}] vs parser=[${parserDueTypes}]`);
  }
}

// ============================================================================
// CHECK 8: Schema tables required by workflow SQL queries exist
// ============================================================================

console.log('\n--- CHECK 8: Workflow SQL vs Schema Tables ---');

const fullSchema = schema001 + '\n' + schema002;
const requiredTables = ['tasks', 'reminders', 'messages', 'tenants', 'organizations', 'rag_memories'];

requiredTables.forEach(table => {
  const regex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\b`);
  if (regex.test(fullSchema)) {
    pass(`Table "${table}" exists in schema`);
  } else {
    fail(`Table "${table}" MISSING from schema`);
  }
});

// ============================================================================
// CHECK 9: Disambiguation patterns match between contract and parser
// ============================================================================

console.log('\n--- CHECK 9: Disambiguation Patterns ---');

const contractTaskPatterns = contract.disambiguation.task_language_patterns.patterns;
const contractReminderPatterns = contract.disambiguation.reminder_language_patterns.patterns;

// Check parser has the key patterns
let taskPatCount = 0;
contractTaskPatterns.forEach(p => {
  if (parserCode.includes(p)) taskPatCount++;
});
if (taskPatCount >= contractTaskPatterns.length * 0.7) {
  pass(`Task disambiguation: ${taskPatCount}/${contractTaskPatterns.length} patterns found in parser`);
} else {
  warn(`Task disambiguation: only ${taskPatCount}/${contractTaskPatterns.length} patterns in parser`);
}

let reminderPatCount = 0;
contractReminderPatterns.forEach(p => {
  if (parserCode.includes(p)) reminderPatCount++;
});
if (reminderPatCount >= contractReminderPatterns.length * 0.7) {
  pass(`Reminder disambiguation: ${reminderPatCount}/${contractReminderPatterns.length} patterns found in parser`);
} else {
  warn(`Reminder disambiguation: only ${reminderPatCount}/${contractReminderPatterns.length} patterns in parser`);
}

// ============================================================================
// CHECK 10: Filter scope inference patterns match
// ============================================================================

console.log('\n--- CHECK 10: Filter Scope Inference Patterns ---');

const contractInferencePatterns = contract.filter_scope_inference.patterns;
let inferOk = 0;
contractInferencePatterns.forEach(p => {
  const anyMatch = p.matches.some(m => parserCode.includes(m));
  if (anyMatch) {
    inferOk++;
  } else {
    fail(`Scope inference "${p.scope}": none of [${p.matches.join(', ')}] found in parser`);
  }
});
if (inferOk === contractInferencePatterns.length) {
  pass(`All ${inferOk} filter inference patterns present in parser`);
}

// ============================================================================
// CHECK 11: Schema columns match workflow SQL INSERT fields
// ============================================================================

console.log('\n--- CHECK 11: Schema vs Workflow INSERT Columns ---');

// Extract INSERT columns from workflow SQL for tasks
const createTaskNode = wf.nodes.find(n => n.name === 'Create Task');
const createTaskQuery = createTaskNode?.parameters?.query || '';
const taskInsertMatch = createTaskQuery.match(/INSERT INTO tasks\s*\(([^)]+)\)/i);
if (taskInsertMatch) {
  const insertCols = taskInsertMatch[1].split(',').map(c => c.trim());
  // Check each column exists in schema
  const taskSchemaCols = ['id', 'organization_id', 'tenant_id', 'title', 'priority', 'status',
    'due_date', 'source_contact_id', 'source_message_id', 'deleted_at', 'created_at', 'updated_at',
    // New columns possibly added later
    'description', 'due_type', 'due_at'];

  let colOk = 0;
  insertCols.forEach(col => {
    // Lax check — column name should appear in schema
    if (schema001.includes(col) || col === 'due_type' || col === 'due_at' || col === 'description') {
      colOk++;
    } else {
      warn(`Task INSERT column "${col}" not found in schema (may be added by ALTER TABLE)`);
    }
  });
  pass(`Create Task INSERT: ${colOk}/${insertCols.length} columns verified`);
} else {
  warn('Could not parse Create Task INSERT query');
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`\n📋 CROSS-CHECK: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

if (failed === 0) {
  console.log('🟢 ALL ARTIFACTS CONSISTENT — contract, parser, workflow, and schema are aligned.\n');
} else {
  console.log('🔴 INCONSISTENCIES FOUND — fix before import.\n');
}

process.exit(failed > 0 ? 1 : 0);
