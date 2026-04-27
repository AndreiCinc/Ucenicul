-- WF-RA-01 read-path probe
WITH ctx AS (
  SELECT id, tenant_id, thread_id, status
  FROM public.execution_contexts
  WHERE id = $1::uuid
    AND tenant_id = $2::uuid
  LIMIT 1
)
SELECT *
FROM ctx;
