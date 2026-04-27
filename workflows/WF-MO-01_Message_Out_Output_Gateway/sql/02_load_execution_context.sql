SELECT id, tenant_id, thread_id, status, updated_at
FROM public.execution_contexts
WHERE id = $1::uuid
  AND tenant_id = $2::uuid;