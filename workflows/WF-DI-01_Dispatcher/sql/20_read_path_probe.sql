-- WF-DI-01 / 20_read_path_probe.sql
SELECT
  ec.id::text AS execution_id,
  ec.tenant_id::text AS tenant_id,
  ec.thread_id::text AS thread_id,
  ec.status
FROM public.execution_contexts ec
WHERE ec.tenant_id = $1::uuid
ORDER BY ec.created_at DESC
LIMIT 5;
