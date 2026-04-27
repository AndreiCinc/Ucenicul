-- WF-RA-01 replay/idempotency probe (read-only)
SELECT id, tenant_id, thread_id, status, updated_at
FROM public.execution_contexts
WHERE tenant_id = $1::uuid
  AND metadata->>'idempotency_key' = $2
ORDER BY updated_at DESC
LIMIT 1;
