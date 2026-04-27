-- WF-RA-01 load module results (read-only documentation probe)
--
-- NOTE: In the MVP canonical runtime there is NO dedicated `module_results`
-- table. Module results are handed off to WF-RA-01 in-payload from the
-- WF-ME-01 fan-in layer (see docs 19_MODULE_CONTRACTS.md and the RA stage
-- definition 10_STAGE_WF-RA-01.md). This file exists to (a) satisfy the
-- canonical filename contract, and (b) document the scoping requirements
-- any future persistent module_results table would need to honour.
--
-- Required scoping for any future persistent module_results store:
--   - tenant_id
--   - execution_context_id
--   - thread_id
--   - step_id
--
-- This probe is intentionally read-only and non-destructive. It asserts
-- the execution context still exists and is owned by the same tenant;
-- it does not attempt to read from a table that is not guaranteed to
-- exist in MVP.
SELECT
  id                  AS execution_context_id,
  tenant_id           AS tenant_id,
  thread_id           AS thread_id,
  status              AS execution_context_status,
  pending_steps       AS pending_steps,
  completed_steps     AS completed_steps,
  updated_at          AS updated_at
FROM public.execution_contexts
WHERE id = $1::uuid
  AND tenant_id = $2::uuid
LIMIT 1;
