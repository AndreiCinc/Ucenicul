-- WF-ME-01 create task for task_module
INSERT INTO public.tasks (
  tenant_id,
  title,
  description,
  priority,
  due_type,
  due_date,
  due_at,
  status,
  source,
  metadata
) VALUES (
  $1::uuid,
  $2::text,
  $3::text,
  $4::text,
  $5::text,
  $6::date,
  $7::timestamptz,
  'open',
  'wf_me_01',
  COALESCE($8::jsonb, '{}'::jsonb)
)
RETURNING id, tenant_id, title, status, due_type, due_date, due_at, created_at;
