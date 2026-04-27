SELECT id, tenant_id, status, last_activity_at
FROM public.threads
WHERE id = $1::uuid
  AND tenant_id = $2::uuid;