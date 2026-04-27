# Phase 2 · Regression Results

## Status

All regression invariants GREEN by **absence-of-impact**: 0 workflow
mutations, 0 schema mutations, 0 DB writes, 0 external sends during
this run. Phase 1 baseline is preserved.

| # | Probe | Result |
|---|---|---|
| R-1 | `create_reminder → task` writes a `tasks` row with `due_at` | ✅ PL v2.6 + WF-ME-01 d2197ed5 unchanged |
| R-2 | `create_task` writes | ✅ task_module unchanged |
| R-3 | `list_tasks` read-only | ✅ task_module unchanged |
| R-4 | `complete_task` works | ✅ task_module unchanged |
| R-5 | `store_memory` writes | ✅ memory_module unchanged |
| R-6 | `recall_memory` / `search_memory` read-only | ✅ memory_module unchanged |
| R-7 | `capture_feedback` writes | ✅ improvement_module unchanged |
| R-8 | `list_improvements` read-only | ✅ improvement_module unchanged |
| R-9 | `response_module.respond_only` no-write | ✅ unchanged |
| R-10 | `public.reminders` count + max(created_at) byte-identical | ✅ 1 / 2026-04-13 20:17:13.620582+00 |
| R-11 | `public.outbound_delivery_ledger_claude_mcp` count | ✅ 0 / unchanged |
| R-12 | `public.task_reminder_deliveries` rows | ✅ 24 / unchanged |
| R-13 | No duplicate WF-RD-* workflow | ✅ exactly one `WF-RD-01_Reminder_Delivery_Scheduler` (id `nc7rTC3hjO9QqbXs`) |
| R-14 | No Path 5 invocation | ✅ |
| R-15 | No unauthorised MCP workflow write | ✅ |
| R-16 | WF-RD-01 active=false | ✅ |

## Workflow versionId table (post-mission)

Identical to Phase 1 post-state. No workflow's versionId moved this run.

| Workflow | versionId |
|---|---|
| WF-TR-01 | `88d2d45b…` |
| WF-EC-01 | `d25e4316…` |
| WF-OR-01 | `f4925ede…` |
| WF-PL-01 | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` |
| WF-DI-01 | `a1f9eaa2…` |
| WF-ME-01 | `d2197ed5-5f2d-454e-a540-fd464f526d2e` |
| WF-RA-01 | `4a2be8b4…` |
| WF-SU-01 | `4e7bc0d1…` |
| WF-RC-01 | `6d3f5208…` |
| WF-MO-01 | `4e0163b2-e176-40ad-ac33-a8438d7c2147` |
| WF-RD-01 | `894ad514-7ce7-4b35-90d4-6c5190f01408` |
