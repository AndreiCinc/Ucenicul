-- WF-ME-01 update task for task_module
UPDATE public.tasks
SET
  title = COALESCE($3::text, title),
  description = COALESCE($4::text, description),
  priority = COALESCE($5::text, priority),
  due_date = COALESCE($6::date, due_date),
  due_at = COALESCE($7::timestamptz, due_at),
  updated_at = now()
WHERE tenant_id = $1::uuid
  AND id = $2::uuid
RETURNING id, tenant_id, title, description, priority, due_date, due_at, updated_at;
