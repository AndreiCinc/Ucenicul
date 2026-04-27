-- WF-MO-01 fixture seed (adjust if the live schema requires additional NOT NULL fields)
INSERT INTO public.threads (id, tenant_id, status, last_activity_at)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'active',
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.execution_contexts (
  id,
  tenant_id,
  thread_id,
  status,
  updated_at
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  'completed',
  now()
)
ON CONFLICT (id) DO NOTHING;