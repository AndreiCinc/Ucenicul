-- 05_parameterized_replay_select.sql — standalone replay SELECT
-- Used when the node needs to verify a plan exists before attempting any
-- superseding write (NOT in default PL-01 scope; kept for V4 replay tests).
--
-- Parameters:
--   $1 = idempotency_key (TEXT)
--
-- Returns the existing plan row if present, or zero rows.

SELECT
  id,
  tenant_id,
  execution_id,
  thread_id,
  status,
  steps,
  validation,
  plan_envelope_version,
  idempotency_key,
  created_at,
  updated_at,
  expires_at,
  true AS replayed
FROM execution_plans
WHERE idempotency_key = $1
LIMIT 1;
