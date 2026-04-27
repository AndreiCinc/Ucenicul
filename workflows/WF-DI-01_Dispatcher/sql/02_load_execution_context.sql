-- WF-DI-01 / 02_load_execution_context.sql
SELECT
  ec.id::text AS execution_id,
  ec.tenant_id::text AS tenant_id,
  ec.thread_id::text AS thread_id,
  ec.trigger_message_id::text AS trigger_message_id,
  ec.idempotency_key,
  ec.status
FROM public.execution_contexts ec
WHERE ec.id = $1::uuid
  AND ec.tenant_id = $2::uuid
  AND ec.thread_id = $3::uuid
LIMIT 1;
