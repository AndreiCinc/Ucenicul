-- WF-ME-01 load task candidates for update/complete/delete
SELECT
  t.id,
  t.tenant_id,
  t.title,
  t.description,
  t.priority,
  t.status,
  t.due_type,
  t.due_date,
  t.due_at,
  t.created_at,
  t.updated_at
FROM public.tasks t
WHERE t.tenant_id = $1::uuid
  AND (
    ($2::uuid IS NOT NULL AND t.id = $2::uuid)
    OR ($3::text IS NOT NULL AND t.title ILIKE $3::text)
  )
ORDER BY t.updated_at DESC
LIMIT 50;
