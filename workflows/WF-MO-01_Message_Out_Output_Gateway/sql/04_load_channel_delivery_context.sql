-- Preferred MVP routing lookup: tenant-scoped Telegram target if available.
SELECT
  id AS tenant_id,
  'telegram'::text AS channel,
  telegram_chat_id::text AS delivery_target
FROM public.tenants
WHERE id = $1::uuid;