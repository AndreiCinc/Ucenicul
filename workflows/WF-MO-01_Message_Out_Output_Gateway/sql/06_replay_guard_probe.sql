-- Preferred replay probe against an append-only outbound log.
-- If the live schema supports a dedicated idempotency storage, Claude may pivot to it.
SELECT id, tenant_id, direction, source, content, created_at
FROM public.messages
WHERE tenant_id = $1::uuid
  AND direction = 'outbound'
  AND content = $2
ORDER BY created_at DESC
LIMIT 1;