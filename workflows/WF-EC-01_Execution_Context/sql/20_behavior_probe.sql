-- 20_behavior_probe.sql — Minimal live probes for the upsert and load queries
-- against the execution_contexts table. Non-destructive: uses stage-marked
-- idempotency_keys and relies on ON CONFLICT DO NOTHING for replay safety.

-- Probe 1: happy-path insert
INSERT INTO execution_contexts (
  tenant_id, thread_id, trigger_message_id, status,
  pending_steps, completed_steps, idempotency_key, expires_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  '11111111-0000-0000-0000-00000000ec01'::uuid,
  'eeeeeeec-0100-0000-0000-000000000001'::uuid,
  'initialized',
  '[]'::jsonb, '[]'::jsonb,
  'wfec01_fixture_probe_happy_v1',
  (NOW() + INTERVAL '15 minutes')::timestamptz
)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id, status, idempotency_key;

-- Probe 2: replay (should return 0 rows on CONFLICT, row already exists)
INSERT INTO execution_contexts (
  tenant_id, thread_id, trigger_message_id, status,
  pending_steps, completed_steps, idempotency_key, expires_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  '11111111-0000-0000-0000-00000000ec01'::uuid,
  'eeeeeeec-0100-0000-0000-000000000001'::uuid,
  'initialized',
  '[]'::jsonb, '[]'::jsonb,
  'wfec01_fixture_probe_happy_v1',
  (NOW() + INTERVAL '15 minutes')::timestamptz
)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id, status, idempotency_key;

-- Probe 3: canonical read after upsert (single row, idempotent)
SELECT id, tenant_id, thread_id, trigger_message_id, status, pending_steps, completed_steps,
       idempotency_key, expires_at, created_at, updated_at
FROM execution_contexts
WHERE idempotency_key = 'wfec01_fixture_probe_happy_v1'
  AND tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid
LIMIT 1;
