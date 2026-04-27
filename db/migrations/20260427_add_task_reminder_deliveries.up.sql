-- Migration: 20260427_add_task_reminder_deliveries
-- Mission: REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION (Phase 1).
-- Purpose: dedicated audit/idempotency ledger for reminder deliveries.
-- Additive only — does not touch public.tasks, public.reminders, or
--                  public.outbound_delivery_ledger_claude_mcp.
-- Rollback: see 20260427_add_task_reminder_deliveries.down.sql

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

COMMENT ON TABLE public.task_reminder_deliveries IS
  'Reminder Delivery Layer v1 audit/idempotency ledger. Per-occurrence delivery state for tasks consumed by WF-RD-01_Reminder_Delivery_Scheduler. UNIQUE (tenant_id, task_id, due_occurrence_iso) guarantees one delivery row per (task, occurrence). delivery_status ∈ {pending, sent, failed, failed_terminal, skipped_missing_target, skipped_backlog, dry_run}.';

COMMIT;
