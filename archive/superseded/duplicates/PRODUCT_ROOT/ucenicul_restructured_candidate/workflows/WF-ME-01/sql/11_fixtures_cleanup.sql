-- WF-ME-01 fixture cleanup
DELETE FROM public.tasks
WHERE tenant_id = $1::uuid
  AND source = 'wf_me_01_fixture'
  AND metadata->>'fixture' = 'true'
RETURNING id, title;
