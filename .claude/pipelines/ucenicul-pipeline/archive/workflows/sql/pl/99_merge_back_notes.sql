-- 99_merge_back_notes.sql — notes for migrating execution_plans_claude_mcp → execution_plans
-- ==========================================================================
-- ONLY relevant if the fallback path (03_create_table_fallback_claude_mcp.sql) was taken.
-- Execute these notes as a LATER migration step, NOT during PL-01 build.
-- ==========================================================================

-- Pre-conditions for merge-back:
-- 1) public.execution_plans has been created with the same (or compatible superset) shape
--    per 02_create_table_candidate.sql.
-- 2) No live node/workflow still references execution_plans_claude_mcp (update node
--    template variables first).
-- 3) Full before-snapshot of both tables has been captured.

-- Step 1 — copy rows (replace-if-missing)
INSERT INTO public.execution_plans (
  id, tenant_id, execution_id, thread_id, status, steps, validation,
  plan_envelope_version, idempotency_key, created_at, updated_at, expires_at
)
SELECT
  id, tenant_id, execution_id, thread_id, status, steps, validation,
  plan_envelope_version, idempotency_key, created_at, updated_at, expires_at
FROM public.execution_plans_claude_mcp
ON CONFLICT (idempotency_key) DO NOTHING;

-- Step 2 — verify row counts match
SELECT
  (SELECT count(*) FROM public.execution_plans_claude_mcp) AS fallback_count,
  (SELECT count(*) FROM public.execution_plans)            AS canonical_count,
  (SELECT count(*) FROM public.execution_plans p
     JOIN public.execution_plans_claude_mcp f ON f.idempotency_key = p.idempotency_key) AS overlap_count;

-- Step 3 — once overlap_count == fallback_count, the fallback can be dropped
-- in a separate migration window with explicit user approval.
-- DROP TABLE public.execution_plans_claude_mcp;  -- NOT executed here.

-- Step 4 — update execution_contexts.current_plan_ref if any row still points
-- to a _claude_mcp id. Since ids are preserved across tables, a pointer update
-- is only required if the canonical id generation differs from fallback. In
-- the PL-01 design both tables use the same deterministic plan_id derivation
-- from (execution_id, idempotency_key), so pointers should already be correct.
