-- WF-ME-01 test fixtures
INSERT INTO public.tasks (
  tenant_id,
  title,
  description,
  priority,
  due_type,
  due_date,
  status,
  source,
  metadata
) VALUES
  ($1::uuid, 'Fixture Task A', 'WF-ME-01 fixture', 'normal', 'date', CURRENT_DATE + INTERVAL '1 day', 'open', 'wf_me_01_fixture', '{"fixture": true}'::jsonb),
  ($1::uuid, 'Fixture Task B', 'WF-ME-01 fixture', 'high', 'date', CURRENT_DATE + INTERVAL '2 day', 'open', 'wf_me_01_fixture', '{"fixture": true}'::jsonb)
RETURNING id, title;
