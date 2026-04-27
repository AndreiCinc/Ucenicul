-- WF-ME-01 read path probe
SELECT
  COUNT(*) AS execution_context_rows
FROM public.execution_contexts
WHERE tenant_id = $1::uuid;

SELECT
  COUNT(*) AS task_rows
FROM public.tasks
WHERE tenant_id = $1::uuid;
