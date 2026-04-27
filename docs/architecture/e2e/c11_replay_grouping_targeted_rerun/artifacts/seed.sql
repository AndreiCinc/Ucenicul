-- C11_REPLAY_GROUPING_TARGETED_RERUN seed pack.
-- Idempotent: ON CONFLICT (id) DO NOTHING.
-- Pre-seeds the threads + messages for the replay group and fresh control.

BEGIN;

-- 1) E2E default tenant — already exists post-VARIANT_SWEEP, but upsert is idempotent.
INSERT INTO tenants (id, organization_id, name, slug, vertical, display_name, is_active, timezone, currency_code, metadata)
VALUES (
  'eee0e2e0-0000-0000-0000-000000000001'::uuid,
  '38fde66e-3920-4bf3-9d70-ddbca9faf58a'::uuid,
  'e2e-default', 'e2e-default', 'e2e', 'E2E Default Lane', true, 'Europe/Bucharest', 'EUR', '{"e2e":true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2) Threads
INSERT INTO threads (id, tenant_id, title, thread_type, status, source_channels) VALUES
  ('8567245f-ae46-4cb8-847d-09f7c1a434a1'::uuid, 'eee0e2e0-0000-0000-0000-000000000001'::uuid,
   'e2e:c11rg-2026-04-27:C11:replay-L1', 'operational', 'new', ARRAY['e2e-rich-matrix']::varchar[]),
  ('9bcfc96c-71b0-4388-895a-d25406e56fb1'::uuid, 'eee0e2e0-0000-0000-0000-000000000001'::uuid,
   'e2e:c11rg-2026-04-27-fresh:C11:replay-L1', 'operational', 'new', ARRAY['e2e-rich-matrix']::varchar[])
ON CONFLICT (id) DO NOTHING;

-- 3) Messages (intent pre-set to store_memory per harness mapping for C11).
-- Message #1 is shared by the 4 main replay-group fires (same id ⇒ chain-level dedupe).
-- Message #2 is fresh control.
INSERT INTO messages (id, organization_id, tenant_id, thread_id, direction, author_type, channel, normalized_content, source_message_ref, content, intent, created_at, updated_at) VALUES
  ('01b22ee4-3f47-4e5e-8922-0103fb40c918'::uuid,
   '38fde66e-3920-4bf3-9d70-ddbca9faf58a'::uuid,
   'eee0e2e0-0000-0000-0000-000000000001'::uuid,
   '8567245f-ae46-4cb8-847d-09f7c1a434a1'::uuid,
   'inbound', 'user', 'e2e-rich-matrix',
   'Ține minte că prefer email dimineața.',
   'e2e:C11-RG-001', 'Ține minte că prefer email dimineața.',
   'store_memory', NOW(), NOW()),
  ('077fa147-686d-4702-861e-6ded636405ae'::uuid,
   '38fde66e-3920-4bf3-9d70-ddbca9faf58a'::uuid,
   'eee0e2e0-0000-0000-0000-000000000001'::uuid,
   '9bcfc96c-71b0-4388-895a-d25406e56fb1'::uuid,
   'inbound', 'user', 'e2e-rich-matrix',
   'Ține minte că prefer email dimineața.',
   'e2e:C11-RG-005', 'Ține minte că prefer email dimineața.',
   'store_memory', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
