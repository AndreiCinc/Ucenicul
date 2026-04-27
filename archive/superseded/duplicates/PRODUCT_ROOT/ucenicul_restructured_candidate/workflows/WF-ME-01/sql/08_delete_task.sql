-- WF-ME-01 delete task for task_module
DELETE FROM public.tasks
WHERE tenant_id = $1::uuid
  AND (
    ($2::uuid IS NOT NULL AND id = $2::uuid)
    OR ($3::text IS NOT NULL AND title ILIKE $3::text)
  )
RETURNING id, tenant_id, title;
