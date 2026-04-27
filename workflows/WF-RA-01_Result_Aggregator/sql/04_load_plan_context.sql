-- WF-RA-01 load plan context (read-only)
--
-- Purpose: expose the plan lineage anchor for the current execution_context
-- so WF-RA-01 can cross-check expected_step_ids from the aggregation_input
-- against the plan metadata recorded upstream by WF-PL-01.
--
-- Scoping (mandatory):
--   - $1 = execution_context_id (uuid)
--   - $2 = tenant_id             (uuid)
--
-- Strict read-only. No writes. No domain side-effects.
SELECT
  id                  AS execution_context_id,
  tenant_id           AS tenant_id,
  thread_id           AS thread_id,
  current_plan_ref    AS current_plan_ref,
  pending_steps       AS pending_steps,
  completed_steps     AS completed_steps,
  status              AS execution_context_status,
  updated_at          AS updated_at
FROM public.execution_contexts
WHERE id = $1::uuid
  AND tenant_id = $2::uuid
LIMIT 1;
