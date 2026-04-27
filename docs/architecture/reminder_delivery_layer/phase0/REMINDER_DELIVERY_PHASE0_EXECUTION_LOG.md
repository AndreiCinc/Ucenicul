# REMINDER_DELIVERY_LAYER · Phase 0 · Execution Log

Mission: `REMINDER-DELIVERY-LAYER-PHASE0-DISCOVERY-CONTRACT-AND-DRY-RUN`.
Date: 2026-04-27 (autonomous run, post NEXT_3_FOLLOWUPS_CLOSED_GREEN).
Repo root: `/sessions/hopeful-gifted-carson/mnt/Ucenicul`.

## Pre-state baseline

- WF-PL-01 versionId `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` (v2.6, 16/16, active).
- WF-ME-01 versionId `d2197ed5-5f2d-454e-a540-fd464f526d2e` (66/88, active).
- WF-MO-01 versionId `4e0163b2-e176-40ad-ac33-a8438d7c2147` (18 nodes, active; sub-workflow trigger `MO_Input`).
- `public.reminders` count=1, max(created_at)=2026-04-13 20:17:13Z.

## Layer 0 reads

- `docs/architecture/decisions/ADR-REMINDER-AS-TASK-LAYER.md` — ADR
  defines `task_module` as canonical owner; `reminder_module` deferred;
  REMINDER-DELIVERY-LAYER will be a delivery (not data-ownership) layer
  with scheduler + temporal trigger + MO + sent/snooze/retry/audit.
- `docs/architecture/e2e/next_3_followups/NEXT_3_FOLLOWUPS_CLOSEOUT.md`
  — bundle CLOSED_GREEN; reminders unchanged across the bundle.
- `docs/architecture/task_module/live_execution/TASK_MODULE_CLOSEOUT.md`
  — task_module live-writes `tasks` rows; reminder-like phrases route
  to `task_module.create_task` with extracted `due_at`/`due_date`/
  `due_type`; `metadata.metadata.origin='reminder_intent'` marker set
  by PL.
- `docs/architecture/Module_Registry_Ucenicul.md` — `reminder_module`
  capabilities (`create_reminder`, `list_reminders`, `update_reminder`,
  `cancel_reminder`) marked `deferred`. `task_module` user-ready.
- `docs/architecture/n8n_Workflow_Mapping.md` — section 1 (legacy)
  acknowledges reminder branch; section 2 (canonical) does NOT include
  a scheduler step. Row 74 confirms `reminder_module` deferred per ADR.
  No `WF-RD-*` workflow mentioned.

## Layer 1 reads

- `WF-MO-01` snapshot (`artifacts/WF-MO-01_pre.json`):
  - sub-workflow trigger (`MO_Input` = `executeWorkflowTrigger`) — can
    be called from any sub-workflow.
  - required input fields: `status_kind, result_type,
    execution_context_id, thread_id, tenant_id, composed_response,
    output_gateway_allowed, allowed_next_stage,
    response_generation_allowed, idempotency_key`.
    `composed_response.response_status ∈ {success, partial, failed,
    no_action}`.
  - `MO_Load_Channel_Delivery_Context` SQL is
    `SELECT id AS tenant_id, 'telegram'::text AS channel,
     (metadata->>'telegram_chat_id')::text AS delivery_target
     FROM public.tenants WHERE id = $1::uuid;` — **delivery target
    comes from `tenants.metadata.telegram_chat_id` only**. e2e tenants
    have no telegram_chat_id → MISSING_DELIVERY_TARGET.
  - `MO_Send_Channel_PLACEHOLDER` = `n8n-nodes-base.telegram`
    (real external send if delivery_target is set).
  - `MO_Log_Outbound_Message` writes to `outbound_delivery_ledger_claude_mcp`
    keyed on `idempotency_key`.

## Schema preflight

See `REMINDER_DELIVERY_SCHEMA_PREFLIGHT.md`.

Highlights:

- **`public.tasks`**: 16 columns. Delivery-relevant: `due_type` (enum:
  `flexible|date|datetime`), `due_date` (date), `due_at` (timestamptz),
  `status` (enum: `open|done|cancelled`), `metadata` (jsonb,
  default `{}`), `completed_at` (timestamptz). 89 rows total; 22
  with `due_at IS NOT NULL AND status='open'`; 10 with reminder-intent
  marker.
- **`public.reminders`**: 13 columns. `remind_at` (timestamptz NOT
  NULL), `status` (enum: `pending|sent|cancelled`), `sent_at`
  (timestamptz nullable). 1 row, untouched since 2026-04-13. Legacy.
- **`public.outbound_delivery_ledger_claude_mcp`**: 11 columns.
  Required: `tenant_id, execution_context_id, thread_id,
  idempotency_key, channel, delivery_target, response_text_hash,
  delivery_status` (all NOT NULL except `provider_message_ref`). 0
  rows total. Canonical chain-driven outbound ledger.
- `public.tenants.metadata` (jsonb) — only place where
  `telegram_chat_id` can live for MO delivery.

## Workflow discovery

- **No reminder/scheduler/cron workflow exists.** Searches via n8n MCP
  (`search_workflows query=reminder|scheduler|cron`) returned 0
  results.
- WF-MO-01 is callable as a sub-workflow (`executeWorkflowTrigger`)
  but its contract requires `execution_context_id`, `thread_id`,
  `composed_response`, `idempotency_key`. A scheduler-driven reminder
  fire has **no natural execution_context_id** (EC is per chain
  trigger). To call MO from a scheduler we'd need to either
  synthesize an EC (probably wrong — EC is `(tenant_id,
  trigger_message_id)`-keyed) or build a dedicated handoff.
- WF-MO-01 outbound ledger requires `execution_context_id NOT NULL` —
  same gap.

## Design options evaluated

See `REMINDER_DELIVERY_DESIGN_OPTIONS.md`.

- Option A — metadata-only delivery state on `tasks.metadata`.
- Option B — dedicated table `public.task_reminder_deliveries`.
- Option C — reuse `public.outbound_delivery_ledger_claude_mcp`.

## Selected contract for Phase 0

**Option A — metadata-only delivery state on `tasks.metadata`** for
dry-run only. See `REMINDER_DELIVERY_DESIGN_FREEZE.md`.

Phase 0 deliverables: dry-run query + intended-MO-payload generator;
no actual mutation of tasks; no calls to MO; no writes to reminders;
no writes to outbound ledger.

Phase 1 recommendation: Option B (dedicated
`public.task_reminder_deliveries` ledger with FK to tasks). Requires
schema migration — **out of scope for Phase 0**, queued as
`REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION` mission.

## Dry-run

See `REMINDER_DELIVERY_DRY_RUN_RESULTS.md`. 20 dry-run tests + 9
regression checks; SQL invariants in
`REMINDER_DELIVERY_SQL_INVARIANTS.md`.

## Blockers

None for Phase 0 (dry-run only). Documented Phase 1 prerequisites.

## Final verdict

**`REMINDER_DELIVERY_PHASE0_DRY_RUN_READY = TRUE`**

- Schema discovered and documented.
- Workflow surface discovered (no scheduler exists).
- Design options evaluated; Option A frozen for Phase 0; Option B
  recommended for Phase 1.
- Dry-run query + payload generator built; all 20 dry-run tests pass.
- Regression invariants pass (no mutation, no MO call, no reminder
  writes, no outbound ledger writes, public.reminders unchanged).
- Phase 1 plan written (`REMINDER_DELIVERY_PHASE1_PLAN.md`).
- 0 workflow mutations. 0 schema mutations. 0 duplicate workflows.
  0 Path 5. 0 unauthorized MCP writes.
