-- WF-ME-01 load dispatch request / plan step payload
SELECT
  ec.id AS execution_context_id,
  ec.tenant_id,
  ec.thread_id,
  ec.current_plan_ref,
  p.plan_id,
  p.status AS plan_status,
  p.goal,
  p.primary_intent,
  p.steps
FROM public.execution_contexts ec
JOIN public.execution_plans p
  ON p.execution_context_id = ec.id
WHERE ec.id = $1::uuid
  AND ec.tenant_id = $2::uuid
LIMIT 1;
