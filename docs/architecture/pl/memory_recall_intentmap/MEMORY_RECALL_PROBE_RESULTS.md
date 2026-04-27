# MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP · Probe Results

Run-tag: `mr-2026-04-27`. Channel: MCP `execute_workflow` against TR
`wI8hpSROxQI0zC9f`. Sequential firing.

## 7 sequential probes

| # | Case | Tenant | Intent | TR exec | Verdict |
|---|---|---|---|---|---|
| 1 | MR-001 RO recall | default | recall_memory | **10599** | ✅ chain reached `step_01_recall_memory`; rollup_status=success; module_results_count=1; 0 writes |
| 2 | MR-002 EN recall | default | recall_memory | **10613** | ✅ same as MR-001; 0 writes |
| 3 | MR-003 search regression | default | search_memory | **10627** | ✅ chain reached search_memory step; 0 writes |
| 4 | MR-004 cross-tenant recall | tenant B | recall_memory | **10641** | ✅ EC created in tenant B only (0 in other tenants); 0 cross-tenant rows surfaced |
| 5 | R-1 store_memory regression | default | store_memory | **10655** | ✅ wrote 1 `memory_items` row |
| 6 | R-2 create_task regression | default | create_task | **10669** | ✅ wrote 1 `tasks` row (`4a1d7657…`, title="un task: review pull request") |
| 7 | R-3 capture_feedback regression | default | save_suggestion | **10683** | ✅ wrote 1 `improvement_requests` row |

## MR-001 chain disposition (canonical evidence)

TR execution 10599's final hop returned:

```json
{
  "_debug_summary": {
    "execution_context_id": "d436d28d-bb54-4a84-bc04-52ee8efbca32",
    "tenant_id": "eee0e2e0-0000-0000-0000-000000000001",
    "thread_id": "5d597dcc-0379-4d51-831c-263cf53e2178",
    "rollup_status": "success",
    "module_results_count": 1,
    "returned_step_ids": ["step_01_recall_memory"]
  }
}
```

`step_01_recall_memory` proves PL routed to ME's real recall handler
(not search, not respond_only, not a fallthrough).

## SQL invariants summary (post all 7 fires)

```
recall_writes               = 0   ✅ (all 3 recall threads, 0 memory_items)
search_regression_writes    = 0   ✅
store_regression_writes     = 1   ✅
task_regression_writes      = 1   ✅ (verified separately)
feedback_regression_writes  = 1   ✅
mr004_ec_in_tenant_b        = 1   ✅
mr004_ec_in_other_tenants   = 0   ✅ (cross-tenant isolation holds)
reminders_count             = 1   ✅ unchanged
reminders_max_created       = 2026-04-13 20:17:13Z  ✅ unchanged
```

## Cross-tenant evidence (MR-004)

- Envelope tenant_id = tenant_B (`eee0e2e0-…000b`).
- Pre-state in tenant_B for thread_id `48596462…`: 0 memory rows.
- ME's Recall_Prep injected `source_thread_id=48596462…` (via PL late-
  binding), `tenant_id=B` (via env).
- ME's Recall_DB executed `SELECT * FROM memory_items WHERE
  tenant_id=$1 AND source_thread_id=$3 …` with $1=B and $3=48596462…
  → 0 rows (no rows for that thread/tenant tuple).
- No execution_context for MR-004's thread surfaced under any other
  tenant. **Tenant isolation holds.**

## Side-effect deltas this mission

| Bucket | Δ |
|---|---|
| `memory_items` (recall threads) | 0 |
| `memory_items` (search-regression thread) | 0 |
| `memory_items` (R-1 store thread) | +1 |
| `tasks` (R-2 thread) | +1 |
| `improvement_requests` (R-3) | +1 |
| `execution_contexts` (all 7 threads) | +7 |
| `public.reminders` | 0 |
| Cross-tenant `memory_items` for any of the 7 threads | 0 |
