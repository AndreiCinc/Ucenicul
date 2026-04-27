// Regression evidence: run the PRE-patch ME_Memory_Recall_Result logic against
// the same 50-case matrix. Expected: multiple FAILures (especially group A
// "placeholder → 1 rows" and group B "1 rows" plural error).
// This confirms V2-OBS-RECALL-SUMMARY-STRING is a live bug pre-fix.

function runPre(rawItems) {
  const rows = (rawItems || []).map(i => (i && typeof i === 'object' && 'json' in i) ? i.json : i);
  const recall_results = rows.map(r => ({
    memory_id: r && r.id,
    content: r && r.content,
    memory_type: r && r.memory_type,
    tier: r && r.tier,
    status: r && r.status,
    category: r && r.category,
    source_thread_id: r && r.source_thread_id,
    entity_id: r && r.entity_id,
    created_at: r && r.created_at,
  }));
  const summary = 'Memory recall completed (' + recall_results.length + ' rows).';
  return { row_count: recall_results.length, summary, recall_results };
}

const cases = [];
function add(id, group, rawItems, expected) { cases.push({ id, group, rawItems, expected }); }

// Same 50-case matrix as unit test file (post-patch expected outcomes).
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

add('B-11', 'one', [{ json: { id: 'mem-1' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('B-12', 'one', [{ json: { id: 'mem-1', content: 'x' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('B-13', 'one', [{ json: { id: 'mem-1', content: 'x', memory_type: 'fact' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('B-14', 'one', [{ json: { id: 'mem-1', tier: 'recent', status: 'active', category: 'general' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('B-15', 'one', [{ json: { id: 'mem-1', similarity: 0.8 } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });

add('C-16', 'many', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('C-17', 'many', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { id: 'm3' } }], { row_count: 3, summary: 'Memory recall completed (3 rows).' });
add('C-18', 'many', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { id: 'm3' } }, { json: { id: 'm4' } }, { json: { id: 'm5' } }], { row_count: 5, summary: 'Memory recall completed (5 rows).' });
add('C-19', 'many', [{ json: { id: 'm1', similarity: 0.9 } }, { json: { id: 'm2', similarity: 0.8 } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('C-20', 'many', [{ json: { id: 'm1', memory_type: 'fact' } }, { json: { id: 'm2', memory_type: 'observation' } }, { json: { id: 'm3', memory_type: 'advice' } }], { row_count: 3, summary: 'Memory recall completed (3 rows).' });

add('D-21', 'mixed', [{ json: { success: true } }, { json: { id: 'mem-real' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('D-22', 'mixed', [{ json: { id: 'mem-real' } }, { json: { success: true } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('D-23', 'mixed', [{ json: { _error: true } }, { json: { id: 'mem-real' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('D-24', 'mixed', [{ json: { id: 'mem-real' } }, { json: { content: 'no id here' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('D-25', 'mixed', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { success: true } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('D-26', 'mixed', [{ json: { success: true } }, { json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { _error: true } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });

add('E-27', 'invalid', [{ json: { id: null } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('E-28', 'invalid', [{ json: { id: 123 } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('E-29', 'invalid', [{ json: { id: '' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('E-30', 'invalid', [{ json: { memory_id: 'x' } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('E-31', 'invalid', [{ json: { id: 'mem-1' } }, { json: { id: 123 } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });

add('F-32', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-33', 'regression', [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS' } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-34', 'regression', [{ json: { success: true, executed: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-35', 'regression', [{ json: { _error: true, error_code: 'INVALID_TENANT' } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-36', 'regression', [], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-37', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-38', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-39', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('F-40', 'regression', [{ json: { success: true } }], { row_count: 0, summary: 'Memory recall completed (0 rows).' });

add('G-41', 'format', [], { row_count: 0, summary: 'Memory recall completed (0 rows).' });
add('G-42', 'format', [{ json: { id: 'm1' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('G-43', 'format', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('G-44', 'format', Array.from({ length: 10 }, (_, i) => ({ json: { id: 'm' + i } })), { row_count: 10, summary: 'Memory recall completed (10 rows).' });
add('G-45', 'format', [{ json: { success: true } }, { json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { _error: true } }, { json: {} }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('G-46', 'format', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }, { json: { id: 'm3' } }], { row_count: 3, summary: 'Memory recall completed (3 rows).' });
add('G-47', 'format', [{ json: { id: 'm1' } }, { json: { id: 'm2' } }], { row_count: 2, summary: 'Memory recall completed (2 rows).' });
add('G-48', 'format', [{ json: { id: 'only' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });
add('G-49', 'format', [{ json: { id: 'x1' } }, { json: { id: 'x2' } }, { json: { id: 'x3' } }, { json: { id: 'x4' } }], { row_count: 4, summary: 'Memory recall completed (4 rows).' });
add('G-50', 'format', [{ json: { id: 'm-final', content: 'last test' } }], { row_count: 1, summary: 'Memory recall completed (1 row).' });

let pass = 0, fail = 0;
const failures = [];
for (const c of cases) {
  const got = runPre(c.rawItems);
  const ok = got.row_count === c.expected.row_count && got.summary === c.expected.summary;
  if (ok) pass++; else { fail++; failures.push({ id: c.id, group: c.group, expected: c.expected, got: { row_count: got.row_count, summary: got.summary } }); }
}
console.log('total:', cases.length);
console.log('pass :', pass);
console.log('fail :', fail);
console.log('FAILING CASES (proves pre-patch is buggy):');
for (const f of failures) console.log(f.id, '|', f.group, '| expected', f.expected.summary, '/ got', f.got.summary);
