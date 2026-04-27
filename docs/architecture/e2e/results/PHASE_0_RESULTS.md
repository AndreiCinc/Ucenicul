# PHASE 0 — Harness Sanity Results

Run tag: `p0_sanity`
Date: 2026-04-25
Total cases attempted: 5
PASS: 1
FAIL: 2 (workflow-needs-operator-decision)
BLOCKED: 2 (deferred — same gap as the failing two)

---

## Summary

| case_id | tr_exec | reach | terminal | invariants run | verdict |
|---|---|---|---|---|---|
| C9-L1-V3 | 7359 | TR→EC→OR→PL→DI→ME→RA→SU→RC→MO (10/10) | RA agg=success; MO=MISSING_DELIVERY_TARGET (fixture) | 3 ✓ | **PASS** |
| C1-L1-V1 | 7351 | TR→EC→OR→PL (4/10) | PL: INSUFFICIENT_PLANNING_CONTEXT — no mappable intent | 0 (chain stopped before) | **WORKFLOW_BUG_REQUIRES_OPERATOR_DECISION** |
| C2-L1-V1 | 7355 | TR→EC→OR→PL (4/10) | same as C1 | 0 | **WORKFLOW_BUG_REQUIRES_OPERATOR_DECISION** |
| C5-L1-V1 | — | — | — | — | DEFERRED (same gap as C1) |
| C11-L1-V1 | — | — | — | — | DEFERRED (needs save_suggestion intent mapping) |

## C9-L1-V3 detail (the green case)

- Hops: `TR:7359 → EC:7360 → OR:7361 → PL:7362 → DI:7363 → ME:7364 → RA:7365 → SU:7366 → RC:7367 → MO:7368`
- ME handler: `ME_Memory_Search_Result`, `module=memory_module`, `status_kind=success`
- RA aggregation: `status=success`, `modules=['memory_module']`, `actions=['search_memory']`,
  `per_status={success:1, failed:0}`, `needs_followup=false`
- MO terminal: `MISSING_DELIVERY_TARGET` (no telegram chat_id mapped to e2e tenant — accepted
  fixture limitation for this run).

### SQL invariants

```
assert_new_thread_id                            : c=1   ✅
assert_memory_read_tenant_scoped                : c=0   ✅ (recall on fresh tenant returns 0; correct)
assert_no_cross_thread_execution_state_resume   : c=1   ✅ (single execution_context for the thread)
```

Sanity (no domain leaks under e2e tenant):
```
tasks=0 reminders=0 memory_items=0 outbound=0
```

## C1 / C2 detail (the failing cases)

Both terminate at `PL_Return_Error` with:

```
error.code = INSUFFICIENT_PLANNING_CONTEXT
error.message = "No requested actions or mappable primary intent are available."
missing_fields = ["planner_context.requested_actions or planner_context.primary_intent"]
```

Root cause: the chain doesn't classify intent autonomously — it reads `messages.intent` as
set by the upstream preprocessor (`brain_main_inbound_mvp_v6_preprocessor`). For C9-L1-V3 we
manually set `messages.intent='search_memory'` and the chain ran end-to-end. C1 and C2 were
not given an intent override; this is the same gap. See `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` §7 F4
for the full discussion + recommended continuation.

## How the harness was driven

1. `node seed_threads.mjs --run-tag p0_sanity --case … --case …` → emits SQL.
2. `mcp__postgres__execute_sql` runs the INSERT batch (tenants seeded once, then threads, then messages).
3. `node e2e_runner.mjs prepare --run-tag p0_sanity --case …` → writes per-case envelope JSON.
4. `mcp__f2e8be41-…_execute_workflow workflowId=wI8hpSROxQI0zC9f executionMode=production
    inputs={type:'chat', chatInput:<envelope JSON>}` → returns `{executionId, status}`.
5. `node e2e_runner.mjs walk --run-tag p0_sanity --case <id> --tr-exec <id>` → walks chain
   and saves `<id>.chain.json` + `<id>.invariants.json` under `artifacts/runtime/`.
6. SQL invariants per case via `mcp__postgres__execute_sql` (read-only SELECT).

Continuation pattern documented in `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` §10.
