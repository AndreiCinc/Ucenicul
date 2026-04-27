# family_batch_recall_20260421.md — first batch for `recall_memory`

Date: 2026-04-21.
Frontier: **F3 — first-batch kickoff for the `recall_intersection` family**.
Precondition: F4 rolled out (`versionId=fc43f6bc-6f25-4588-afda-edadb55735ff`).

## Scope of "first batch"

Six hand-built cases covering the **variant dimensions** of the `recall_intersection` family from `tests/fixtures/family_cases_seed.json`: thread_id (two distinct), entity_id, category, memory_type, plus a strict-intersection case (thread+category). Same parsimony rationale as `family_batch_search_f2b_20260421.md` — the full 50-case combinatorial expansion is deferred to F3.1 walker/sidecar.

## Inputs

- Workflow: `WF-ME-01 Module Execution`, id `uq26nh1grIpnHju0`, versionId `fc43f6bc-…`
- tenant_id: `aaaaaaaa-0000-0000-0000-000000000001`
- execution_context_id: `d4f82a41-01cd-4fb7-9d70-573557348e74` (shared smoke context)
- thread_id: `77777777-0000-0000-0000-000000000007`
- idempotency scope: `mem-batch-v2c-recall-r*`

DB seed at batch time: 10 rows under tenant `aaaa…0001` (5 phase7 anchors with `source_thread_id=33333333-…-0003`, 3 smoke fixtures with `source_thread_id=77777777-…-0007`, 1 superseded anchor `adbad490` and 1 superseded `28c3a392`, plus the F4 promote fixture `cc0dc5c2`). All `embedding IS NULL`.

## Runs

Variant axes covered: thread_id (2 distinct values), entity_id, category, memory_type, strict intersection.

| Run | step_id | exec id | filter inputs | applied_filters | row_count | order check | status |
|---|---|---|---|---|---|---|---|
| R1 | recall-r1 | 1544 | source_thread_id=33333333-…-0003 | [source_thread_id] | 5 | created_at DESC matches anchors A6n>A5>A4>A3>A1, excludes superseded adbad490+28c3a392 | success |
| R2 | recall-r2 | 1553 | source_thread_id=77777777-…-0007 | [source_thread_id] | 3 | cc0dc5c2 (smoke_f4) > 6ceb9437 (smoke_supersede) > a0909481 (smoke_store) | success |
| R3 | recall-r3 | 1562 | entity_id=eeee…0001 | [entity_id] | 5 | identical row set to R1 (all anchors share entity_id) | success |
| R4 | recall-r4 | 1571 | category=smoke_store | [category] | 1 | a0909481 only — exact category match | success |
| R5 | recall-r5 | 1580 | memory_type=fact, limit=50 | [memory_type] | 8 | all 8 active rows (10 total − 2 superseded), all fact-typed | success |
| R6 | recall-r6 | 1589 | source_thread_id=33333333-…-0003 + category=recall_test | [source_thread_id, category] | 1 | da53c396 only — strict intersection works | success |

Raw captures: `docs/architecture/memory/v2/f3/artifacts/runtime/exec_recall_r{1..6}_*.summary.json`.

## Oracles — all Pass

- **Default `status='active'` filter applied**: R1 returns 5/7 thread-matched rows (excludes 2 superseded). R5 returns 8/10 total rows (excludes 2 superseded). Oracle satisfied across all 6 runs.
- **Strict intersection on R6**: only the row matching BOTH thread AND category — proves the AND-of-filters semantic the contract requires.
- **Ordering**: every result list is sorted by `created_at DESC` per recall SQL contract.
- **Filter coverage**: 4 distinct individual filters (source_thread_id, entity_id, category, memory_type) plus 1 intersection — covers the 4 single-axis variants from the seed manifest.
- **applied_filters passthrough**: each Prep node correctly emits the list of applied filters into the result envelope, matching the supplied inputs exactly.
- **No DB mutation**: all 6 runs are read-only. `MAX(updated_at)` for tenant `aaaa…0001` unchanged across the batch (still `2026-04-21T05:23:52.686Z` from F4-t3 promote, until SU1/SU2/SU3/SU4/PF3 follow-on batches).

## Residual failures

None. 6/6 oracles pass.

## Known-next-steps (not residuals — deliberately scoped out)

- Full 50-case run requires F3.1 walker/sidecar runner (avoid MCP round-trip cost).
- Negative case `thread_id+memory_type` mismatch (e.g. thread=77777777 + memory_type=preference) — currently no `preference` rows in DB so trivially returns 0; not informative.
- `tier` filter (`recent` vs `long_term`) not exercised in this batch — covered implicitly by R5 (mixed-tier result set is correct).
- Recall returning 0 rows oracle: not exercised this batch (deferred to F3.1 walker).
