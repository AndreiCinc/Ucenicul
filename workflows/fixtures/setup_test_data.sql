
-- ============================================
-- WF-TR-01 Test Data Setup SQL (v3.0)
-- Run this AFTER creating the schema tables
-- (threads, entities, thread_resolution_audit)
-- AND after running the messages migration script
-- ============================================
-- IMPORTANT: UUIDs must be valid hex format.
-- Previous version used invalid UUIDs (tttttttt, mmmmmmmm).
-- This version uses valid hex UUIDs.
-- ============================================

-- Test entities
INSERT INTO entities (id, tenant_id, entity_type, display_name, status, created_at, updated_at)
VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'person', 'Ion Popescu', 'active', NOW(), NOW()),
  ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'person', 'Maria Ionescu', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Test threads
INSERT INTO threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at, updated_at)
VALUES
  -- TC-01/TC-02/TC-03/TC-14: Active apartment discussion thread
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Apartament centru Ion', 'task', 'active',
   'Ion cauta apartament in centru, discutie despre pret si locatie',
   NOW() - INTERVAL '2 hours', 'eeeeeeee-0000-0000-0000-000000000001', '{}', '{telegram}',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),

  -- TC-04: Latent invoice discussion thread
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Factura Maria', 'task', 'latent',
   'Maria are o factura de trimis, discutie veche',
   NOW() - INTERVAL '10 days', 'eeeeeeee-0000-0000-0000-000000000002', '{}', '{telegram}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'),

  -- TC-05: General project discussion (background)
  ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Proiect general', 'general', 'active',
   'Discutie generala despre proiect',
   NOW() - INTERVAL '5 days', NULL, '{}', '{telegram}',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),

  -- TC-06: Ambiguity test thread A (identical scores expected)
  ('44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Proiect important A', 'task', 'active',
   'proiect important detalii noi informatii',
   NOW() - INTERVAL '1 hour', NULL, '{}', '{telegram}',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'),

  -- TC-06: Ambiguity test thread B (identical scores expected)
  ('55555555-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Proiect important B', 'task', 'active',
   'proiect important detalii noi update',
   NOW() - INTERVAL '1 hour', NULL, '{}', '{telegram}',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'),

  -- TC-14: Exact boundary test (score = 0.75)
  ('66666666-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'Apartament Test Boundary', 'task', 'active',
   'apartament pret locatie centru',
   NOW() - INTERVAL '12 hours', NULL, '{}', '{telegram}',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours'),

  -- TC-13: Latent thread above strict attach threshold
  ('77777777-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', 'Factura Maria veche', 'task', 'latent',
   'factura veche discutie reanoi contact cu Maria despre trimis',
   NOW() - INTERVAL '15 days', 'eeeeeeee-0000-0000-0000-000000000002', '{}', '{telegram}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '15 days')

ON CONFLICT (id) DO NOTHING;

-- Test messages for reply linkage
-- NOTE: These INSERTs require the messages migration to have been applied first.
-- The messages table must have: thread_id, channel, author_type, normalized_content,
-- source_message_ref, timestamp columns.
-- If migration has NOT been applied, skip these inserts.
--
-- INSERT INTO messages (id, tenant_id, organization_id, channel, direction, author_type, content,
--    normalized_content, "timestamp", source_message_ref, thread_id, created_at)
-- VALUES
--   -- TC-02/TC-12: Message with thread_id for reply linkage testing
--   ('aaaabbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
--    '<org_id>', 'telegram', 'inbound', 'user',
--    'Mesaj original despre apartament in centru',
--    'mesaj original despre apartament in centru',
--    NOW() - INTERVAL '3 hours', 'tg_msg_001', '11111111-0000-0000-0000-000000000001',
--    NOW() - INTERVAL '3 hours'),
--
--   -- TC-15: Message without thread_id (fallthrough to scoring)
--   ('aaaabbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
--    '<org_id>', 'telegram', 'inbound', 'user',
--    'Mesaj fara thread asociat',
--    'mesaj fara thread asociat',
--    NOW() - INTERVAL '5 hours', 'tg_msg_002', NULL,
--    NOW() - INTERVAL '5 hours')
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- UUID Mapping (old fixture IDs -> new valid UUIDs)
-- ============================================
-- tttttttt-...-001 -> 11111111-...-001 (Apartament centru Ion)
-- tttttttt-...-002 -> 22222222-...-002 (Factura Maria latent)
-- tttttttt-...-003 -> 33333333-...-003 (Proiect general)
-- tttttttt-...-004 -> 44444444-...-004 (Proiect important A)
-- tttttttt-...-005 -> 55555555-...-005 (Proiect important B)
-- tttttttt-...-006 -> 66666666-...-006 (Boundary test)
-- tttttttt-...-007 -> 77777777-...-007 (Factura Maria veche)
-- mmmmmmmm-...-001 -> aaaabbbb-...-001 (Reply linkage message)
-- mmmmmmmm-...-002 -> aaaabbbb-...-002 (No-thread message)
-- ============================================
