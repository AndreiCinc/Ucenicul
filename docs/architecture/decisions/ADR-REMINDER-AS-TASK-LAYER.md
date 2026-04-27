# ADR — Reminder as Task Temporal Layer

> **Document status: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.
> In case of conflict, the architecture spec wins; this ADR is a
> current-stage interpretation of the canonical module contracts.

## Status

**Accepted** for current implementation stage (2026-04-25).
Supersedes the implicit MVP framing in `Architecture_Spec_v3_Ucenicul.md` §Module Inventory
and `Module_Registry_Ucenicul.md` §reminder_module that treated `reminder_module` as a
parallel CRUD module owed at MVP.

## Context

E2E discovery on the canonical TR→MO chain (see
`docs/architecture/e2e/results/F9_F13_F14_DOMAIN_WRITES_BLOCKER_REPORT.md`) confirmed:

- `task_module.create_task` is currently a stub — no INSERT into `tasks`.
- `reminder_module.create_reminder` is currently a stub — no INSERT into `reminders`.
- `improvement_module.capture_feedback` is currently a stub — no INSERT.
- Only `memory_module.{store,supersede,recall,search}` has real DB nodes (Memory V2 work).
- `WF-PL-01` planner has no path to memory writes either (`store_memory` not in the
  intentMap), so even memory writes through the canonical chain are gated on PL.

Before implementing `TASK-MODULE-LIVE-EXECUTION`, the project must avoid building two
parallel CRUD models (`tasks` and `reminders`) when:

- No scheduler exists.
- No proactive notification delivery exists.
- No sent / snooze / retry status exists.
- No notification audit exists.

A "reminder" without these is functionally identical to a task with a due field.

## Decision

For the current implementation stage:

1. **`task_module` is the canonical domain module** for any user-owned future action,
   including phrasings such as "remind me to …", "let me know to …", "don't let me forget …".
2. **Reminder-like requests are represented as tasks with due fields** (`due_date`,
   `due_at`, `due_type`, plus standard `priority`, `status`, `source`, `metadata`).
3. **`reminder_module` is deferred** as a CRUD module.  It is reframed as a future
   `REMINDER-DELIVERY-LAYER` whose responsibility is **delivery**, not data ownership.
4. The `REMINDER-DELIVERY-LAYER` will be opened only when the project commits to:
   - a scheduler (cron/queue/temporal),
   - a temporal trigger that wakes on `due_at`,
   - a delivery path through MO with `sent` / `failed` status,
   - retry semantics,
   - snooze semantics,
   - notification audit.
5. Until then: no parallel `reminders` table mutation from the canonical chain.  Any
   pre-existing `reminders` rows remain untouched; no new rows produced by the new chain.

## Consequences

### Module ownership (current stage)
- `task_module` must be implemented first and completely enough to support: `create_task`,
  `list_tasks`, `update_task`, `complete_task`, `delete_task`.
- Reminder-phrase NLU (e.g. "amintește-mi", "remind me") routes to `task_module.create_task`
  with an extracted `due_at` / `due_date`.

### Planner / dispatcher
- `WF-PL-01` `intentMap` may map `create_reminder` (when emitted by upstream classifier) to
  `create_task` rather than `create_reminder`, with PL extracting the temporal field.
- `WF-DI-01` retains the existing module dispatch contract; dispatch to `task_module`.
- No second CRUD path through `reminder_module` for the current stage.

### E2E tests
- Reminder-like cases in `docs/architecture/e2e/PROJECT_E2E_CORRIDOR_INVENTORY.md` and the
  rich-matrix pack assert **task rows with due metadata**, not separate `reminders` rows.
- Invariants for these cases scope to `tasks` table.

### Future REMINDER-DELIVERY-LAYER
- Will consume due `tasks` (or a view of them) and emit notifications via MO.
- May introduce an internal reminders/scheduling table for sent state tracking — distinct
  from a CRUD model the user manipulates.

## Non-goals

- No scheduler now.
- No proactive delivery now.
- No snooze / retry now.
- No separate `reminders` CRUD writes from the new chain.  Pre-existing legacy
  `brain_main_inbound_mvp_*` writes to `reminders` (if any) are out of scope and untouched.
- No DB schema change.
- No workflow mutation by this ADR.

## Authoritative sources

- `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (canonical authority)
- `docs/architecture/Module_Registry_Ucenicul.md` (`task_module`, `reminder_module`)
- `docs/architecture/n8n_Workflow_Mapping.md` (module table + Dispatcher)
- `docs/architecture/e2e/PROJECT_E2E_CORRIDOR_INVENTORY.md`
- `docs/architecture/e2e/results/F9_F13_F14_DOMAIN_WRITES_BLOCKER_REPORT.md`
- `workflows/WF-PL-01_Plan_Generation/docs/WF-PL-01_CONTRACTS.md`
- `workflows/WF-DI-01_Dispatcher/docs/WF-DI-01_CONTRACTS.md`
- `workflows/WF-ME-01_Module_Execution/` (current handler set)
