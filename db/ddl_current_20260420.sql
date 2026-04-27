-- DDL snapshot — 2026-04-20 — reconstruit din information_schema + pg_indexes + pg_constraint
-- Scop: oferi chat-ului memory_module DDL-ul REAL al tabelelor relevante, pentru că
-- `db/migrations/` e gol în repo (migrațiile reale sunt în afara PRODUCT_ROOT, inaccesibile).
--
-- ATENȚIE DISCREPANȚĂ MAJORĂ:
--   Arhitectura spec și `db/README.md` vorbesc de `memory_items`. În DB live NU EXISTĂ
--   `memory_items`. Tabelul real de memorie este `rag_memories`, cu un model semnificativ
--   diferit (categorii de business, durability, stage, source_type — vezi mai jos).
--   Chat-ul memory_module TREBUIE să rezolve această divergență în design doc: ori
--   extindere în loc pe `rag_memories`, ori layer nou `memory_items` deasupra, ori
--   reconciliere spec ↔ realitate.

-- ===========================================================================
-- Extensii necesare
-- ===========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector 0.8.2 instalat

-- ===========================================================================
-- ENUMs folosite de rag_memories
-- ===========================================================================
CREATE TYPE rag_memory_category_enum AS ENUM (
  'business_profile','customer_market','growth_context','entrepreneur_profile',
  'relationship_history','operational_patterns','preferences','constraints'
);
CREATE TYPE rag_memory_kind_enum   AS ENUM ('fact','insight','advice');
CREATE TYPE rag_durability_enum    AS ENUM ('stable','seasonal','volatile');
CREATE TYPE business_stage_enum    AS ENUM ('setup','validation','early_growth','stabilization','scale');
CREATE TYPE entity_type_enum       AS ENUM (
  'employee','customer','lead','supplier','property','location',
  'service','package','competitor','partner','other'
);
CREATE TYPE rag_source_type_enum   AS ENUM (
  'conversation','structured_event','manual_note','external_web',
  'system_derived','brain_main_inbound_mvp'
);

-- ===========================================================================
-- TABEL: rag_memories  (tabelul REAL de memorie — NU memory_items)
-- ===========================================================================
CREATE TABLE public.rag_memories (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id          uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  content              text NOT NULL,
  embedding            vector NOT NULL,          -- pgvector
  memory_category      rag_memory_category_enum NOT NULL,
  memory_kind          rag_memory_kind_enum     NOT NULL,
  business_type        text NOT NULL,
  durability           rag_durability_enum      NOT NULL,
  stage                business_stage_enum,
  entity_type          entity_type_enum,
  entity_ref           text,                     -- text, NU FK către entities
  source_type          rag_source_type_enum     NOT NULL,
  source_ref           text,
  confidence           numeric NOT NULL DEFAULT 0.700 CHECK (confidence        BETWEEN 0 AND 1),
  importance_score     numeric NOT NULL DEFAULT 0.500 CHECK (importance_score  BETWEEN 0 AND 1),
  last_reconfirmed_at  timestamptz,
  valid_until          timestamptz,
  metadata             jsonb   NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_memories_tenant_id             ON public.rag_memories (tenant_id);
CREATE INDEX idx_rag_memories_tenant_category       ON public.rag_memories (tenant_id, memory_category);
CREATE INDEX idx_rag_memories_tenant_kind           ON public.rag_memories (tenant_id, memory_kind);
CREATE INDEX idx_rag_memories_tenant_business_type  ON public.rag_memories (tenant_id, business_type);
CREATE INDEX idx_rag_memories_tenant_entity_ref     ON public.rag_memories (tenant_id, entity_ref);
CREATE INDEX idx_rag_memories_tenant_stage          ON public.rag_memories (tenant_id, stage);
CREATE INDEX idx_rag_memories_valid_until           ON public.rag_memories (valid_until);
-- Index vector (cosine) pentru RAG similarity search
CREATE INDEX idx_rag_memories_embedding_ivfflat
  ON public.rag_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ===========================================================================
-- TABEL: messages  (model curent — PARȚIAL față de spec privacy)
-- ===========================================================================
-- Prezente: content, normalized_content, raw_content_hash, direction, intent,
--           thread_id (fără FK explicit), telegram_*, channel, author_type,
--           author_entity_id, source_message_ref, timestamp, created_at, updated_at
-- LIPSESC față de Architecture_Spec §V Privacy Contracts:
--   - llm_safe_content, rag_safe_content (split privacy pe normalized_content)
--   - source_context / source_context_resolved (thread-aware)
CREATE TABLE public.messages (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id)       ON DELETE CASCADE,
  content              text,                     -- legacy raw content
  raw_content_hash     text,
  direction            text DEFAULT 'inbound'    CHECK (direction IN ('inbound','outbound')),
  intent               text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  telegram_message_id  bigint,
  telegram_chat_id     text,
  thread_id            uuid,                     -- index parțial; fără FK declarat
  channel              varchar(50),
  author_type          varchar(20),
  normalized_content   text,
  source_message_ref   varchar(200),
  author_entity_id     uuid,
  "timestamp"          timestamptz
);
CREATE INDEX idx_messages_tenant         ON public.messages (tenant_id);
CREATE INDEX idx_messages_created        ON public.messages (tenant_id, created_at DESC);
CREATE INDEX idx_messages_telegram       ON public.messages (telegram_chat_id, telegram_message_id);
CREATE INDEX idx_messages_thread_id      ON public.messages (thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_messages_author_entity  ON public.messages (author_entity_id) WHERE author_entity_id IS NOT NULL;

-- ===========================================================================
-- TABEL: threads  (context upstream pentru memorie thread-aware)
-- ===========================================================================
-- LIPSESC față de spec: source_context / source_context_resolved
CREATE TABLE public.threads (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL,
  title                varchar(500),
  thread_type          varchar(50) NOT NULL DEFAULT 'operational',
  status               varchar(20) NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new','active','waiting','blocked','completed','latent','abandoned')),
  summary              text,
  last_activity_at     timestamptz NOT NULL DEFAULT now(),
  primary_entity_id    uuid,
  related_entity_ids   uuid[] DEFAULT '{}'::uuid[],
  goal                 text,
  source_channels      varchar[] DEFAULT '{}'::varchar[],
  closure_reason       text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_threads_tenant_id              ON public.threads (tenant_id);
CREATE INDEX idx_threads_tenant_status_activity ON public.threads (tenant_id, status, last_activity_at DESC);
CREATE INDEX idx_threads_primary_entity         ON public.threads (primary_entity_id) WHERE primary_entity_id IS NOT NULL;

-- ===========================================================================
-- TABEL: entities  (referință logică pentru rag_memories.entity_ref)
-- ===========================================================================
-- NOTĂ: rag_memories.entity_ref e `text`, NU FK către entities.id — e o decizie
-- implementată voit, pentru a permite referințe soft (inclusiv external refs).
CREATE TABLE public.entities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  entity_type       varchar(50) NOT NULL DEFAULT 'person',
  display_name      varchar(300) NOT NULL,
  canonical_name    varchar(300),
  aliases           varchar[] DEFAULT '{}'::varchar[],
  contact_mappings  jsonb     DEFAULT '{}'::jsonb,
  profile_summary   text,
  labels            varchar[] DEFAULT '{}'::varchar[],
  status            varchar(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','merged','archived')),
  metadata          jsonb     DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_entities_tenant_id     ON public.entities (tenant_id);
CREATE INDEX idx_entities_tenant_status ON public.entities (tenant_id, status);
CREATE INDEX idx_entities_tenant_type   ON public.entities (tenant_id, entity_type);

-- ===========================================================================
-- TABEL: execution_contexts  (necesar înțelegerii thread_id + execution_context_id)
-- ===========================================================================
CREATE TABLE public.execution_contexts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  thread_id             uuid NOT NULL,
  trigger_message_id    uuid NOT NULL,
  status                varchar(20) NOT NULL DEFAULT 'initialized'
                        CHECK (status IN ('initialized','planning','dispatching','executing','aggregating','composing','completed','failed','expired')),
  current_goal          text,
  current_plan_ref      varchar(200),
  pending_steps         jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_steps       jsonb NOT NULL DEFAULT '[]'::jsonb,
  module_results        jsonb DEFAULT '[]'::jsonb,
  working_notes         jsonb DEFAULT '{}'::jsonb,
  shared_artifacts      jsonb DEFAULT '[]'::jsonb,
  error_state           jsonb,
  retry_state           jsonb,
  idempotency_key       varchar(300) UNIQUE,
  expires_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_exec_ctx_tenant_thread ON public.execution_contexts (tenant_id, thread_id);
CREATE INDEX idx_exec_ctx_trigger_msg   ON public.execution_contexts (trigger_message_id);
CREATE INDEX idx_exec_ctx_status        ON public.execution_contexts (status);
CREATE INDEX idx_exec_ctx_created_at    ON public.execution_contexts (created_at DESC);

-- ===========================================================================
-- TABEL: thread_resolution_audit  (context cum se populează thread-ul)
-- ===========================================================================
CREATE TABLE public.thread_resolution_audit (
  resolution_id        varchar(200) PRIMARY KEY,
  message_id           varchar(200) NOT NULL,
  tenant_id            varchar(200) NOT NULL,
  decision             varchar(50)  NOT NULL,
  resolved_thread_id   uuid,
  candidate_scores     jsonb DEFAULT '[]'::jsonb,
  ambiguity_detected   boolean NOT NULL DEFAULT false,
  content_class_used   varchar(50)  NOT NULL DEFAULT 'normalized_content',
  decision_reason      varchar(200),
  resolved_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_message ON public.thread_resolution_audit (tenant_id, message_id);
CREATE INDEX idx_audit_resolved_at    ON public.thread_resolution_audit (resolved_at DESC);

-- ===========================================================================
-- PROPOSED — tabel NOU `memory_items` pentru memory_module (5 acțiuni)
-- ===========================================================================
-- NOT YET APPLIED. Chat-ul memory_module va decide forma finală + va livra
-- migrația efectivă. DDL-ul de mai jos e propunerea aliniată la:
--   - Memory_Model_Spec.md §2 tiers (working trăiește în execution_contexts,
--     NU în memory_items → tier enum are doar 'recent' + 'long_term').
--   - Memory_Model_Spec.md §3 promotion rules (enforce via
--     corroboration_count ≥ 2 OR user_confirmed OR evidence_validated).
--   - Memory_Model_Spec.md §6 schema (required + optional fields).
--   - Module_Spec_Memory.md Input Contract (action enum complet: store,
--     search, recall, promote, supersede).
-- Separat de rag_memories: RAG-ul de business-context rămâne neatins.

CREATE TYPE memory_type_enum   AS ENUM ('fact','observation','pattern','inference','preference','constraint');
CREATE TYPE memory_tier_enum   AS ENUM ('recent','long_term');
CREATE TYPE memory_status_enum AS ENUM ('active','superseded','expired','archived');
-- `durability` reutilizează `rag_durability_enum` deja existent (stable/seasonal/volatile)

CREATE TABLE public.memory_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Conținut + vector
  content                text NOT NULL,
  embedding              vector NOT NULL,                       -- pgvector

  -- Clasificare
  memory_type            memory_type_enum   NOT NULL,
  category               text               NOT NULL,           -- free-text v1 (spec nu enumeră)
  durability             rag_durability_enum NOT NULL DEFAULT 'stable',
  tier                   memory_tier_enum   NOT NULL DEFAULT 'recent',

  -- Scoring
  confidence             numeric NOT NULL DEFAULT 0.700 CHECK (confidence       BETWEEN 0 AND 1),
  importance             numeric NOT NULL DEFAULT 0.500 CHECK (importance       BETWEEN 0 AND 1),

  -- Promotion enforcement
  corroboration_count    integer NOT NULL DEFAULT 1 CHECK (corroboration_count >= 1),
  user_confirmed         boolean NOT NULL DEFAULT false,
  evidence_validated     boolean NOT NULL DEFAULT false,

  -- Source context (required per spec §6)
  source_message_id      uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  source_thread_id       uuid REFERENCES public.threads(id)  ON DELETE SET NULL,

  -- Optional refs
  entity_id              uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  evidence_refs          jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array de {type, ref, thread_id?, message_id?}

  -- Lifecycle
  status                 memory_status_enum NOT NULL DEFAULT 'active',
  supersedes_memory_id   uuid REFERENCES public.memory_items(id) ON DELETE SET NULL,
  last_reconfirmed_at    timestamptz,
  valid_until            timestamptz,

  -- Idempotency (Module_Spec_Memory: execution_context_id + step_id)
  idempotency_key        varchar(300) UNIQUE,

  -- Metadata
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Indecși btree pentru filtre comune
CREATE INDEX idx_memory_items_tenant_id            ON public.memory_items (tenant_id);
CREATE INDEX idx_memory_items_tenant_tier          ON public.memory_items (tenant_id, tier);
CREATE INDEX idx_memory_items_tenant_type          ON public.memory_items (tenant_id, memory_type);
CREATE INDEX idx_memory_items_tenant_status        ON public.memory_items (tenant_id, status);
CREATE INDEX idx_memory_items_tenant_thread        ON public.memory_items (tenant_id, source_thread_id) WHERE source_thread_id IS NOT NULL;
CREATE INDEX idx_memory_items_tenant_entity        ON public.memory_items (tenant_id, entity_id)        WHERE entity_id        IS NOT NULL;
CREATE INDEX idx_memory_items_tenant_category      ON public.memory_items (tenant_id, category);
CREATE INDEX idx_memory_items_valid_until          ON public.memory_items (valid_until);
CREATE INDEX idx_memory_items_supersedes           ON public.memory_items (supersedes_memory_id)         WHERE supersedes_memory_id IS NOT NULL;

-- Index vector (cosine) pentru search_memory
CREATE INDEX idx_memory_items_embedding_ivfflat
  ON public.memory_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- NOTE pentru chat:
--   - `tier` enum **NU** include 'working' (working memory trăiește în
--     execution_contexts.working_notes / module_results).
--   - `store_memory` scrie cu `tier='recent'` (default).
--   - `promote_memory` face `UPDATE memory_items SET tier='long_term' ...`
--     DOAR când: (corroboration_count >= 2) OR user_confirmed=true OR
--     evidence_validated=true. Altfel handlerul returnează
--     status_kind:'partial' + motiv în promotion_decision.
--   - `supersede_memory` face `UPDATE old SET status='superseded'` +
--     `INSERT new WITH supersedes_memory_id=old.id, status='active'`.
--   - `recall_memory` nu generează embedding; SELECT cu filtre
--     (entity_id / source_thread_id / category / memory_type).
--   - `search_memory` generează embedding pentru query și folosește
--     `ORDER BY embedding <=> $q LIMIT $k` cu filtre tenant + status='active'.
