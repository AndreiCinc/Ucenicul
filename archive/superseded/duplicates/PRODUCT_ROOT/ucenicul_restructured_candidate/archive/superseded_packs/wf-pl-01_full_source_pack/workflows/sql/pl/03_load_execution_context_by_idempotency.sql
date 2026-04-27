-- WF-PL-01 / 03_load_execution_context_by_idempotency.sql
-- Replay-safe read path by synthesized or canonical idempotency key.

SELECT
  ec.id::text AS execution_id,
  ec.tenant_id::text AS tenant_id,
  ec.thread_id::text AS thread_id,
  ec.trigger_message_id::text AS trigger_message_id,
  ec.idempotency_key,
  ec.status
FROM public.execution_contexts ec
WHERE ec.idempotency_key = $1
  AND ec.tenant_id = $2::uuid
LIMIT 1;
