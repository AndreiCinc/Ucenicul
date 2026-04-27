-- Load execution context for RC lineage verification (read-only, tenant-scoped)
SELECT id, tenant_id, thread_id, status, current_plan_ref, updated_at
FROM public.execution_contexts
WHERE id = $1::uuid
  AND tenant_id = $2::uuid
LIMIT 1;
