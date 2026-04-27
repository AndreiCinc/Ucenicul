-- 04_parameterized_upsert.sql — SQL body used by PL_Upsert_Plan node
-- This matches the `query` field in workflows/WF-PL-01_Plan_Builder.json (PL_Upsert_Plan).
-- Extracted here for standalone audit + replay testing.
--
-- Parameters (order matters — matches n8n queryParams order):
--   $1 = plan_id            (UUID)          — _plan_envelope.plan_id
--   $2 = tenant_id          (UUID)          — top-level tenant_id
--   $3 = execution_id       (UUID)          — top-level execution_id
--   $4 = thread_id          (UUID)          — top-level thread_id
--   $5 = status             (TEXT)          — always 'planned' at insert time
--   $6 = steps              (JSONB)         — JSON.stringify(_plan_envelope.steps)
--   $7 = validation         (JSONB)         — JSON.stringify(_plan_envelope.validation)
--   $8 = plan_envelope_version (TEXT)       — 'pl-01.v1'
--   $9 = idempotency_key    (TEXT)          — top-level idempotency_key
--
-- Semantics:
--   - INSERT on ON CONFLICT (idempotency_key) DO NOTHING — new plan case
--   - Union with SELECT on existing row — replay case
--   - UPDATE execution_contexts.current_plan_ref atomically in the same statement
--   - Return the plan row + replayed flag

WITH ins AS (
  INSERT INTO execution_plans (
    id, tenant_id, execution_id, thread_id,
    status, steps, validation, plan_envelope_version, idempotency_key
  )
  VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *, false AS replayed
),
existing AS (
  SELECT *, true AS replayed
  FROM execution_plans
  WHERE idempotency_key = $9
    AND NOT EXISTS (SELECT 1 FROM ins)
),
both AS (
  SELECT * FROM ins
  UNION ALL
  SELECT * FROM existing
),
upd AS (
  UPDATE execution_contexts
    SET current_plan_ref = (SELECT id FROM both),
        updated_at = now()
  WHERE id = $3
  RETURNING id
)
SELECT * FROM both;
