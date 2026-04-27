# Phase 1 · Mission Brief

Mission: `REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION`.
Date: 2026-04-27 (autonomous run).
Predecessor verdict: `REMINDER_DELIVERY_PHASE0_DRY_RUN_READY = TRUE`
(`docs/architecture/reminder_delivery_layer/phase0/REMINDER_DELIVERY_CLOSEOUT.md`).

## Scope (authorised)

1. Additive schema migration: `public.task_reminder_deliveries` table +
   indexes + UNIQUE constraint.
2. One new canonical workflow:
   `WF-RD-01_Reminder_Delivery_Scheduler` (manual + schedule triggers,
   imported INACTIVE, `availableInMCP=true` for operator-driven dry-run
   probes).
3. Full mission-local docs (15 files) + reconciliation + Module Registry +
   `n8n_Workflow_Mapping.md` updates.

## Out of scope (forbidden)

- No writes to `public.reminders`.
- No reuse of `outbound_delivery_ledger_claude_mcp` (NOT NULL
  `execution_context_id` makes it unsuitable for scheduler-origin rows).
- No external Telegram send to any non-sandbox chat (no sandbox target
  authorised in this run).
- No fake `tenants.metadata.telegram_chat_id` seeded.
- No duplicate / `_v2` / `fixed` workflow copies.
- No Path 5.
- No Memory V2 reopen.
- No mutation of `task_module`, `memory_module`, `improvement_module`,
  `response_module`.

## Apply channel

Canonical V2-028 local CLI:
`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`
— `import` for the new workflow, `replace` for in-place updates.

## Pre-state confirmed

- `NEXT_3_FOLLOWUPS_CLOSED_GREEN = TRUE`.
- `task_module` user-ready.
- `create_reminder` / "amintește-mi" → `task_module.create_task` per
  ADR-REMINDER-AS-TASK-LAYER (PL v2.6).
- `public.reminders` count=1, max(created_at)=2026-04-13 — UNCHANGED.
- `public.tasks` has `due_at`, `due_date`, `due_type`, `status`,
  `metadata`, `completed_at`.
- Phase 0 candidate query verified working.
- e2e tenants have `metadata.telegram_chat_id = NULL` (all 3).
- MO `MISSING_DELIVERY_TARGET` is KNOWN_FIXTURE_LIMITATION.
- No reminder/scheduler/cron workflow existed pre-mission.
- `outbound_delivery_ledger_claude_mcp.execution_context_id NOT NULL` —
  blocks scheduler reuse without a separate (out-of-scope) migration.

All baseline assertions ✅.
