-- WF-ME-01 complete task for task_module
UPDATE public.tasks
SET
  status = 'completed',
  completed_at = now(),
  updated_at = now()
WHERE tenant_id = $1::uuid
  AND id = $2::uuid
  AND status <> 'completed'
RETURNING id, tenant_id, status, completed_at, updated_at;
