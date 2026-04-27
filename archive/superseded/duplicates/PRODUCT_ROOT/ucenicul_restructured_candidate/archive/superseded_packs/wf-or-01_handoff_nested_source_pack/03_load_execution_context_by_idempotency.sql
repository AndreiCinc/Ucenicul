-- WF-OR-01 :: fallback load by idempotency key
-- Purpose: support runtime diagnostics when execution_id mapping is unclear.
-- Parameter order:
--   $1 = idempotency_key
--   $2 = tenant_id

SELECT
  ec.id::text                  AS execution_id,
  ec.tenant_id::text           AS tenant_id,
  ec.thread_id::text           AS thread_id,
  ec.trigger_message_id::text  AS trigger_message_id,
  ec.idempotency_key,
  ec.status,
  ec.created_at,
  ec.updated_at,
  CASE
    WHEN ec.expires_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (ec.expires_at - ec.created_at))::int
  END AS ttl_seconds
FROM public.execution_contexts ec
WHERE ec.idempotency_key = $1
  AND ec.tenant_id = $2::uuid
LIMIT 1;
