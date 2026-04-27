-- 10_fixtures_create.sql — WF-EC-01 fixture creation.
-- All rows are clearly marked with `wfec01_fixture_` prefix in idempotency_key
-- so cleanup is unambiguous.

-- Ensure tenant #2 for cross-tenant tests
INSERT INTO public.tenants (id, name, slug, vertical, organization_id, display_name, is_active, timezone, currency_code, metadata)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000002',
  'EC Stage Fixture Tenant',
  'ec-stage-fixture-tenant',
  'test',
  (SELECT organization_id FROM public.tenants WHERE id='aaaaaaaa-0000-0000-0000-000000000001' LIMIT 1),
  'EC Stage Fixture Tenant',
  true,
  'Europe/Bucharest',
  'RON',
  '{"fixture": "wfec01"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Ensure a thread owned by tenant #1
INSERT INTO public.threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, source_channels, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-00000000ec01',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'EC fixture thread t1',
  'operational',
  'active',
  'WF-EC-01 fixture thread for tenant 1',
  NOW(),
  ARRAY['telegram']::text[],
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Ensure a thread owned by tenant #2 (for cross-tenant tests)
INSERT INTO public.threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, source_channels, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-00000000ec02',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'EC fixture thread t2',
  'operational',
  'active',
  'WF-EC-01 fixture thread for tenant 2',
  NOW(),
  ARRAY['telegram']::text[],
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Pre-placed trigger messages (to simulate TR → EC handoff)
-- organization_id is NOT NULL; inherit from the owning tenant.
INSERT INTO public.messages (id, organization_id, thread_id, tenant_id, normalized_content, direction, author_type, channel, source_message_ref, timestamp, created_at)
VALUES
  ('eeeeeeec-0100-0000-0000-000000000001',
   (SELECT organization_id FROM public.tenants WHERE id='aaaaaaaa-0000-0000-0000-000000000001' LIMIT 1),
   NULL, 'aaaaaaaa-0000-0000-0000-000000000001', 'WF-EC-01 happy path trigger', 'inbound', 'user', 'telegram', 'ec_happy_trigger_1', NOW(), NOW()),
  ('eeeeeeec-0100-0000-0000-000000000002',
   (SELECT organization_id FROM public.tenants WHERE id='aaaaaaaa-0000-0000-0000-000000000002' LIMIT 1),
   NULL, 'aaaaaaaa-0000-0000-0000-000000000002', 'WF-EC-01 cross tenant trigger', 'inbound', 'user', 'telegram', 'ec_happy_trigger_2', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
