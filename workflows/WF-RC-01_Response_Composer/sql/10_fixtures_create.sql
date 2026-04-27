-- RC fixture seed (safe test-only fixture)
INSERT INTO public.threads (id, tenant_id, title, summary, status, last_activity_at, created_at, updated_at)
VALUES (
  '55555555-5555-5555-5555-555555555555'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  'RC fixture thread',
  'Thread summary for RC fixture',
  'active',
  NOW(), NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.execution_contexts (id, tenant_id, thread_id, status, current_plan_ref, pending_steps, completed_steps, created_at, updated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555555'::uuid,
  'completed',
  'plan-rc-v1',
  '[]'::jsonb,
  '["s1"]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;
