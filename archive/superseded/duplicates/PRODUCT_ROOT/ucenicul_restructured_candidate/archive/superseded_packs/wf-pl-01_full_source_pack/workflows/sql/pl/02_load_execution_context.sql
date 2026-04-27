-- WF-PL-01 / 02_load_execution_context.sql
-- Canonical read path for plan-generation proof.

SELECT
  ec.id::text AS execution_id,
  ec.tenant_id::text AS tenant_id,
  ec.thread_id::text AS thread_id,
  ec.trigger_message_id::text AS trigger_message_id,
  ec.idempotency_key,
  ec.status,
  CASE
    WHEN ec.expires_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (ec.expires_at - ec.created_at))::int
  END AS ttl_seconds
FROM public.execution_contexts ec
WHERE ec.id = $1::uuid
  AND ec.tenant_id = $2::uuid
  AND ec.thread_id = $3::uuid
LIMIT 1;
