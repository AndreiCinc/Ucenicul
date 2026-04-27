-- Load thread context for RC composition (read-only, tenant-scoped)
SELECT id, tenant_id, title, summary, status, last_activity_at
FROM public.threads
WHERE id = $1::uuid
  AND tenant_id = $2::uuid
LIMIT 1;
