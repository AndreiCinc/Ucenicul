/**
 * Test runner for the CONTRACT-GENERATED parser (parse_contract_generated.js)
 * Validates that the auto-generated parser passes all tests identical to the manual one.
 *
 * USAGE: node test_generated_parser.js [suite_name_or_test_id]
 */

const fs = require('fs');
const path = require('path');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test_context.json'), 'utf8'));

// Read the generated parser and transform it into a testable function
function buildParserFromGenerated() {
  let code = fs.readFileSync(path.join(__dirname, '../parse_contract_generated.js'), 'utf8');

  // Remove the n8n-specific lines and wrap in a function
  // Remove: const httpResponse = $input.first().json;
  // Remove: const ctx = $('Build Brain Input').first().json;
  // Remove: return [{ json: { ... } }];  → replace with return decision;

  // Strip the first two lines (n8n bindings)
  const lines = code.split('\n');
  const filtered = lines.filter(line =>
    !line.includes("$input.first().json") &&
    !line.includes("$('Build Brain Input')")
  );

  // Replace the return envelope with just returning decision
  let body = filtered.join('\n');

  // Remove the return [{ json: { ... } }] block — replace with return decision
  body = body.replace(
    /return \[\{\s*json: \{[\s\S]*?decision: decision\s*\}\s*\}\];/,
    'return decision;'
  );

  const wrapped = `(function(httpResponse, ctx) {\n${body}\n})`;
  return eval(wrapped);
}

let parser;
try {
  parser = buildParserFromGenerated();
} catch (e) {
  console.error('FATAL: Cannot build generated parser:', e.message);
  process.exit(1);
}

// === Reuse the same test runner logic from test_parser.js ===

function runTest(testCase) {
  const ctx = { ...fixture, raw_user_message: testCase.input };
  let httpResponse;
  if (testCase.llm_response_raw !== undefined) {
    httpResponse = testCase.llm_response_raw;
  } else {
    httpResponse = { choices: [{ message: { content: JSON.stringify(testCase.llm_response) } }] };
  }

  try {
    const decision = parser(httpResponse, ctx);
    const checks = [];

    if (testCase.expected.intent) checks.push({ field: 'intent', expected: testCase.expected.intent, actual: decision.intent, pass: decision.intent === testCase.expected.intent });
    if (testCase.expected.domain) checks.push({ field: 'domain', expected: testCase.expected.domain, actual: decision.domain, pass: decision.domain === testCase.expected.domain });
    if (testCase.expected.filter_scope) { const s = decision.task_action?.filter_scope || decision.reminder_action?.filter_scope || null; checks.push({ field: 'filter_scope', expected: testCase.expected.filter_scope, actual: s, pass: s === testCase.expected.filter_scope }); }
    if (testCase.expected.has_task_action !== undefined) { const h = decision.task_action !== null; checks.push({ field: 'has_task_action', expected: testCase.expected.has_task_action, actual: h, pass: h === testCase.expected.has_task_action }); }
    if (testCase.expected.has_reminder_action !== undefined) { const h = decision.reminder_action !== null; checks.push({ field: 'has_reminder_action', expected: testCase.expected.has_reminder_action, actual: h, pass: h === testCase.expected.has_reminder_action }); }
    if (testCase.expected.has_improvement_request !== undefined) { const h = decision.improvement_request !== null; checks.push({ field: 'has_improvement_request', expected: testCase.expected.has_improvement_request, actual: h, pass: h === testCase.expected.has_improvement_request }); }
    if (testCase.expected.has_memory_action !== undefined) { const h = decision.memory_action !== null && decision.memory_action.query !== ''; checks.push({ field: 'has_memory_action', expected: testCase.expected.has_memory_action, actual: h, pass: h === testCase.expected.has_memory_action }); }
    if (testCase.expected.no_forbidden_fields) { const bad = decision.task !== undefined || decision.reminder !== undefined || decision.memory_candidate !== undefined || decision.response_text !== undefined || decision.confidence !== undefined; checks.push({ field: 'no_forbidden_fields', expected: true, actual: !bad, pass: !bad }); }
    if (testCase.expected.requires_clarification !== undefined) checks.push({ field: 'requires_clarification', expected: testCase.expected.requires_clarification, actual: decision.requires_clarification, pass: decision.requires_clarification === testCase.expected.requires_clarification });
    if (testCase.expected.debug_contains) { const h = (decision.debug_summary || '').includes(testCase.expected.debug_contains); checks.push({ field: 'debug_contains', expected: testCase.expected.debug_contains, actual: decision.debug_summary, pass: h }); }
    if (testCase.expected.task_has_title !== undefined) { const h = decision.task_action?.title != null && decision.task_action.title !== ''; checks.push({ field: 'task_has_title', expected: testCase.expected.task_has_title, actual: h, pass: h === testCase.expected.task_has_title }); }
    if (testCase.expected.task_title) { const t = decision.task_action?.title || null; checks.push({ field: 'task_title', expected: testCase.expected.task_title, actual: t, pass: t === testCase.expected.task_title }); }
    if (testCase.expected.task_priority) { const p = decision.task_action?.priority || null; checks.push({ field: 'task_priority', expected: testCase.expected.task_priority, actual: p, pass: p === testCase.expected.task_priority }); }
    if (testCase.expected.task_due_type) { const d = decision.task_action?.due_type || null; checks.push({ field: 'task_due_type', expected: testCase.expected.task_due_type, actual: d, pass: d === testCase.expected.task_due_type }); }
    if (testCase.expected.task_due_at_null !== undefined) { const n = decision.task_action?.due_at === null; checks.push({ field: 'task_due_at_null', expected: testCase.expected.task_due_at_null, actual: n, pass: n === testCase.expected.task_due_at_null }); }
    if (testCase.expected.reminder_has_title !== undefined) { const h = decision.reminder_action?.title != null && decision.reminder_action.title !== ''; checks.push({ field: 'reminder_has_title', expected: testCase.expected.reminder_has_title, actual: h, pass: h === testCase.expected.reminder_has_title }); }
    if (testCase.expected.reminder_has_remind_at !== undefined) { const h = decision.reminder_action?.remind_at != null; checks.push({ field: 'reminder_has_remind_at', expected: testCase.expected.reminder_has_remind_at, actual: h, pass: h === testCase.expected.reminder_has_remind_at }); }
    if (testCase.expected.has_memory_writes !== undefined) { const h = Array.isArray(decision.memory_writes) && decision.memory_writes.length > 0; checks.push({ field: 'has_memory_writes', expected: testCase.expected.has_memory_writes, actual: h, pass: h === testCase.expected.has_memory_writes }); }
    if (testCase.expected.memory_writes_empty !== undefined) { const e = !Array.isArray(decision.memory_writes) || decision.memory_writes.length === 0; checks.push({ field: 'memory_writes_empty', expected: testCase.expected.memory_writes_empty, actual: e, pass: e === testCase.expected.memory_writes_empty }); }
    if (testCase.expected.has_fallback_rules !== undefined) { const h = Array.isArray(decision.task_fallback_rules) && decision.task_fallback_rules.length > 0; checks.push({ field: 'has_fallback_rules', expected: testCase.expected.has_fallback_rules, actual: h, pass: h === testCase.expected.has_fallback_rules }); }
    if (testCase.expected.fallback_rules_empty !== undefined) { const e = !Array.isArray(decision.task_fallback_rules) || decision.task_fallback_rules.length === 0; checks.push({ field: 'fallback_rules_empty', expected: testCase.expected.fallback_rules_empty, actual: e, pass: e === testCase.expected.fallback_rules_empty }); }

    const allPass = checks.every(c => c.pass);
    const status = allPass ? 'PASS' : checks.some(c => c.pass) ? 'PARTIAL' : 'FAIL';
    return { id: testCase.id, status, checks, decision };
  } catch (e) {
    return { id: testCase.id, status: 'ERROR', error: e.message, checks: [] };
  }
}

function runSuite(filter) {
  const suiteDir = path.join(__dirname, 'test_cases');
  const files = fs.readdirSync(suiteDir).filter(f => f.endsWith('.json')).sort();
  let totalPass = 0, totalPartial = 0, totalFail = 0, totalError = 0;
  const results = [];

  for (const file of files) {
    if (filter && !(/^[A-Z]+\d+$/i.test(filter)) && !file.includes(filter.toLowerCase())) continue;
    const suite = JSON.parse(fs.readFileSync(path.join(suiteDir, file), 'utf8'));
    for (const tc of suite.tests) {
      if (filter && /^[A-Z]+\d+$/i.test(filter) && tc.id !== filter.toUpperCase()) continue;
      const result = runTest(tc);
      results.push(result);
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : result.status === 'ERROR' ? '💥' : '❌';
      console.log(`${icon} ${result.id}: ${result.status}`);
      if (result.status !== 'PASS') {
        for (const c of (result.checks || []).filter(c => !c.pass)) {
          console.log(`   ${c.field}: expected=${JSON.stringify(c.expected)} actual=${JSON.stringify(c.actual)}`);
        }
        if (result.error) console.log(`   ERROR: ${result.error}`);
      }
      if (result.status === 'PASS') totalPass++;
      else if (result.status === 'PARTIAL') totalPartial++;
      else if (result.status === 'ERROR') totalError++;
      else totalFail++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`GENERATED PARSER — TOTAL: ${results.length} | ✅ ${totalPass} PASS | ⚠️ ${totalPartial} PARTIAL | ❌ ${totalFail} FAIL | 💥 ${totalError} ERROR`);
  console.log('='.repeat(60));
  return results;
}

const arg = process.argv[2] || null;
runSuite(arg);
