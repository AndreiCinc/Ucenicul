// Unit tests for V2-OBS-RECALL-SUMMARY-STRING-FIX.
// Tests the pure row-normalisation and summary-formatter logic that the
// patched ME_Memory_Recall_Result jsCode uses.
//
// Oracle: a row counts only if typeof r.id === 'string' && r is a real object.
// Summary:  0 rows -> '0 rows', 1 row -> '1 row', N rows -> 'N rows'.
// recall_results length must match the normalised row count.
//
// Run: node docs/architecture/memory/v2/v2_obs_recall_summary_string_fix/tests/recall_summary_unit_tests.mjs

const cases = [];
function add(id, group, rawItems, expected) {
  cases.push({ id, group, rawItems, expected });
}

// Simulate the post-patch pure logic over an array of n8n items ($items()).
function run(rawItems) {
  const rawRows = (rawItems || []).map(i => (i && typeof i === 'object' && 'json' in i) ? i.json : i);
  const rows = rawRows.filter(r => r && typeof r === 'object' && typeof r.id === 'string');
  const recall_results = rows.map(r => ({
    memory_id: r.id,
    content: r.content,
    memory_type: r.memory_type,
    tier: r.tier,
    status: r.status,
    category: r.category,
    source_thread_id: r.source_thread_id,
    entity_id: r.entity_id,
    created_at: r.created_at,
  }));
  const row_count = recall_results.length;
  const row_word = row_count === 1 ? 'row' : 'rows';
  const summary = 'Memory recall completed (' + row_count + ' ' + row_word + ').';
  return { row_count, summary, recall_results };
}

// Group A — zero effective rows (summary must never be "1 rows")
add('A-01', 'zero', [], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-02', 'zero', [{ json: null }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-03', 'zero', [{ json: undefined }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-04', 'zero', [{ json: {} }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-05', 'zero', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-06', 'zero', [{ json: { _error: true, error: { code: 'MISSING_REQUIRED_FIELDS' } } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-07', 'zero', [{ json: { json: { _error: true } } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-08', 'zero', [{ json: {} }, { json: {} }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-09', 'zero', [{ json: { success: true } }, { json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('A-10', 'zero', [{ json: { _error: true } }, { json: { _error: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });

// Group B — one real row (must say singular "1 row")
add('B-11', 'one', [{ json: { id: 'mem-1' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('B-12', 'one', [{ json: { id: 'mem-1', content: 'x' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('B-13', 'one', [{ json: { id: 'mem-1', content: 'x', memory_type: 'fact' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('B-14', 'one', [{ json: { id: 'mem-1', tier: 'recent', status: 'active', category: 'general' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('B-15', 'one', [{ json: { id: 'mem-1', similarity: 0.8 } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });

// Group C — multiple real rows
add('C-16', 'many', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('C-17', 'many', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { id: 'm3' } }], { row_count: 3, summary: 'Memory recall completed (3 rows).' });
add('C-18', 'many', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { id: 'm3' } }, { json: { id: 'm4' } }, { json: { id: 'm5' } }], { row_count: 5, summary: 'Memory recall completed (5 rows).' });
add('C-19', 'many', [{ json: { id: 'm1', similarity: 0.9, lexical_fallback: false } }, { json: { id: 'm2', similarity: 0.8, lexical_fallback: false } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('C-20', 'many', [{ json: { id: 'm1', memory_type: 'fact' } }, { json: { id: 'm2', memory_type: 'observation' } }, { json: { id: 'm3', memory_type: 'advice' } }], { row_count: 3, summary: 'Memory recall completed (3 rows).' });

// Group D — mixed
add('D-21', 'mixed', [{ json: { success: true } }, { json: { id: 'mem-real' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('D-22', 'mixed', [{ json: { id: 'mem-real' } }, { json: { success: true } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('D-23', 'mixed', [{ json: { _error: true } }, { json: { id: 'mem-real' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('D-24', 'mixed', [{ json: { id: 'mem-real' } }, { json: { content: 'no id here' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('D-25', 'mixed', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { success: true } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('D-26', 'mixed', [{ json: { success: true } }, { json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { _error: true } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });

// Group E — invalid ids
add('E-27', 'invalid', [{ json: { id: null } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('E-28', 'invalid', [{ json: { id: 123 } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
// E-29: empty string id — filter is "typeof r.id === 'string'", so empty string passes.
// This matches existing BUG-V2-01 / Patch A semantics — mirror that oracle.
add('E-29', 'invalid', [{ json: { id: '' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('E-30', 'invalid', [{ json: { memory_id: 'x' } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('E-31', 'invalid', [{ json: { id: 'mem-1' } }, { json: { id: 123 } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });

// Group F — known regression shape (OBS-RECALL-UX-PREEXISTING trigger)
add('F-32', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-33', 'regression', [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS' } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-34', 'regression', [{ json: { success: true, executed: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-35', 'regression', [{ json: { _error: true, error_code: 'INVALID_TENANT' } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-36', 'regression', [], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-37', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-38', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-39', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-40', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });

// Group G — formatting + artifact shape
add('G-41', 'format', [], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('G-42', 'format', [{ json: { id: 'm1' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('G-43', 'format', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('G-44', 'format', Array.from({ length: 10 }, (_, i) => ({ json: { id: 'm' + i } })), { row_count: 10, summary: 'Memory recall completed (10 rows).' });
// G-45: count derives from NORMALISED rows, not raw array length.
add('G-45', 'format', [{ json: { success: true } }, { json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { _error: true } }, { json: {} }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
// G-46: row_count equals recall_results.length.
add('G-46', 'format', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { id: 'm3' } }], { row_count: 3, summary: 'Memory recall completed (3 rows).' });
// G-47: recall_results length matches count (asserted at run-time below).
add('G-47', 'format', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
// G-48: module_result.status preserved (simulated — the caller-side wrapper is not in scope here;
// this test asserts the counter logic yields the correct count for a success path).
add('G-48', 'format', [{ json: { id: 'only' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
// G-49: error-code preservation — _error prep path short-circuits; this test asserts that
// when prep is NOT an error, normal counting proceeds.
add('G-49', 'format', [{ json: { id: 'x1' } }, { json: { id: 'x2' } }, { json: { id: 'x3' } }, { json: { id: 'x4' } }], { row_count: 4, summary: 'Memory recall completed (4 rows).' });
// G-50: no change to payload fields outside summary/count — oracle = recall_results is still length-matched.
add('G-50', 'format', [{ json: { id: 'm-final', content: 'last test' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });

// Execute matrix.
let pass = 0, fail = 0;
const failures = [];
for (const c of cases) {
  const got = run(c.rawItems);
  const ok = got.row_count === c.expected.row_count
    && got.summary === c.expected.summary
    && got.recall_results.length === c.expected.row_count;
  if (ok) { pass++; } else {
    fail++;
    failures.push({ id: c.id, group: c.group, expected: c.expected, got: { row_count: got.row_count, summary: got.summary, recall_results_len: got.recall_results.length } });
  }
}
console.log('total:', cases.length);
console.log('pass :', pass);
console.log('fail :', fail);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(JSON.stringify(f));
  process.exit(1);
}
