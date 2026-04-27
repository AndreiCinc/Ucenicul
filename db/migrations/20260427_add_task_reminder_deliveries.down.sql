-- Rollback: 20260427_add_task_reminder_deliveries
-- Reverse companion to 20260427_add_task_reminder_deliveries.up.sql.
-- Drops indexes and table. Existing reminder-delivery state is lost; that is
-- acceptable because Phase 1 v1 is opt-in and operators can replay deliveries.

BEGIN;

DROP INDEX IF EXISTS public.task_reminder_deliveries_task_idx;
DROP INDEX IF EXISTS public.task_reminder_deliveries_status_idx;
DROP TABLE IF EXISTS public.task_reminder_deliveries;

COMMIT;
