# REMINDER_DELIVERY_LAYER · Phase 1 · Plan

Successor mission to `REMINDER-DELIVERY-LAYER-PHASE0-DISCOVERY-CONTRACT-AND-DRY-RUN`.

Recommended next mission name:
`REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION`.

## Pre-requisites (must be authorised before Phase 1 execution)

1. **Schema migration policy clearance** — adding a new
   `public.task_reminder_deliveries` table (Option B from Phase 0 design
   options). See exact DDL below. Provide migration script + rollback +
   docs.
2. **Tenant onboarding / `delivery_target` policy** — agreement on:
   - where `tenants.metadata.telegram_chat_id` comes from (manual
     onboarding? per-thread chat id from `messages.metadata`?);
   - what to do when the target is missing (skip-once-and-mark vs.
     skip-every-tick);
   - whether the e2e tenants ever get a real test target (Anthropic
     sandbox bot, controlled test chat).
3. **Production rollout plan** — scheduler interval (recommend 60 s
   on a single n8n instance; longer if multi-instance), per-tick
   concurrency caps, error budgets, alerting on consecutive failures.
4. **Recurring reminders decision (yes / no for v1)** — ADR-level
   choice. v1 default: NO (one delivery per task). Adding recurrence
   is a separate mission.
5. **Backlog policy on first scheduler tick** — recommend skipping any
   task whose `due_at` is more than 24 h past, marking
   `metadata.reminder_delivery.status='skipped_backlog'` once on first
   run, then continuing with the normal candidate set on subsequent
   ticks. (Without this, on first scheduler activation we would fan
   out 22+ deliveries to the default tenant alone.)

## Schema migration (Option B)

```sql
-- Migration: 20260427_add_task_reminder_deliveries.sql
BEGIN;

CREATE TABLE public.task_reminder_deliveries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL,
  task_id              uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  due_occurrence_iso   text NOT NULL,
  delivery_key         text NOT NULL,
  delivery_status      text NOT NULL,
  channel              text,
  delivery_target      text,
  attempts             int  NOT NULL DEFAULT 0,
  last_attempt_at      timestamptz,
  sent_at              timestamptz,
  last_error           text,
  provider_message_ref text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, task_id, due_occurrence_iso)
);

CREATE INDEX task_reminder_deliveries_status_idx
  ON public.task_reminder_deliveries (tenant_id, delivery_status, last_attempt_at);

CREATE INDEX task_reminder_deliveries_task_idx
  ON public.task_reminder_deliveries (task_id);

COMMIT;

-- Rollback:
-- BEGIN;
-- DROP INDEX IF EXISTS task_reminder_deliveries_task_idx;
-- DROP INDEX IF EXISTS task_reminder_deliveries_status_idx;
-- DROP TABLE IF EXISTS public.task_reminder_deliveries;
-- COMMIT;
```

Migration is fully additive: no changes to `public.tasks` /
`public.reminders` / `public.outbound_delivery_ledger_claude_mcp`.

## New canonical workflow `WF-RD-01_Reminder_Delivery_Scheduler`

Trigger: `n8n-nodes-base.scheduleTrigger` (cron: every 60 s during
business hours; 5 min off-hours — to be tuned).

Approximate node graph:

```
RD_Schedule_Trigger
  → RD_Load_Tenant_Loop (Postgres SELECT id FROM tenants WHERE is_active=true ORDER BY id LIMIT N OFFSET ?)
    → RD_Per_Tenant_Loop (split, parameterised by tenant_id)
      → RD_Load_Candidates (Postgres SELECT — same query as Phase 0 dry-run, parameterised by tenant_id)
        → RD_Filter_Backlog (Code — reject tasks whose due_at < NOW() - 24h unless force_send=true)
          → RD_Resolve_Target (Postgres — same SQL as MO_Load_Channel_Delivery_Context)
            → RD_Per_Candidate_Loop
              → RD_Upsert_Delivery_Pending (Postgres INSERT … ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO UPDATE)
                → RD_Route_Has_Target (Switch on delivery_target IS NULL)
                  ├─ [missing] → RD_Mark_Skipped (Postgres UPDATE delivery_status='skipped_missing_target') → RD_Result
                  └─ [present] → RD_Build_Telegram_Body (Code — Romanian summary, includes task_id in tag for support tracing)
                                  → RD_Send_Telegram (n8n-nodes-base.telegram — direct, OR call MO via execute_workflow)
                                    → RD_Mark_Sent_Or_Failed (Postgres UPDATE)
                                      → RD_Result
```

Estimated: ~12-14 nodes, ~14-18 connections. Single new workflow
declared in `n8n_Workflow_Mapping.md`. **Does not duplicate `WF-MO-01`** —
either reuses MO via `executeWorkflow` (preferred for outbound audit
unification) or sends directly through a Telegram node (lower-friction
but doesn't hit `outbound_delivery_ledger_claude_mcp`).

### Decision: call MO or send directly?

- **Direct send pros:** simpler, faster, scheduler-driven semantics
  preserved; uses `task_reminder_deliveries` as the audit (clean
  separation from chain-driven outbound).
- **Direct send cons:** divergent audit story (chain outbound vs.
  reminder outbound).
- **Call-MO pros:** unified outbound audit through
  `outbound_delivery_ledger_claude_mcp`.
- **Call-MO cons:** MO contract requires `execution_context_id NOT
  NULL` (chain-shape) — would need a synthesised EC or a contract
  loosening (small migration in `outbound_delivery_ledger_claude_mcp`
  to make `execution_context_id` nullable for scheduler-origin rows).

**Recommended for Phase 1 v1:** direct send through a guarded Telegram
node, audit through `task_reminder_deliveries`. Keep MO untouched.
Phase 2+ can unify if desired.

## Idempotency / replay safety

- The UNIQUE `(tenant_id, task_id, due_occurrence_iso)` constraint on
  `task_reminder_deliveries` guarantees a single delivery row per
  (task, occurrence). Even if the scheduler runs twice within a
  minute, the second `INSERT … ON CONFLICT … DO UPDATE` only updates
  `last_attempt_at`/`attempts`; it does not re-send if the prior row
  is `delivery_status='sent'`.
- The pre-send query already filters
  `delivery_status NOT IN ('sent')`.
- Scheduler concurrency must be capped (n8n setting:
  `executionOrder='v1'` + per-tick LIMIT) to prevent multiple ticks
  from racing on the same candidate.

## Tests for Phase 1

Reuse Phase 0's 20 dry-run tests + add:

21. Real-target controlled fire to a sandbox Telegram chat (one
    end-to-end probe, gated on the tenant onboarding policy).
22. Failure path: simulated Telegram 4xx → row marked
    `delivery_status='failed'`, `last_error` populated, retry count
    incremented; next tick retries up to N times then marks
    `'failed_terminal'`.
23. UNIQUE constraint replay: insert two scheduler ticks within a
    minute → exactly 1 row in `task_reminder_deliveries`.
24. Backlog throttle: a task 25 h past-due gets
    `delivery_status='skipped_backlog'` on first run; not retried
    next tick.
25. Timezone localisation: tenant `Europe/Bucharest` → reminder text
    shows local time, not UTC.

## Out of scope for Phase 1 v1

- Recurring reminders.
- Snooze (`reminder_delivery.status='snoozed_until'`) — defer to v2.
- Multi-channel (`whatsapp`) delivery.
- Cross-tenant fan-out for shared tasks.
- Per-user delivery preferences (per-task targets).

## Mission rollout plan

1. **`REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION`** —
   migration + WF-RD-01 + dry-run + minimal live probe (sandbox
   target).
2. **`REMINDER_DELIVERY_LAYER_PRODUCTION_TENANT_TARGET_POLICY`** —
   tenant onboarding flow for `telegram_chat_id` (and any fallback).
3. **`REMINDER_DELIVERY_LAYER_RECURRING_AND_SNOOZE`** — v2 features.
