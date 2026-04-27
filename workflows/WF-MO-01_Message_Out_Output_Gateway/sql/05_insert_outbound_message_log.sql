-- Append-only outbound log.
-- Use only after a provider-send attempt has been resolved.
INSERT INTO public.messages (
  tenant_id,
  direction,
  source,
  content,
  intent,
  created_at
)
VALUES (
  $1::uuid,
  'outbound',
  $2,
  $3,
  'message_out',
  now()
)
RETURNING id, tenant_id, direction, source, content, created_at;