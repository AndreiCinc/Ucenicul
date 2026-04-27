-- =============================================================================
-- migration.sql — memory_items (Phase-4 frozen — 2026-04-20)
--
-- Mission:       new memory_module architecture (separate from rag_memories)
-- Authority:     docs/architecture/memory/schema/memory_items_schema.md
--                docs/architecture/Memory_Model_Spec.md
--                docs/architecture/Module_Spec_Memory.md
-- Write fence:   docs/architecture/memory/** only (NOT applied to db/migrations/
--                in Phase 4 per decision B1)
-- Live-verified: 2026-04-20 against Ucenicul postgres
--                - tenants.id, messages.id, threads.id, entities.id  = uuid PK
--                - pg_extension vector 0.8.2, pgcrypto 1.3, uuid-ossp 1.1
--                - rag_durability_enum exists: {stable, seasonal, volatile}
--                - public.set_updated_at() already exists (reused)
--                - memory_items + 3 new enums DO NOT exist (clean slate)
--
-- Rollback:      see ROLLBACK block at end of file (commented).
--
-- Safe to re-run: all CREATE statements are idempotency-guarded
--                (IF NOT EXISTS / DO $$ ... END $$ existence checks).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. EXTENSION GUARDS
-- -----------------------------------------------------------------------------
-- All three extensions are already present in the target DB; these are
-- defensive no-ops that make the migration portable.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
-- uuid-ossp not required here (we use gen_random_uuid from pgcrypto).


-- -----------------------------------------------------------------------------
-- 2. ENUM TYPES
-- -----------------------------------------------------------------------------
-- Three new enums introduced by this mission. All guarded so re-running the
-- migration after a partial failure does not raise "already exists".

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_type_enum') THEN
    CREATE TYPE public.memory_type_enum AS ENUM (
      'fact',
      'observation',
      'pattern',
      'inference',
      'preference',
      'constraint'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_tier_enum') THEN
    CREATE TYPE public.memory_tier_enum AS ENUM (
      'recent',
      'long_term'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_status_enum') THEN
    CREATE TYPE public.memory_status_enum AS ENUM (
      'active',
      'superseded',
      'expired',
      'archived'
    );
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 3. set_updated_at() HELPER (reuse if already defined)
-- -----------------------------------------------------------------------------
-- Live DB already has public.set_updated_at() (verified 2026-04-20).
-- We use a guarded DO block rather than CREATE OR REPLACE because the existing
-- function is owned by a different role — CREATE OR REPLACE would raise
-- "must be owner of function set_updated_at". The DO block creates the helper
-- only when absent (e.g. fresh test DB), leaving the live DB untouched.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_updated_at'
      AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END
    $fn$;
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 4. memory_items TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.memory_items (
  -- identity
  id                     uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid                          NOT NULL
                                                       REFERENCES public.tenants(id)
                                                       ON DELETE CASCADE,

  -- classification
  memory_type            public.memory_type_enum       NOT NULL,
  category               text                          NOT NULL,

  -- body
  content                text                          NOT NULL,

  -- scalars (defaults per frozen decision M-004)
  confidence             numeric(4,3)                  NOT NULL DEFAULT 0.800,
  importance             numeric(4,3)                  NOT NULL DEFAULT 0.500,
  durability             public.rag_durability_enum    NOT NULL DEFAULT 'stable',

  -- lifecycle
  tier                   public.memory_tier_enum       NOT NULL DEFAULT 'recent',
  status                 public.memory_status_enum     NOT NULL DEFAULT 'active',

  -- source linkage
  source_thread_id       uuid                          NOT NULL
                                                       REFERENCES public.threads(id)
                                                       ON DELETE RESTRICT,
  source_message_id      uuid                          REFERENCES public.messages(id)
                                                       ON DELETE SET NULL,
  entity_id              uuid                          REFERENCES public.entities(id)
                                                       ON DELETE SET NULL,

  -- structured payload
  evidence_refs          jsonb                         NOT NULL DEFAULT '[]'::jsonb,
  metadata               jsonb                         NOT NULL DEFAULT '{}'::jsonb,

  -- semantic
  embedding              vector(1536),                 -- nullable per decision C2

  -- promotion-support fields (frozen decision D2)
  corroboration_count    integer                       NOT NULL DEFAULT 1,
  user_confirmed         boolean                       NOT NULL DEFAULT false,
  evidence_validated     boolean                       NOT NULL DEFAULT false,
  last_reconfirmed_at    timestamptz,
  valid_until            timestamptz,

  -- supersede lineage
  supersedes_memory_id   uuid                          REFERENCES public.memory_items(id)
                                                       ON DELETE SET NULL,

  -- idempotency (frozen decision E1)
  idempotency_key        text                          NOT NULL,

  -- timestamps
  created_at             timestamptz                   NOT NULL DEFAULT now(),
  updated_at             timestamptz                   NOT NULL DEFAULT now(),

  -- --------------------------------------------------------------------------
  -- CHECK constraints
  -- --------------------------------------------------------------------------
  CONSTRAINT memory_items_confidence_bounds_ck
    CHECK (confidence BETWEEN 0 AND 1),

  CONSTRAINT memory_items_importance_bounds_ck
    CHECK (importance BETWEEN 0 AND 1),

  CONSTRAINT memory_items_corroboration_min_ck
    CHECK (corroboration_count >= 1),

  -- category regex — lowercase snake_case, starts with letter, max 64 chars
  CONSTRAINT memory_items_category_format_ck
    CHECK (category ~ '^[a-z][a-z0-9_]{0,63}$'),

  -- no row may supersede itself
  CONSTRAINT memory_items_no_self_supersede_ck
    CHECK (supersedes_memory_id IS DISTINCT FROM id),

  -- idempotency global uniqueness (decision E1)
  CONSTRAINT memory_items_idempotency_key_ukey
    UNIQUE (idempotency_key)
);


-- -----------------------------------------------------------------------------
-- 5. INDEXES
-- -----------------------------------------------------------------------------
-- All btree indexes are partial on status='active' where appropriate, because
-- search/recall default to active (decision M-003). The ivfflat semantic index
-- is partial on embedding IS NOT NULL to avoid indexing unembedded rows.

-- 5.1 primary recall path: tenant + thread + recency
CREATE INDEX IF NOT EXISTS idx_memory_items_tenant_thread_created
  ON public.memory_items (tenant_id, source_thread_id, created_at DESC)
  WHERE status = 'active';

-- 5.2 entity-scoped recall
CREATE INDEX IF NOT EXISTS idx_memory_items_tenant_entity_created
  ON public.memory_items (tenant_id, entity_id, created_at DESC)
  WHERE status = 'active' AND entity_id IS NOT NULL;

-- 5.3 category-scoped recall
CREATE INDEX IF NOT EXISTS idx_memory_items_tenant_category_created
  ON public.memory_items (tenant_id, category, created_at DESC)
  WHERE status = 'active';

-- 5.4 type + tier intersection
CREATE INDEX IF NOT EXISTS idx_memory_items_tenant_type_tier_created
  ON public.memory_items (tenant_id, memory_type, tier, created_at DESC)
  WHERE status = 'active';

-- 5.5 semantic search — ivfflat cosine, partial on embedded active rows
CREATE INDEX IF NOT EXISTS idx_memory_items_embedding_cos
  ON public.memory_items
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE embedding IS NOT NULL AND status = 'active';

-- 5.6 supersede lineage lookup
CREATE INDEX IF NOT EXISTS idx_memory_items_supersedes
  ON public.memory_items (supersedes_memory_id)
  WHERE supersedes_memory_id IS NOT NULL;

-- 5.7 (implicit via UNIQUE idempotency_key — no explicit index needed)

-- 5.8 valid_until expiry sweeper support
CREATE INDEX IF NOT EXISTS idx_memory_items_valid_until
  ON public.memory_items (valid_until)
  WHERE valid_until IS NOT NULL AND status = 'active';


-- -----------------------------------------------------------------------------
-- 6. TRIGGERS
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_memory_items_set_updated_at ON public.memory_items;

CREATE TRIGGER trg_memory_items_set_updated_at
  BEFORE UPDATE ON public.memory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 7. COMMENTS (documentation layer, safe to re-run)
-- -----------------------------------------------------------------------------

COMMENT ON TABLE  public.memory_items                     IS 'Durable thread-aware memory store for memory_module (Phase 4 frozen 2026-04-20). Separate from rag_memories.';
COMMENT ON COLUMN public.memory_items.tier                IS 'recent (default) or long_term. Working memory lives in execution context, NOT here.';
COMMENT ON COLUMN public.memory_items.status              IS 'active (default), superseded (set by supersede_memory), expired (background), archived (reserved).';
COMMENT ON COLUMN public.memory_items.source_thread_id    IS 'Required at insert per decision M-005. ON DELETE RESTRICT — thread hard-delete is blocked while memory rows reference it; app must explicitly clean up first.';
COMMENT ON COLUMN public.memory_items.embedding           IS 'vector(1536) — nullable. Recall_memory does not require embedding; search_memory does.';
COMMENT ON COLUMN public.memory_items.idempotency_key     IS 'Format: {action}:{execution_context_id}:{step_id}. Applied on store/supersede. Global UNIQUE.';
COMMENT ON COLUMN public.memory_items.evidence_refs       IS 'jsonb array. Item shape: type, ref, thread_id?, message_id?, note?. Shape enforced by handler, not DB, in v1.';
COMMENT ON COLUMN public.memory_items.corroboration_count IS 'Increments when a repeat observation supports this memory. Promotion criterion A.';
COMMENT ON COLUMN public.memory_items.user_confirmed      IS 'Promotion criterion B — set to true on explicit user confirmation.';
COMMENT ON COLUMN public.memory_items.evidence_validated  IS 'Promotion criterion C — set to true when evidence-based validation succeeded.';
COMMENT ON COLUMN public.memory_items.supersedes_memory_id IS 'Points to prior row replaced by supersede_memory. Both rows preserved per Memory_Model_Spec §9.';


-- =============================================================================
-- MIGRATION END
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ROLLBACK (commented — uncomment to execute)
-- -----------------------------------------------------------------------------
-- Rollback is intentionally conservative: it removes this migration's artifacts
-- only. It does NOT drop shared extensions (vector, pgcrypto) or the reusable
-- public.set_updated_at() helper, because other tables may depend on them.
--
-- Order is reverse of creation.
--
-- /*
-- DROP TRIGGER  IF EXISTS trg_memory_items_set_updated_at ON public.memory_items;
--
-- DROP INDEX IF EXISTS public.idx_memory_items_valid_until;
-- DROP INDEX IF EXISTS public.idx_memory_items_supersedes;
-- DROP INDEX IF EXISTS public.idx_memory_items_embedding_cos;
-- DROP INDEX IF EXISTS public.idx_memory_items_tenant_type_tier_created;
-- DROP INDEX IF EXISTS public.idx_memory_items_tenant_category_created;
-- DROP INDEX IF EXISTS public.idx_memory_items_tenant_entity_created;
-- DROP INDEX IF EXISTS public.idx_memory_items_tenant_thread_created;
--
-- DROP TABLE IF EXISTS public.memory_items;
--
-- -- Only drop enums if no other object references them.
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_depend d
--                  JOIN pg_type t ON t.oid = d.refobjid
--                  WHERE t.typname = 'memory_status_enum'
--                    AND d.deptype = 'n') THEN
--     DROP TYPE IF EXISTS public.memory_status_enum;
--   END IF;
--   IF NOT EXISTS (SELECT 1 FROM pg_depend d
--                  JOIN pg_type t ON t.oid = d.refobjid
--                  WHERE t.typname = 'memory_tier_enum'
--                    AND d.deptype = 'n') THEN
--     DROP TYPE IF EXISTS public.memory_tier_enum;
--   END IF;
--   IF NOT EXISTS (SELECT 1 FROM pg_depend d
--                  JOIN pg_type t ON t.oid = d.refobjid
--                  WHERE t.typname = 'memory_type_enum'
--                    AND d.deptype = 'n') THEN
--     DROP TYPE IF EXISTS public.memory_type_enum;
--   END IF;
-- END $$;
-- */
