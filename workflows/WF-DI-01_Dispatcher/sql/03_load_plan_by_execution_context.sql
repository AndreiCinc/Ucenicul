-- WF-DI-01 / 03_load_plan_by_execution_context.sql
-- Dispatcher source packs do not require a canonical plans table yet.
-- This read probe demonstrates the future-safe interface shape if plans are persisted later.
SELECT
  $1::text AS execution_id,
  $2::text AS plan_id,
  'inbound_plan_envelope'::text AS source_kind,
  now()::timestamptz AS observed_at;
