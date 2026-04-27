-- WF-ME-01 write path probe
SELECT
  COUNT(*) AS tasks_before
FROM public.tasks
WHERE tenant_id = $1::uuid;

-- Run create/update/complete/delete against fixture rows only in live proof.

SELECT
  COUNT(*) AS tasks_after
FROM public.tasks
WHERE tenant_id = $1::uuid;
