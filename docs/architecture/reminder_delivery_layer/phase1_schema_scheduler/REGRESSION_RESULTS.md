# Phase 1 · Regression Results

All upstream contracts verified GREEN by absence-of-impact: 0
mutations to PL/ME/MO/DI/OR/EC/TR/RA/SU/RC, 0 mutations to
`public.tasks`/`public.reminders`/`public.outbound_delivery_ledger_claude_mcp`.

| # | Probe | Verdict |
|---|---|---|
| R-1 | `create_reminder → task` still writes a `tasks` row with `due_at` | ✅ (PL v2.6 + WF-ME-01 d2197ed5 byte-identical) |
| R-2 | `create_task` still writes | ✅ |
| R-3 | `list_tasks` still read-only | ✅ |
| R-4 | `complete_task` still works | ✅ |
| R-5 | `store_memory` still writes | ✅ (`memory_module` byte-identical) |
| R-6 | `recall_memory` / `search_memory` still read-only | ✅ |
| R-7 | `capture_feedback` still writes | ✅ (`improvement_module` byte-identical) |
| R-8 | `list_improvements` still read-only | ✅ |
| R-9 | `response_module.respond_only` still no-write | ✅ |
| R-10 | `public.reminders` count + max(created_at) unchanged | ✅ |

## Source-of-truth tables — pre/post mission

| Table | Pre | Post | Δ |
|---|---|---|---|
| `public.tasks` | 98 | 98 | 0 |
| `public.reminders` | 1 (max=2026-04-13 20:17:13Z) | 1 (max=2026-04-13 20:17:13.620582+00) | 0 |
| `public.outbound_delivery_ledger_claude_mcp` | 0 | 0 | 0 |
| `public.memory_items` (default lane) | (matches NEXT_3_FOLLOWUPS post-state) | unchanged by this mission | 0 |
| `public.improvement_requests` | (matches NEXT_3_FOLLOWUPS post-state) | unchanged | 0 |
| `public.task_reminder_deliveries` | did not exist | 24 rows (all `skipped_missing_target`) | +24 (this mission's new ledger) |

## Workflow versionId table

| Workflow | Pre | Post | Note |
|---|---|---|---|
| WF-TR-01 | `88d2d45b…` | unchanged | byte-identical |
| WF-EC-01 | `d25e4316…` | unchanged | byte-identical |
| WF-OR-01 | `f4925ede…` | unchanged | byte-identical |
| WF-PL-01 | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` | unchanged | byte-identical |
| WF-DI-01 | `a1f9eaa2…` | unchanged | byte-identical |
| WF-ME-01 | `d2197ed5-5f2d-454e-a540-fd464f526d2e` | unchanged | byte-identical |
| WF-RA-01 | `4a2be8b4…` | unchanged | byte-identical |
| WF-SU-01 | `4e7bc0d1…` | unchanged | byte-identical |
| WF-RC-01 | `6d3f5208…` | unchanged | byte-identical |
| WF-MO-01 | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | unchanged | byte-identical |
| **WF-RD-01** | (did not exist) | **`894ad514-7ce7-4b35-90d4-6c5190f01408`** | **NEW** (active=false) |
