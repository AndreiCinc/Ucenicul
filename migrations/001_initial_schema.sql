-- ============================================================
-- AI Operational Assistant — Initial Schema
-- Version: 001
-- Date: 2026-03-27
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ORGANIZATIONS
-- The entrepreneur / owner. One row per client.
-- ============================================================
CREATE TABLE organizations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  owner_telegram_user_id TEXT UNIQUE NOT NULL,
  owner_telegram_chat_id TEXT NOT NULL,
  telegram_bot_token     TEXT,
  active_tenant_id       UUID,                          -- last selected business (cross-service fallback)
  briefing_time          TIME DEFAULT '07:00',
  timezone               TEXT DEFAULT 'Europe/Bucharest',
  briefing_enabled       BOOLEAN DEFAULT true,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TENANTS
-- Business units under an owner: Airbnb, Cleaning, Green Spaces.
-- Slug is used for Telegram commands: /airbnb, /cleaning
-- ============================================================
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,   -- e.g. 'airbnb', 'cleaning', 'green_spaces'
  vertical        TEXT NOT NULL,   -- e.g. 'airbnb', 'cleaning', 'green_spaces'
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Circular FK resolved after tenants table creation
ALTER TABLE organizations
  ADD CONSTRAINT fk_active_tenant
  FOREIGN KEY (active_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

-- ============================================================
-- CONTACTS
-- The entrepreneur's clients. Organization-level — shared across businesses.
-- contact_token = pseudonymized alias (e.g. 'a3f7') used in prompts
-- ============================================================
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_token   TEXT UNIQUE NOT NULL,
  name_hint       TEXT,   -- first name only, no identifiable details
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTACT_TENANT_LINKS
-- A contact can be assigned to one or more businesses.
-- Routing: if Ion is assigned only to Airbnb → messages about Ion → Airbnb.
-- If assigned to multiple → bot asks once → saves to active_tenant_id.
-- ============================================================
CREATE TABLE contact_tenant_links (
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (contact_id, tenant_id)
);

-- ============================================================
-- CONTACTS_PII
-- Real personal data — encrypted AES-256-GCM at application level (n8n).
-- NEVER sent to LLM API. Decrypted only for display.
-- ============================================================
CREATE TABLE contacts_pii (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  name_encrypted   TEXT,
  phone_encrypted  TEXT,
  email_encrypted  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- All communications — inbound (from user) and outbound (from bot).
-- content = pseudonymized message (no real PII)
-- raw_content_hash = SHA256 of original message (for audit)
-- ============================================================
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- nullable: message may arrive before business selection
  telegram_message_id BIGINT,         -- Telegram message ID (for reply, audit, deduplication)
  telegram_chat_id    TEXT,           -- Telegram chat_id of the user
  content             TEXT,
  raw_content_hash    TEXT,
  direction           TEXT DEFAULT 'inbound'
                      CHECK (direction IN ('inbound', 'outbound')),
  intent              TEXT
                      CHECK (intent IN ('task', 'question', 'reminder', 'update', 'urgent', 'noise', 'briefing')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- Tasks extracted from messages or added manually.
-- ============================================================
CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  priority          TEXT DEFAULT 'normal'
                    CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  status            TEXT DEFAULT 'open'
                    CHECK (status IN ('open', 'done', 'cancelled')),
  due_date          TIMESTAMPTZ,
  source_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REMINDERS
-- Scheduled reminders. Stored in UTC, displayed in tenant timezone.
-- ============================================================
CREATE TABLE reminders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  remind_at         TIMESTAMPTZ NOT NULL,
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'delivered', 'cancelled')),
  source_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VECTOR_MEMORIES
-- Semantic memory per business. Pseudonymized content.
-- embedding = 1536 dimensions (text-embedding-3-small)
-- ============================================================
CREATE TABLE vector_memories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  embedding        vector(1536),
  memory_type      TEXT DEFAULT 'episodic'
                   CHECK (memory_type IN ('episodic', 'semantic', 'procedural', 'onboarding')),
  importance_score FLOAT DEFAULT 0.5
                   CHECK (importance_score >= 0 AND importance_score <= 1),
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ERROR_LOG
-- Centralized error log across all n8n workflows.
-- GDPR delete log is kept permanently (not cleaned up).
-- ============================================================
CREATE TABLE error_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE SET NULL,
  tenant_id        UUID REFERENCES tenants(id) ON DELETE SET NULL,
  workflow_name    TEXT,
  error_type       TEXT,
  error_message    TEXT,
  context          JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Tenants
CREATE INDEX idx_tenants_organization ON tenants(organization_id);
CREATE INDEX idx_tenants_slug ON tenants(organization_id, slug);

-- Contacts
CREATE INDEX idx_contacts_organization ON contacts(organization_id);
CREATE INDEX idx_contacts_token ON contacts(contact_token);

-- Contact-tenant links
CREATE INDEX idx_contact_tenant_links_contact ON contact_tenant_links(contact_id);
CREATE INDEX idx_contact_tenant_links_tenant ON contact_tenant_links(tenant_id);

-- Messages
CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_created ON messages(tenant_id, created_at DESC);
CREATE INDEX idx_messages_telegram ON messages(telegram_chat_id, telegram_message_id);

-- Tasks
CREATE INDEX idx_tasks_tenant_status ON tasks(tenant_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due ON tasks(tenant_id, due_date)
  WHERE status = 'open' AND deleted_at IS NULL;

-- Reminders
CREATE INDEX idx_reminders_pending ON reminders(tenant_id, remind_at)
  WHERE status = 'pending';

-- Vector memories
CREATE INDEX idx_vector_memories_tenant ON vector_memories(tenant_id);
CREATE INDEX idx_vector_memories_importance ON vector_memories(tenant_id, importance_score DESC);

-- Error log
CREATE INDEX idx_error_log_workflow ON error_log(workflow_name, created_at DESC);

-- ============================================================
-- VERIFICATION
-- Run after migration:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- Should return 9 tables.
-- ============================================================
