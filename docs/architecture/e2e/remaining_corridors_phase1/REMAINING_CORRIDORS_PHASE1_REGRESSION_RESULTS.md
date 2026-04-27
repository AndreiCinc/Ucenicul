# REMAINING CORRIDORS PHASE 1 · Regression Results

> 8 regression classes per mission spec. All GREEN.

| # | Class | Case | Outcome |
|---|---|---|---|
| 1 | `task_module.create_task` | RC-REG-01 | task `60915089-…` (or new id this run) — title `"regression smoke pentru chain post-improvement"`, status `open` ✅ |
| 2 | `create_reminder → task_module.create_task` (ADR) | RC-REG-02 | task with `due_type=datetime`, `due_at=2026-04-26T17:00:00Z`, `metadata.origin='reminder_intent'` ✅ |
| 3 | `improvement_module.capture_feedback` | RC-REG-03 | improvement row from `Sugestie: rapoarte săptămânale automate…` ✅ |
| 4 | `log_improvement_request` PL alias | RC-REG-04 | improvement row from `Feature request: please add CSV export…`; PL late-binding rewrite to `capture_feedback` worked ✅ |
| 5 | `memory_module.store_memory` | RC-REG-05 | memory row `86697b90-…` `"adresa noastră de billing este billing@ucenicul.test"` ✅ |
| 6 | `memory_module.search_memory` (read-only) | RC-REG-06 | 0 row delta in `memory_items` ✅ |
| 7 | `task_module.list_tasks` (read-only) | RC-REG-07 | 0 row delta in `tasks` ✅ |
| 8 | `public.reminders` unchanged invariant | (SQL probe) | `count=1`, `last_updated=2026-04-13T20:17:13Z` baseline preserved ✅ |

## Aggregate regression invariants

```
new_tasks_window           = 6   (C7-01 + C7-07 + C8-01 + C8-04 + REG-01 + REG-02)
new_memory_window (chain)  = 11  (8 C2 + 1 C7-05 + 1 C9-01 + 1 REG-05)
new_improvement_window     = 2   (REG-03 + REG-04)
new_reminder_writes_window = 0
```

All predecessor verdicts continue to hold:

- `TASK_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- `E2E_TASK_CORRIDORS_PHASE1_READY = TRUE`
- `F14_STORE_MEMORY_INTENTMAP_READY = TRUE`
- `IMPROVEMENT_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- `F9_OR_LIVE_EXECUTION_GATING_DOC_ONLY_RECLASSIFIED`
