# V2-OBS-RECALL-SUMMARY-STRING-FIX — DESIGN FREEZE

Frozen: 2026-04-25 (Memory 100% Pack, Mission A).

## Mission

`V2-OBS-RECALL-SUMMARY-STRING-FIX` — remove the cosmetic/UX defect where `ME_Memory_Recall_Result` summarises zero-match Postgres placeholder items as "1 rows" and phrases one-row recalls as "1 rows" instead of "1 row".

## Target surface

- Single node: `ME_Memory_Recall_Result` (id `me-phase5mem-recall-result`, type `n8n-nodes-base.code`).
- Single field: `parameters.jsCode`.
- No structural change; no new node; no connection edit; no SQL; no schema.

## Current live state (pre-apply)

- Live `WF-ME-01` versionId: `c2273980-fb36-420d-bab9-b9fc3edcb2d9` (V2-033 apply, 2026-04-24). V2-034 / V2-035 / V2-036 all non-mutating.
- Node count 49 / connection count 67 / `active=true`.
- `ME_Memory_Recall_Result.parameters.jsCode` sha256: `3dbc8cb329a080b31bcef40c4f17cb9419fdd3b4576bedc7cecdd6763ce24f7a` (1319 bytes).
- Snapshot source: `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/snapshots/uq26nh1grIpnHju0_after_2026-04-24T13-24-24-582Z.json`.

## Bug mechanism

Live jsCode:
```js
const rows = $items().map(i => i.json);
// ...
const recall_results = rows.map(r => ({ memory_id: r.id, ... }));
// ...
summary: 'Memory recall completed (' + recall_results.length + ' rows).',
```

- Zero-match path: when `ME_Memory_Recall_DB` returns no rows under the `continueOnFail` pattern, n8n's Postgres node emits a single placeholder item `{json: {success: true}}` (same defect profile as F1's BUG-V2-01 on search). The map-over-everything logic then yields one garbage `recall_results` entry with all fields `undefined`, and the summary reports `1 rows` when effective matches = 0. This is the exact OBS-RECALL-UX-PREEXISTING signature.
- Singular/plural: the literal `' rows'` is hardcoded, so a real one-row result reads `1 rows` instead of `1 row`. UX regression independent of placeholder count.

Regression evidence: `tests/recall_summary_prepatch_regression.mjs` runs the pre-patch logic against a 50-case matrix — **37/50 FAIL**, including all group A zero-match cases, all group B one-row cases (B-11..B-15), and all group F OBS-RECALL-UX-PREEXISTING regression fixtures.

## Patch design

Add one filter line and two lines for the singular/plural selector. Everything else byte-identical.

Post-patch jsCode (sha256 `a7782f0e51b859c9a526aa490bf3d50742126cb28498c4c1245997b12f3c96a7`, 1504 bytes) in `artifacts/recall_result_jscode_post.js`.

Diff surface (3 points):

1. `const rows = $items().map(i => i.json);` → `const rawRows = $items().map(i => i.json); const rows = rawRows.filter(r => r && typeof r === 'object' && typeof r.id === 'string');` — filter mirrors the F1 / Patch A fix for `ME_Memory_Search_Result` (V2-007, BUG-V2-01).
2. Add `const row_count = recall_results.length; const row_word = row_count === 1 ? 'row' : 'rows';` before the return statement.
3. Summary string `'… (' + recall_results.length + ' rows).'` → `'… (' + row_count + ' ' + row_word + ').'`.

All other fields — `status_kind`, `result_type`, `execution_context_id`, `thread_id`, `tenant_id`, `module_result.{module_name,step_id,result_type,status,observations,proposals,actions_executed,artifacts,confidence,needs_followup,followup_requests}`, `module_execution_started`, `domain_writes_performed`, `response_generation_allowed` — byte-identical.

## Diff-surface invariants (DS-INV)

- DS-INV-1 `parameters.jsCode` is the only mutated field on this node.
- DS-INV-2 No node added or removed (nodeCount stays at 49).
- DS-INV-3 No connection edited (connectionCount stays at 67).
- DS-INV-4 No other node's jsCode / parameters / credentials change.
- DS-INV-5 `active=true` preserved.
- DS-INV-6 `settings` unchanged.
- DS-INV-7 `typeof row.id === 'string'` is the acceptance predicate (matches F1 BUG-V2-01 fix on `ME_Memory_Search_Result`).
- DS-INV-8 Zero-match → summary emits `0 rows`; one-match → `1 row`; N-match → `N rows`.
- DS-INV-9 `recall_results.length === row_count` (count derives from normalised list, not raw).
- DS-INV-10 `_error` prep short-circuit branch preserved byte-identically.

## Unit oracle

`tests/recall_summary_unit_tests.mjs` — 50-case matrix (A..G) exercising zero-match, one-row, multi-row, mixed, invalid-id, known regression shapes, formatting. Post-patch logic: **50/50 PASS** (already verified locally). Pre-patch logic: 37/50 FAIL (regression evidence).

## Apply channel

V2-028 canonical: `n8n-patch.mjs patch-node` from the Cowork sandbox via `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env`. Command frozen in `APPLY_COMMAND.md`.

## Acceptance

Mission A passes only if: (a) live apply advances versionId exactly once; (b) post-apply jsCode sha256 equals `a7782f0e…`; (c) non-target node byte-identity held (DS-INV-4); (d) live smoke shows zero-match summary is `0 rows` and one-row summary is `1 row`; (e) recall triggers no DB writes (existing property, confirmed by invariants `SELECT count(*)` before/after recall).
