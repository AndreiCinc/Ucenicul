-- WF-RA-01 load execution context (read-only)
SELECT id, tenant_id, thread_id, status, current_plan_ref, pending_steps, completed_steps, updated_at
FROM public.execution_contexts
WHERE id = $1::uuid
  AND tenant_id = $2::uuid
LIMIT 1;
