-- WF-OR-01 :: read-path probe
-- Parameter order:
--   $1 = execution_id
--   $2 = tenant_id
--   $3 = thread_id

WITH candidate AS (
  SELECT
    ec.id::text                  AS execution_id,
    ec.tenant_id::text           AS tenant_id,
    ec.thread_id::text           AS thread_id,
    ec.trigger_message_id::text  AS trigger_message_id,
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
)
SELECT
  execution_id,
  tenant_id,
  thread_id,
  trigger_message_id,
  idempotency_key,
  status,
  ttl_seconds,
  CASE WHEN status = 'initialized' THEN true ELSE false END AS planning_allowed
FROM candidate;
