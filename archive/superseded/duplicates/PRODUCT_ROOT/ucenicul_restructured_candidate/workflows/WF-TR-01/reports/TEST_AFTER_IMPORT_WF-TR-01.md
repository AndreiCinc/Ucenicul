# Post-Import Test Guide — WF-TR-01 Thread Resolver (v2.0)

## Setup

Before running tests, ensure:

1. Prerequisite tables exist (see IMPORT_WF-TR-01.md)
2. All test data is loaded (run complete `setup_test_data.sql` below)
3. n8n instance is running with WF-TR-01 imported and saved
4. PostgreSQL credentials configured in all nodes
5. All nodes have `alwaysOutputData` flag ON

---

## Complete Test Data Setup SQL

This SQL creates ALL test data for all 11 anchor test fixtures plus domain-specific tests:

```sql
-- ============================================
-- WF-TR-01 Complete Test Data Setup (v2.0)
-- ============================================

-- D-25 fix: All tenants
INSERT INTO tenants (id, display_name, status, created_at, updated_at) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'tenant_cleaning_001', 'active', NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'tenant_airbnb_001', 'active', NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'tenant_green_001', 'active', NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'tenant_fitness_001', 'active', NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'tenant_ai_product_001', 'active', NOW(), NOW()),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'tenant_cross_test', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- DOMAIN 1: Cleaning Tenant (tenant_001)
-- ============================================

INSERT INTO entities (id, tenant_id, entity_type, display_name, canonical_name, status, created_at, updated_at) VALUES
  ('eeeeeeee-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'person', 'Ion Popescu', 'Ion', 'active', NOW(), NOW()),
  ('eeeeeeee-0001-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'person', 'Maria Ionescu', 'Maria', 'active', NOW(), NOW()),
  ('eeeeeeee-0001-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'person', 'Andrei Georgescu', 'Andrei', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at, updated_at) VALUES
  ('tttttttt-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Apartament centru Ion', 'task', 'active', 'Ion cauta apartament in centru, discutie despre pret si locatie', NOW() - INTERVAL '2 hours', 'eeeeeeee-0001-0000-0000-000000000001', '{}', '{telegram}', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
  ('tttttttt-0001-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Factura Maria', 'task', 'latent', 'Maria are o factura de trimis, discutie veche', NOW() - INTERVAL '10 days', 'eeeeeeee-0001-0000-0000-000000000002', '{}', '{telegram}', NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'),
  ('tttttttt-0001-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Proiect general', 'general', 'active', 'Discutie generala despre proiect', NOW() - INTERVAL '5 days', NULL, '{}', '{telegram}', NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),
  ('tttttttt-0001-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Proiect important A', 'task', 'active', 'proiect important detalii noi informatii', NOW() - INTERVAL '1 hour', NULL, '{}', '{telegram}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'),
  ('tttttttt-0001-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Proiect important B', 'task', 'active', 'proiect important detalii noi update', NOW() - INTERVAL '1 hour', NULL, '{}', '{telegram}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

INSERT INTO messages (id, tenant_id, channel, direction, author_type, normalized_content, timestamp, source_message_ref, thread_id, status, created_at) VALUES
  ('mmmmmmmm-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'telegram', 'inbound', 'user', 'Mesaj original despre apartament', NOW() - INTERVAL '3 hours', 'tg_msg_001', 'tttttttt-0001-0000-0000-000000000001', 'processed', NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

-- ============================================
-- DOMAIN 2: Airbnb Tenant
-- ============================================

INSERT INTO entities (id, tenant_id, entity_type, display_name, canonical_name, status, created_at, updated_at) VALUES
  ('eeeeeeee-0002-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'person', 'Mihaela Dumitrescu', 'Mihaela', 'active', NOW(), NOW()),
  ('eeeeeeee-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'person', 'Cristian Popescu', 'Cristian', 'active', NOW(), NOW()),
  ('eeeeeeee-0002-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'location', 'Studio Cluj', 'Cluj', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at, updated_at) VALUES
  ('tttttttt-0002-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'Rezervare weekend Cluj', 'task', 'active', 'Mihaela rezervare cazare studio Cluj pret ocupatie weekend', NOW() - INTERVAL '4 hours', 'eeeeeeee-0002-0000-0000-000000000001', '{"eeeeeeee-0002-0000-0000-000000000003"}', '{whatsapp,telegram}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 hours'),
  ('tttttttt-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Feedback proprietar vechi', 'task', 'latent', 'Cristian feedback proprietar critici comentarii', NOW() - INTERVAL '25 days', 'eeeeeeee-0002-0000-0000-000000000002', '{}', '{whatsapp}', NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- DOMAIN 3: Green Initiatives Tenant
-- ============================================

INSERT INTO entities (id, tenant_id, entity_type, display_name, canonical_name, status, created_at, updated_at) VALUES
  ('eeeeeeee-0003-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'person', 'Radu Vasilescu', 'Radu', 'active', NOW(), NOW()),
  ('eeeeeeee-0003-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'organization', 'GreenCorp', 'GreenCorp', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at, updated_at) VALUES
  ('tttttttt-0003-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'Sustentabilitate strategie', 'general', 'active', 'Radu GreenCorp strategie sustentabilitate plan climat', NOW() - INTERVAL '6 hours', 'eeeeeeee-0003-0000-0000-000000000002', '{"eeeeeeee-0003-0000-0000-000000000001"}', '{telegram}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 hours'),
  ('tttttttt-0003-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'Raport vechi sus', 'task', 'latent', 'Radu raport trimestrial sustentabilitate date vechi', NOW() - INTERVAL '90 days', 'eeeeeeee-0003-0000-0000-000000000001', '{}', '{telegram}', NOW() - INTERVAL '120 days', NOW() - INTERVAL '90 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- DOMAIN 4: Fitness Trainer Tenant (D-26: domain-specific)
-- ============================================

INSERT INTO entities (id, tenant_id, entity_type, display_name, canonical_name, status, created_at, updated_at) VALUES
  ('eeeeeeee-0004-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'person', 'Bianca Fitness Coach', 'Bianca', 'active', NOW(), NOW()),
  ('eeeeeeee-0004-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'person', 'Radu Weight Loss Client', 'Radu', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at, updated_at) VALUES
  ('tttttttt-0004-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'Bianca nutrition coaching', 'task', 'active', 'Bianca nutrition coaching diet planning meal prep', NOW() - INTERVAL '3 hours', 'eeeeeeee-0004-0000-0000-000000000001', '{}', '{whatsapp}', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 hours'),
  ('tttttttt-0004-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'Radu weight loss program', 'task', 'active', 'Radu weight loss workout plan cardio strength', NOW() - INTERVAL '8 hours', 'eeeeeeee-0004-0000-0000-000000000002', '{}', '{whatsapp}', NOW() - INTERVAL '7 days', NOW() - INTERVAL '8 hours'),
  ('tttttttt-0004-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000004', 'Old fitness feedback', 'task', 'latent', 'Bianca fitness feedback assessment progress review', NOW() - INTERVAL '45 days', 'eeeeeeee-0004-0000-0000-000000000001', '{}', '{whatsapp}', NOW() - INTERVAL '60 days', NOW() - INTERVAL '45 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- DOMAIN 5: AI/Tech Product Tenant (D-26: domain-specific)
-- ============================================

INSERT INTO entities (id, tenant_id, entity_type, display_name, canonical_name, status, created_at, updated_at) VALUES
  ('eeeeeeee-0005-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000005', 'person', 'Alex DevOps', 'Alex', 'active', NOW(), NOW()),
  ('eeeeeeee-0005-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000005', 'organization', 'Acme AI Labs', 'Acme', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at, updated_at) VALUES
  ('tttttttt-0005-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000005', 'Onboarding pilot Cluj', 'task', 'active', 'Alex Acme onboarding pilot Cluj setup configuration', NOW() - INTERVAL '12 hours', 'eeeeeeee-0005-0000-0000-000000000002', '{"eeeeeeee-0005-0000-0000-000000000001"}', '{telegram}', NOW() - INTERVAL '4 days', NOW() - INTERVAL '12 hours'),
  ('tttttttt-0005-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000005', 'API integration specs', 'task', 'active', 'Alex API integration REST endpoints spec documentation', NOW() - INTERVAL '1 hour', 'eeeeeeee-0005-0000-0000-000000000001', '{}', '{telegram}', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 hour'),
  ('tttttttt-0005-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000005', 'Legacy deployment notes', 'task', 'latent', 'Alex legacy deployment notes AWS infrastructure old', NOW() - INTERVAL '60 days', 'eeeeeeee-0005-0000-0000-000000000001', '{}', '{telegram}', NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- CROSS-TENANT TEST DATA
-- ============================================

INSERT INTO entities (id, tenant_id, entity_type, display_name, canonical_name, status, created_at, updated_at) VALUES
  ('eeeeeeee-0099-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'person', 'Test Cross User', 'CrossUser', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO threads (id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at, updated_at) VALUES
  ('tttttttt-0099-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Cross tenant test', 'general', 'active', 'Cross tenant isolation test', NOW() - INTERVAL '1 hour', NULL, '{}', '{telegram}', NOW(), NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;
```

---

## Test Cases with Exact Input/Output

Each test case includes:
- **Test type label**: design-level (tests resolver logic) or runtime (requires DB)
- **Exact input JSON** (using nested or flat shape as specified)
- **Expected output fields** with allowed variations
- **Validation type**

### Test 1 (TC-01): Explicit Thread Reference

**Test Type:** Design-level (no DB required)

**Input (flat shape):**
```json
{
  "message_id": "mmmmmmmm-1111-0000-0000-000000000001",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "Orice text nu conteaza",
  "timestamp": "2026-04-15T12:00:00Z",
  "source_message_ref": "tg_test_001",
  "thread_id": "tttttttt-0001-0000-0000-000000000001"
}
```

**Expected Output:**
- `status`: `success`
- `decision`: `attach_existing_thread`
- `resolution_action`: `attach_existing_thread`
- `resolved_thread_id`: `tttttttt-0001-0000-0000-000000000001`
- `candidate_scores`: `[]` (empty, shortcircuited)
- `confidence`: > 0.0 (exact value for explicit ref: 1.0 or thread's last activity)
- `ambiguity_detected`: `false`
- `reopened_thread`: `false`
- `created_thread`: `false`
- `error`: `null`

---

### Test 2 (TC-02): Direct Reply Linkage

**Test Type:** Runtime (requires DB setup)

**Input (flat shape):**
```json
{
  "message_id": "mmmmmmmm-2222-0000-0000-000000000002",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "Da, sunt de acord cu apartamentul",
  "timestamp": "2026-04-15T12:30:00Z",
  "source_message_ref": "tg_test_002",
  "reply_to_message_id": "mmmmmmmm-0001-0000-0000-000000000001"
}
```

**Expected Output:**
- `status`: `success`
- `decision`: `attach_existing_thread`
- `resolution_action`: `attach_existing_thread`
- `resolved_thread_id`: `tttttttt-0001-0000-0000-000000000001` (from message lookup)
- `confidence`: >= 0.75 (high confidence for reply linkage)
- `ambiguity_detected`: `false`
- `reopened_thread`: `false`
- `created_thread`: `false`

---

### Test 3 (TC-03): Attach by Entity + Semantic Match

**Test Type:** Runtime (requires DB + scoring validation)

**Input (flat shape):**
```json
{
  "message_id": "mmmmmmmm-3333-0000-0000-000000000003",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "Ion apartament centru pret locatie discutie noi",
  "timestamp": "2026-04-15T13:00:00Z",
  "source_message_ref": "tg_test_003",
  "author_entity_id": "eeeeeeee-0001-0000-0000-000000000001"
}
```

**Expected Output:**
- `status`: `success`
- `decision`: `attach_existing_thread`
- `resolution_action`: `attach_existing_thread`
- `resolved_thread_id`: `tttttttt-0001-0000-0000-000000000001`
- `confidence`: >= 0.75 (entity 0.30 + semantic ~0.35 + temporal 0.15 + channel 0.10 = ~0.90)
- `candidate_scores[0].entity_match`: 0.30 (exact primary entity match)
- `candidate_scores[0].semantic_match`: >= 0.35 (high overlap with thread summary)
- `ambiguity_detected`: `false`

---

### Test 4 (TC-04): Reopen Latent Thread

**Test Type:** Runtime (requires DB)

**Input (flat shape):**
```json
{
  "message_id": "mmmmmmmm-4444-0000-0000-000000000004",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "Maria factura trimis discutie cu tine veche nu stiu",
  "timestamp": "2026-04-15T13:30:00Z",
  "source_message_ref": "tg_test_004",
  "author_entity_id": "eeeeeeee-0001-0000-0000-000000000002"
}
```

**Expected Output:**
- `status`: `success`
- `decision`: `reopen_latent_thread`
- `resolution_action`: `reopen_latent_thread`
- `resolved_thread_id`: `tttttttt-0001-0000-0000-000000000002`
- `confidence`: >= 0.65 (meets reopen_threshold)
- `reopened_thread`: `true`
- `candidate_scores[0].thread_status`: `latent`
- `created_thread`: `false`

---

### Test 5 (TC-05): Create New Thread

**Test Type:** Design-level

**Input (flat shape):**
```json
{
  "message_id": "mmmmmmmm-5555-0000-0000-000000000005",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "Vreau sa cumpar o masina noua electrica cu baterie",
  "timestamp": "2026-04-15T14:00:00Z",
  "source_message_ref": "tg_test_005"
}
```

**Expected Output:**
- `status`: `success`
- `decision`: `create_new_thread`
- `resolution_action`: `create_new_thread`
- `resolved_thread_id`: `null`
- `confidence`: 0.0
- `created_thread`: `true`
- `ambiguity_detected`: `false`

---

### Test 6 (TC-06): Ambiguous Candidate Set

**Test Type:** Runtime (requires DB with ambiguity threads)

Uses threads `tttttttt-0001-0000-0000-000000000004` and `tttttttt-0001-0000-0000-000000000005` (both with "proiect important" summaries).

**Input (flat shape):**
```json
{
  "message_id": "mmmmmmmm-6666-0000-0000-000000000006",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "proiect important noi detalii update informatii",
  "timestamp": "2026-04-15T14:30:00Z",
  "source_message_ref": "tg_test_006"
}
```

**Expected Output:**
- `status`: `success`
- `decision`: `create_new_thread`
- `resolution_action`: `create_new_thread`
- `resolved_thread_id`: `null`
- `ambiguity_detected`: `true` (top two candidates within 0.05 margin)
- `confidence`: 0.0
- `candidate_scores`: >= 2 entries with scores close together

---

### Test 7 (TC-07): Invalid Input

**Test Type:** Design-level

**Input (flat shape, missing required field):**
```json
{
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "Test",
  "timestamp": "2026-04-15T15:00:00Z",
  "source_message_ref": "tg_test_007"
}
```

**Expected Output:**
- `status`: `failed`
- `decision`: `fail_invalid_input`
- `resolution_action`: `fail_invalid_input`
- `resolved_thread_id`: `null`
- `error.code`: `INVALID_INPUT`
- `error.missing_fields`: includes `"message_id"`
- `confidence`: 0.0
- `content_class_used`: `none`

---

### Test 8 (TC-08): Deterministic Replay

**Test Type:** Runtime (tests idempotency)

**First invocation:** Send TC-03 request with `idempotency_key: "IC03_20260415"`

**Expected:** Returns resolution with `resolution_id: "tr_mmmmmmmm-3333-0000-0000-000000000003_{hash}"` and audit record written.

**Second invocation (replay):** Send same TC-03 request with same `idempotency_key`

**Expected:**
- Returns IDENTICAL `resolution_id` (deterministic from idempotency_key)
- Audit table has only ONE row for this resolution_id (ON CONFLICT DO NOTHING)
- All output fields match first invocation exactly

---

### Test 9 (TC-09): Cross-Tenant Isolation

**Test Type:** Design-level

**Input 1** (tenant A):
```json
{
  "message_id": "mmmmmmmm-9111-0000-0000-000000000001",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "test message tenant a",
  "timestamp": "2026-04-15T15:30:00Z",
  "source_message_ref": "tg_test_09a"
}
```

**Input 2** (tenant B, different):
```json
{
  "message_id": "mmmmmmmm-9222-0000-0000-000000000002",
  "tenant_id": "bbbbbbbb-0000-0000-0000-000000000001",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "test message tenant b",
  "timestamp": "2026-04-15T15:30:00Z",
  "source_message_ref": "tg_test_09b"
}
```

**Expected Output for both:**
- Each query filters by tenant_id
- Tenant A sees only threads from tenant A
- Tenant B sees only threads from tenant B
- No cross-tenant contamination

---

### Test 10 (TC-10): Content Class Behavior (MVP vs Phase 2)

**Test Type:** Design-level

**Input (nested shape):**
```json
{
  "message": {
    "id": "mmmmmmmm-10-0000-0000-000000000010",
    "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
    "channel": "telegram",
    "direction": "inbound",
    "author_type": "user",
    "normalized_content": "Ion apartament centru",
    "timestamp": "2026-04-15T16:00:00Z",
    "source_message_ref": "tg_test_10",
    "author_entity_id": "eeeeeeee-0001-0000-0000-000000000001",
    "raw_content": "Este PII in raw content care nu trebuie consumat"
  },
  "idempotency_key": "TC10_nest"
}
```

**Expected Output:**
- `status`: `success`
- `content_class_used`: `normalized_content` (MVP)
- Resolver DOES NOT appear to have consumed raw_content (only normalized_content was used for scoring)
- Decision is based on normalized_content semantic match, not raw

---

## Additional Domain-Specific Tests

### Test D1: Fitness Domain (D-26 fix)

**Input:**
```json
{
  "message_id": "mmmmmmmm-d001-0000-0000-000000000001",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000004",
  "channel": "whatsapp",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "Bianca nutrition coaching diet meal planning",
  "timestamp": "2026-04-15T16:30:00Z",
  "source_message_ref": "wa_fitness_01",
  "author_entity_id": "eeeeeeee-0004-0000-0000-000000000001"
}
```

**Expected:** Attaches to TC `tttttttt-0004-0000-0000-000000000001` (Bianca nutrition coaching)

### Test D2: AI/Tech Domain (D-26 fix)

**Input:**
```json
{
  "message_id": "mmmmmmmm-d002-0000-0000-000000000002",
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000005",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "Alex onboarding pilot Cluj configuration setup",
  "timestamp": "2026-04-15T17:00:00Z",
  "source_message_ref": "tg_ai_01",
  "author_entity_id": "eeeeeeee-0005-0000-0000-000000000001"
}
```

**Expected:** Attaches to `tttttttt-0005-0000-0000-000000000001` (Onboarding pilot Cluj)

---

## Scoring Path Replay Tests

### Test SR-1: Scoring-path validation (TC-03 path)

**Purpose:** Verify scoring components are correct for attachment decision.

Run test TC-03 (Attach by entity + semantic). Inspect `candidate_scores[0]`:
- `entity_match`: MUST be 0.30
- `semantic_match`: MUST be >= 0.35 (Romanian stemming match)
- `temporal_proximity`: MUST be 0.15 (within 24 hours)
- `channel_relevance`: MUST be 0.10 (telegram in source_channels)
- `score`: MUST equal sum of components (>= 0.90)

### Test SR-2: Scoring-path validation (TC-04 path, reopen)

**Purpose:** Verify latent reopen path produces correct scores.

Run test TC-04. Inspect `candidate_scores[0]`:
- `score`: MUST be >= 0.65 (at or above reopen_threshold)
- `thread_status`: MUST be `latent`
- Decision MUST be `reopen_latent_thread` (not attach)

---

## Post-Test Verification Checklist

After running all 10 test cases plus domain tests:

- [ ] All 10 TC tests pass with correct decisions
- [ ] Idempotency test (TC-08) produces identical resolution_id on replay
- [ ] Cross-tenant test (TC-09) shows no thread contamination
- [ ] Ambiguity test (TC-06) produces ambiguity_detected: true
- [ ] Domain tests (D1, D2) attach to correct tenant-specific threads
- [ ] Scoring paths (SR-1, SR-2) produce correct component breakdown
- [ ] All error results have error.code and error.missing_fields
- [ ] All success results have error: null (explicitly)
- [ ] All results include module_name: "thread_resolver" and result_type: "resolution"
- [ ] Audit table contains exactly one row per resolution_id (no duplicates)
- [ ] All timestamps are ISO 8601 valid
- [ ] All UUID fields are valid UUIDs or null
- [ ] Confidence scores are 0.0-1.0 range

---

> **Version: 2.0** | Last updated: 2026-04-15
