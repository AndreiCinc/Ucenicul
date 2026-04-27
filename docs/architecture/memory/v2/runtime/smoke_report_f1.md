# smoke_report_f1.md — Memory v2 / F1 Runtime Smoke Report

Frozen: 2026-04-21.
Workflow: `WF-ME-01 Module Execution` (n8n id `uq26nh1grIpnHju0`, versionId `da6d2573-ed85-4f1f-8c54-693364f9a432`).
Channel: MCP read-only (`execute_workflow` + `get_execution`). Production mode. No workflow mutation.
Idempotency scope (V2-004): `mem-smoke-v2f1`.
Execution context (pre-created): `d4f82a41-01cd-4fb7-9d70-573557348e74`.

## Verdict

| Action | Execution ID | Module-level verdict | DB delta correct | Aggregation sub-call |
|---|---|---|---|---|
| store_memory (S1) | 1370 | pass | yes — 1 new row `a0909481-…` inserted | expected_error (isolation) |
| search_memory (S2) | 1372 | pass_with_anomalies | n/a — read-only | success (no writes) |
| recall_memory (S3) | 1381 | pass | n/a — read-only, returned S1 row | success (no writes) |
| promote_memory (S4) | 1390 | pass | yes — `7b03cd9c-…` flipped recent→long_term, `user_confirmed=true`, `last_reconfirmed_at` set | expected_error (isolation) |
| supersede_memory (S5) | 1392 | pass | yes — old `adbad490-…` → `status=superseded`; new `6ceb9437-…` inserted with `supersedes_memory_id=adbad490-…` | expected_error (isolation) |

**Memory module itself: 5/5 green at `ME_Return_Result`.** All DB oracles satisfied. Three result-node anomalies recorded in `MEMORY_V2_BUG_LEDGER.md` (BUG-V2-01/02/03). One runtime boundary (aggregation isolation error on write paths) documented as not-a-bug.

## Method

Each smoke call was driven through the existing chat trigger on `WF-ME-01` by sending the canonical dispatcher envelope as `chatInput` (the validator `ME_Validate_Dispatcher_Result` explicitly supports this unwrap — see `smoke_plan_f1.md § Trigger shape`). The envelope carried `status_kind=success`, `result_type=dispatch`, shared `execution_context_id` / `thread_id` / `tenant_id`, and a per-step `step.inputs.action` payload. Per-step `idempotency_key` emitted by the prep layer is `{action}:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f1:s{n}`.

Pre-run setup: inserted one `execution_contexts` row tagged `idempotency_key=mem-smoke-v2f1` to satisfy `ME_Load_Execution_Context`.

Per-run evidence saved to `docs/architecture/memory/v2/runtime/exec_s{n}_*.json`. Full raw execution traces remain available via `get_execution` in the n8n system.

## Post-condition check (SQL, 2026-04-21)

```
SELECT id, category, tier, status, supersedes_memory_id, idempotency_key
FROM public.memory_items
WHERE tenant_id='aaaaaaaa-0000-0000-0000-000000000001'
  AND idempotency_key LIKE '%:mem-smoke-v2f1:%';
```

Returned:

| id | category | tier | status | supersedes_memory_id |
|---|---|---|---|---|
| a0909481-a0a8-4682-8689-fbe50a6fa919 | smoke_store | recent | active | null |
| 6ceb9437-960e-45b4-a1cf-706116723360 | smoke_supersede | recent | active | adbad490-121d-4f17-81cd-622fdf507d45 |

Walker fixtures untouched outside the two explicit targets (7b03cd9c promote, adbad490 supersede). Expected.

## Walker-vs-workflow equivalence (F1.6)

The Phase-7 walker (`tests/memory/walker.mjs`) runs the same 5 actions against the DB directly. The F1 smoke confirms the live workflow reaches the same DB state the walker does, for the single-step anchor cases. Divergences found are in the **result envelope shape**, not the DB semantics:

- DB correctness: store/recall/promote/supersede all match walker behaviour (insert/select/update SQL identical — same nodes were rolled out by the n8n-patch that the walker was validated against).
- Envelope shape divergence: BUG-V2-01 / BUG-V2-02 / BUG-V2-03 emerge only in the **workflow** path because the Result nodes are n8n Code nodes the walker bypasses (walker reads the DB row directly). These bugs are therefore workflow-only and do not call into question the v1 closure — they affect callers of the module_result envelope, not the persistence layer.

Conclusion: equivalence holds for the persistence layer; divergence is isolated to result-node envelope construction and recorded in the bug ledger for remediation alongside F4 (denial vocabulary) and F2 (semantic path).

## Findings queued for later frontiers

- F2 (semantic path) — BUG-V2-02 must be fixed alongside the embedding producer rollout, otherwise F2's smoke will not be able to distinguish lexical-fallback from true-semantic hits.
- F4 (promote denial vocabulary) — BUG-V2-03's fix is effectively the F4 scaffolding; the denial_reason column already exists in SQL output and just needs to be plumbed into the result envelope alongside an enumerated taxonomy.
- F3 (243 non-anchor cases) — BUG-V2-01 must be fixed before family roll-ups; zero-hit searches currently produce garbage rows that would pollute family statistics.

## Closure

F1 is closed with 5/5 action paths validated end-to-end at the DB layer and 3 result-node bugs filed against the envelope layer. Advancement to F2 is permitted because no blocker on F2's design surface is introduced. F3 and F4 inherit bugs that must land before those frontiers complete.
