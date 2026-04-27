-- WF-RA-01 fixtures create (read-only stage baseline helper)
-- Use only in isolated verification environments.
INSERT INTO public.execution_contexts (id, tenant_id, thread_id, trigger_message_id, status, current_goal, pending_steps, completed_steps, created_at, updated_at)
VALUES (
  $1::uuid,
  $2::uuid,
  $3::uuid,
  $4::uuid,
  'initialized',
  'aggregate module results',
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
