-- WF-ME-01 load execution context by execution_context_id + tenant
SELECT
  ec.id,
  ec.tenant_id,
  ec.thread_id,
  ec.trigger_message_id,
  ec.status,
  ec.current_goal,
  ec.current_plan_ref,
  ec.pending_steps,
  ec.completed_steps,
  ec.created_at,
  ec.updated_at
FROM public.execution_contexts ec
WHERE ec.id = $1::uuid
  AND ec.tenant_id = $2::uuid
LIMIT 1;
