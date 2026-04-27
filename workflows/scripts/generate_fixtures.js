/**
 * generate_fixtures.js
 * WF-TR-01 Thread Resolver — Test Fixture Generator
 *
 * Purpose: Generates all 16 canonical test fixtures for the Thread Resolver.
 * - TC-01 through TC-10: Internal test cases (original)
 * - TC-11 through TC-16: Domain-specific test cases (new)
 *
 * Each fixture includes the input ThreadResolutionRequest and the expected
 * ThreadResolutionResult decision.
 *
 * Usage:
 *   node generate_fixtures.js              Print all fixtures to stdout as JSON
 *   node generate_fixtures.js --file       Write fixtures to fixtures/ directory
 *   node generate_fixtures.js --sql        Generate test data setup SQL
 *
 * Test Case Reference:
 *   TC-01: Explicit thread reference (shortcircuit)
 *   TC-02: Direct reply linkage (shortcircuit via reply_to_message_id)
 *   TC-03: Entity + semantic match (scoring path)
 *   TC-04: Reopen latent thread (scoring path, latent thread)
 *   TC-05: Create new thread (no candidates match)
 *   TC-06: Ambiguous candidate set (two threads within margin)
 *   TC-07: Invalid input (null tenant_id)
 *   TC-08: Deterministic replay (scoring path, non-shortcircuit)
 *   TC-09: Cross-tenant isolation
 *   TC-10: Content class behavior
 *   TC-11: Whitespace-only content (validation edge case)
 *   TC-12: Reply-to-thread-id explicit reference via reply context
 *   TC-13: Latent thread above strict attach threshold (reopen, not attach)
 *   TC-14: Active thread at exact boundary (score = 0.75)
 *   TC-15: Reply to message with no thread_id (fallthrough to scoring)
 *   TC-16: Audit write error path verification
 */

const fs = require('fs');
const path = require('path');

// Constants - Anchor IDs matching all fixtures
const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const TENANT_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const ENTITY_ION = 'eeeeeeee-0000-0000-0000-000000000001';
const ENTITY_MARIA = 'eeeeeeee-0000-0000-0000-000000000002';
const THREAD_ION_APT = 'tttttttt-0000-0000-0000-000000000001';
const THREAD_MARIA_FACTURA = 'tttttttt-0000-0000-0000-000000000002';
const THREAD_GENERAL = 'tttttttt-0000-0000-0000-000000000003';
const THREAD_AMBIG_1 = 'tttttttt-0000-0000-0000-000000000004';
const THREAD_AMBIG_2 = 'tttttttt-0000-0000-0000-000000000005';
const THREAD_BOUNDARY = 'tttttttt-0000-0000-0000-000000000006';
const THREAD_LATENT_HIGH = 'tttttttt-0000-0000-0000-000000000007';
const MSG_ORIGINAL = 'mmmmmmmm-0000-0000-0000-000000000001';
const MSG_NO_THREAD = 'mmmmmmmm-0000-0000-0000-000000000002';

const NOW = '2026-04-15T12:00:00Z';

const fixtures = [
  // ===== Internal Test Cases (TC-01 to TC-10) =====

  {
    id: 'TC-01',
    name: 'Explicit thread reference',
    description: 'Message includes explicit thread_id. Shortcircuits to attach.',
    request: {
      message_id: 'test-msg-001',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Orice text, nu conteaza',
      timestamp: NOW,
      source_message_ref: 'tg_test_001',
      thread_id: THREAD_ION_APT
    },
    expected: {
      decision: 'attach_existing_thread',
      resolved_thread_id: THREAD_ION_APT,
      ambiguity_detected: false,
      candidate_scores_empty: true,
      content_class_used: 'normalized_content'
    }
  },

  {
    id: 'TC-02',
    name: 'Direct reply linkage',
    description: 'Message is a reply to another message that has a thread_id in DB.',
    request: {
      message_id: 'test-msg-002',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Da, sunt de acord cu apartamentul',
      timestamp: NOW,
      source_message_ref: 'tg_test_002',
      reply_to_message_id: MSG_ORIGINAL
    },
    expected: {
      decision: 'attach_existing_thread',
      resolved_thread_id: THREAD_ION_APT,
      ambiguity_detected: false,
      candidate_scores_empty: true,
      content_class_used: 'normalized_content'
    }
  },

  {
    id: 'TC-03',
    name: 'Attach by entity + semantic match',
    description: 'Natural language: author discusses apartment price with Ion. Entity + content match triggers attach. Scoring path test.',
    request: {
      message_id: 'test-msg-003',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Vreau sa vorbesc cu Ion despre apartamentul din centru, sa vedem pretul',
      timestamp: NOW,
      source_message_ref: 'tg_test_003',
      author_entity_id: ENTITY_ION
    },
    expected: {
      decision: 'attach_existing_thread',
      resolved_thread_id: THREAD_ION_APT,
      ambiguity_detected: false,
      content_class_used: 'normalized_content'
    },
    candidate_threads_fixture: [
      {
        thread_id: THREAD_ION_APT,
        thread_status: 'active',
        thread_title: 'Apartament centru Ion',
        score: 0.78,
        entity_match: 0.3,
        semantic_match: 0.28,
        temporal_proximity: 0.15,
        channel_relevance: 0.05
      }
    ]
  },

  {
    id: 'TC-04',
    name: 'Reopen latent thread',
    description: 'Author entity matches latent thread, content overlaps significantly. Score above REOPEN_THRESHOLD (0.65) but thread is latent, not active.',
    request: {
      message_id: 'test-msg-004',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Maria, inca mai ai nevoie de ajutor cu factura care trebuie trimisa?',
      timestamp: NOW,
      source_message_ref: 'tg_test_004',
      author_entity_id: ENTITY_MARIA
    },
    expected: {
      decision: 'reopen_latent_thread',
      resolved_thread_id: THREAD_MARIA_FACTURA,
      ambiguity_detected: false,
      content_class_used: 'normalized_content'
    },
    candidate_threads_fixture: [
      {
        thread_id: THREAD_MARIA_FACTURA,
        thread_status: 'latent',
        thread_title: 'Factura Maria',
        score: 0.68,
        entity_match: 0.3,
        semantic_match: 0.25,
        temporal_proximity: 0.1,
        channel_relevance: 0.03
      }
    ]
  },

  {
    id: 'TC-05',
    name: 'Create new thread',
    description: 'Message content is completely unrelated to existing threads. All scores below threshold.',
    request: {
      message_id: 'test-msg-005',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Vreau sa cumpar o masina noua electrica din Germania si sa o transport in Romania',
      timestamp: NOW,
      source_message_ref: 'tg_test_005'
    },
    expected: {
      decision: 'create_new_thread',
      resolved_thread_id: null,
      ambiguity_detected: false,
      content_class_used: 'normalized_content'
    }
  },

  {
    id: 'TC-06',
    name: 'Ambiguous candidate set',
    description: 'Two threads have nearly identical scores within ambiguity margin (0.05). Ambiguity rule fires -> create new.',
    request: {
      message_id: 'test-msg-006',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'proiect important detalii noi',
      timestamp: NOW,
      source_message_ref: 'tg_test_006'
    },
    expected: {
      decision: 'create_new_thread',
      resolved_thread_id: null,
      ambiguity_detected: true,
      content_class_used: 'normalized_content'
    },
    candidate_threads_fixture: [
      {
        thread_id: THREAD_AMBIG_1,
        thread_status: 'active',
        thread_title: 'Proiect important A',
        score: 0.70,
        entity_match: 0.0,
        semantic_match: 0.35,
        temporal_proximity: 0.2,
        channel_relevance: 0.15
      },
      {
        thread_id: THREAD_AMBIG_2,
        thread_status: 'active',
        thread_title: 'Proiect important B',
        score: 0.70,
        entity_match: 0.0,
        semantic_match: 0.35,
        temporal_proximity: 0.2,
        channel_relevance: 0.15
      }
    ]
  },

  {
    id: 'TC-07',
    name: 'Invalid input',
    description: 'Missing required field (tenant_id). Validator rejects.',
    request: {
      message_id: 'test-msg-007',
      channel: 'telegram'
    },
    expected: {
      decision: 'fail_invalid_input',
      resolved_thread_id: null,
      ambiguity_detected: false,
      content_class_used: 'none',
      error_code: 'INVALID_INPUT'
    }
  },

  {
    id: 'TC-08',
    name: 'Deterministic replay (scoring path)',
    description: 'Replay TC-03 twice. Scoring path must produce identical decision and resolved_thread_id. NOT shortcircuit path.',
    request: {
      message_id: 'test-msg-008a',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Vreau sa vorbesc cu Ion despre apartamentul din centru, sa vedem pretul',
      timestamp: NOW,
      source_message_ref: 'tg_test_008a',
      author_entity_id: ENTITY_ION
    },
    expected: {
      decision: 'attach_existing_thread',
      resolved_thread_id: THREAD_ION_APT,
      deterministic: true
    },
    note: 'Run this fixture twice with same DB state. Both runs must produce the same decision and resolved_thread_id. This tests scoring-path determinism.'
  },

  {
    id: 'TC-09',
    name: 'Cross-tenant isolation',
    description: 'Different tenant (TENANT_B) has no threads. Must create new even with same entity.',
    request: {
      message_id: 'test-msg-009',
      tenant_id: TENANT_B,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Vreau sa vorbesc cu Ion despre apartamentul din centru',
      timestamp: NOW,
      source_message_ref: 'tg_test_009',
      author_entity_id: ENTITY_ION
    },
    expected: {
      decision: 'create_new_thread',
      resolved_thread_id: null,
      ambiguity_detected: false,
      content_class_used: 'normalized_content'
    }
  },

  {
    id: 'TC-10',
    name: 'Content class behavior',
    description: 'Verify that content_class_used is always normalized_content in MVP phase.',
    request: {
      message_id: 'test-msg-010',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Test content class behavior field',
      timestamp: NOW,
      source_message_ref: 'tg_test_010'
    },
    expected: {
      content_class_used: 'normalized_content',
      decision: 'create_new_thread'
    }
  },

  // ===== Domain-Specific Test Cases (TC-11 to TC-16) =====

  {
    id: 'TC-11',
    name: 'Whitespace-only content',
    description: 'Message contains only whitespace. Validator should reject as invalid (empty content).',
    request: {
      message_id: 'test-msg-011',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: '   \n\t   ',
      timestamp: NOW,
      source_message_ref: 'tg_test_011'
    },
    expected: {
      decision: 'fail_invalid_input',
      resolved_thread_id: null,
      ambiguity_detected: false,
      content_class_used: 'none',
      error_code: 'INVALID_INPUT'
    }
  },

  {
    id: 'TC-12',
    name: 'Reply-to-thread-id explicit reference',
    description: 'Message has explicit thread reference in reply context (priority 2 shortcircuit).',
    request: {
      message_id: 'test-msg-012',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Sunt de acord cu decizia',
      timestamp: NOW,
      source_message_ref: 'tg_test_012',
      reply_to_message_id: MSG_ORIGINAL
    },
    expected: {
      decision: 'attach_existing_thread',
      resolved_thread_id: THREAD_ION_APT,
      ambiguity_detected: false,
      candidate_scores_empty: true,
      content_class_used: 'normalized_content'
    },
    note: 'Tests the reply_to_message_id → thread lookup (priority 2) shortcircuit path.'
  },

  {
    id: 'TC-13',
    name: 'Latent thread above strict attach threshold',
    description: 'Latent thread scores 0.85 (above STRICT_ATTACH_THRESHOLD 0.75). Should reopen (not attach).',
    request: {
      message_id: 'test-msg-013',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'factura veche discutie reanoi contact cu Maria despre trimis',
      timestamp: NOW,
      source_message_ref: 'tg_test_013',
      author_entity_id: ENTITY_MARIA
    },
    expected: {
      decision: 'reopen_latent_thread',
      resolved_thread_id: THREAD_LATENT_HIGH,
      ambiguity_detected: false,
      content_class_used: 'normalized_content'
    },
    candidate_threads_fixture: [
      {
        thread_id: THREAD_LATENT_HIGH,
        thread_status: 'latent',
        thread_title: 'Factura Maria veche',
        score: 0.85,
        entity_match: 0.3,
        semantic_match: 0.35,
        temporal_proximity: 0.15,
        channel_relevance: 0.05
      }
    ],
    note: 'Spec deviation verification (D-16): latent thread above attach threshold should reopen, not attach.'
  },

  {
    id: 'TC-14',
    name: 'Active thread at exact boundary (score = 0.75)',
    description: 'Active thread scores exactly STRICT_ATTACH_THRESHOLD (0.75). Should attach (>= is inclusive).',
    request: {
      message_id: 'test-msg-014',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'apartament pret locatie centru discutie',
      timestamp: NOW,
      source_message_ref: 'tg_test_014'
    },
    expected: {
      decision: 'attach_existing_thread',
      resolved_thread_id: THREAD_BOUNDARY,
      ambiguity_detected: false,
      content_class_used: 'normalized_content'
    },
    candidate_threads_fixture: [
      {
        thread_id: THREAD_BOUNDARY,
        thread_status: 'active',
        thread_title: 'Apartament Test Boundary',
        score: 0.75,
        entity_match: 0.2,
        semantic_match: 0.3,
        temporal_proximity: 0.15,
        channel_relevance: 0.1
      }
    ],
    note: 'Boundary condition test: score >= threshold (inclusive).'
  },

  {
    id: 'TC-15',
    name: 'Reply to message with no thread_id',
    description: 'Message replies to another message, but that message has no thread_id in DB. Fallthrough to scoring path.',
    request: {
      message_id: 'test-msg-015',
      tenant_id: TENANT_A,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Apartament pret locatie apartament',
      timestamp: NOW,
      source_message_ref: 'tg_test_015',
      reply_to_message_id: MSG_NO_THREAD
    },
    expected: {
      decision: 'create_new_thread',
      resolved_thread_id: null,
      ambiguity_detected: false,
      content_class_used: 'normalized_content'
    },
    note: 'Reply linkage fails (reply target has no thread_id). Falls through to scoring. Scores below all thresholds.'
  },

  {
    id: 'TC-16',
    name: 'Audit write error path verification',
    description: 'Error path (fail_invalid_input) writes to audit trail. Verifies error auditability.',
    request: {
      message_id: 'test-msg-016',
      tenant_id: null,
      channel: 'telegram',
      direction: 'inbound',
      author_type: 'user',
      normalized_content: 'Any content',
      timestamp: NOW,
      source_message_ref: 'tg_test_016'
    },
    expected: {
      decision: 'fail_invalid_input',
      resolved_thread_id: null,
      ambiguity_detected: false,
      content_class_used: 'none',
      error_code: 'INVALID_INPUT',
      audit_written: true
    },
    note: 'Error path must write audit record. Verifies D-07 fix.'
  }
];

const setupSQL = `
-- ============================================
-- WF-TR-01 Test Data Setup SQL
-- Run this AFTER creating the schema tables
-- (tenants, threads, entities, messages, thread_resolution_audit)
-- ============================================

-- Tenants (required for FK constraints)
INSERT INTO tenants (id, created_at, updated_at)
VALUES
  ('${TENANT_A}', NOW(), NOW()),
  ('${TENANT_B}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Test entities
INSERT INTO entities (id, tenant_id, entity_type, display_name, status, created_at, updated_at)
VALUES
  ('${ENTITY_ION}', '${TENANT_A}', 'person', 'Ion Popescu', 'active', NOW(), NOW()),
  ('${ENTITY_MARIA}', '${TENANT_A}', 'person', 'Maria Ionescu', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Test threads
INSERT INTO threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at, updated_at)
VALUES
  -- TC-01/TC-02/TC-03/TC-14 threads
  ('${THREAD_ION_APT}', '${TENANT_A}', 'Apartament centru Ion', 'task', 'active',
   'Ion cauta apartament in centru, discutie despre pret si locatie',
   NOW() - INTERVAL '2 hours', '${ENTITY_ION}', '{}', '{telegram}',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),

  -- TC-04 thread (latent)
  ('${THREAD_MARIA_FACTURA}', '${TENANT_A}', 'Factura Maria', 'task', 'latent',
   'Maria are o factura de trimis, discutie veche',
   NOW() - INTERVAL '10 days', '${ENTITY_MARIA}', '{}', '{telegram}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'),

  -- TC-05 thread (general, for background)
  ('${THREAD_GENERAL}', '${TENANT_A}', 'Proiect general', 'general', 'active',
   'Discutie generala despre proiect',
   NOW() - INTERVAL '5 days', NULL, '{}', '{telegram}',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),

  -- TC-06 threads (ambiguity test - MUST have identical scores)
  ('${THREAD_AMBIG_1}', '${TENANT_A}', 'Proiect important A', 'task', 'active',
   'proiect important detalii noi informatii',
   NOW() - INTERVAL '1 hour', NULL, '{}', '{telegram}',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'),

  ('${THREAD_AMBIG_2}', '${TENANT_A}', 'Proiect important B', 'task', 'active',
   'proiect important detalii noi update',
   NOW() - INTERVAL '1 hour', NULL, '{}', '{telegram}',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'),

  -- TC-14 thread (exact boundary test, score = 0.75)
  ('${THREAD_BOUNDARY}', '${TENANT_A}', 'Apartament Test Boundary', 'task', 'active',
   'apartament pret locatie centru',
   NOW() - INTERVAL '12 hours', NULL, '{}', '{telegram}',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours'),

  -- TC-13 thread (latent, scores above attach threshold)
  ('${THREAD_LATENT_HIGH}', '${TENANT_A}', 'Factura Maria veche', 'task', 'latent',
   'factura veche discutie reanoi contact cu Maria despre trimis',
   NOW() - INTERVAL '15 days', '${ENTITY_MARIA}', '{}', '{telegram}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '15 days')

ON CONFLICT (id) DO NOTHING;

-- Test messages for reply linkage
INSERT INTO messages (id, tenant_id, channel, direction, author_type, content, timestamp, source_message_ref, thread_id, status, created_at)
VALUES
  -- TC-02/TC-12 message (has thread_id, used for reply linkage)
  ('${MSG_ORIGINAL}', '${TENANT_A}', 'telegram', 'inbound', 'user',
   'Mesaj original despre apartament in centru',
   NOW() - INTERVAL '3 hours', 'tg_msg_001', '${THREAD_ION_APT}', 'processed',
   NOW() - INTERVAL '3 hours'),

  -- TC-15 message (no thread_id, for fallthrough to scoring)
  ('${MSG_NO_THREAD}', '${TENANT_A}', 'telegram', 'inbound', 'user',
   'Mesaj fara thread asociat',
   NOW() - INTERVAL '5 hours', 'tg_msg_002', NULL, 'processed',
   NOW() - INTERVAL '5 hours')

ON CONFLICT (id) DO NOTHING;
`;

// --- Main ---

const args = process.argv.slice(2);

if (args.includes('--sql')) {
  console.log(setupSQL);
} else if (args.includes('--file')) {
  const dir = path.join(__dirname, '..', 'fixtures');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (const f of fixtures) {
    const filename = path.join(dir, `${f.id}_${f.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    fs.writeFileSync(filename, JSON.stringify(f, null, 2));
    console.log(`Written: ${filename}`);
  }
  fs.writeFileSync(path.join(dir, 'setup_test_data.sql'), setupSQL);
  console.log(`Written: ${path.join(dir, 'setup_test_data.sql')}`);
  console.log(`\nTotal: ${fixtures.length} fixtures + 1 SQL setup script`);
} else {
  console.log(JSON.stringify(fixtures, null, 2));
}
