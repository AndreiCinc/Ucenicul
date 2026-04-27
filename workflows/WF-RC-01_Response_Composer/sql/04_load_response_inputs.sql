-- Convenience read for RC composition (read-only)
SELECT ec.id AS execution_context_id,
       ec.tenant_id,
       ec.thread_id,
       ec.status AS execution_status,
       th.title AS thread_title,
       th.summary AS thread_summary,
       th.status AS thread_status
FROM public.execution_contexts ec
JOIN public.threads th
  ON th.id = ec.thread_id
 AND th.tenant_id = ec.tenant_id
WHERE ec.id = $1::uuid
  AND ec.tenant_id = $2::uuid
LIMIT 1;
