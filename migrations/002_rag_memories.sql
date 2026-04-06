-- ============================================================
-- AI Assistant MVP — Migration 002: rag_memories table
-- Run on: Railway PostgreSQL (Frankfurt EU)
-- Date: 2026-04-03
-- Depends on: 001_initial_schema.sql (pgvector extension + tenants table)
-- ============================================================

-- rag_memories: semantic memory with pgvector embeddings
-- Replaces the legacy vector_memories table for new brain contract
-- 8 categories, 3 kinds, 3 durability levels
CREATE TABLE IF NOT EXISTS rag_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  memory_category TEXT NOT NULL CHECK (memory_category IN (
    'business_profile', 'customer_market', 'growth_context',
    'entrepreneur_profile', 'relationship_history',
    'operational_patterns', 'preferences', 'constraints'
  )),
  memory_kind TEXT NOT NULL CHECK (memory_kind IN ('fact', 'insight', 'advice')),
  durability TEXT NOT NULL DEFAULT 'stable' CHECK (durability IN ('stable', 'seasonal', 'volatile')),
  importance_score FLOAT NOT NULL DEFAULT 0.5 CHECK (importance_score BETWEEN 0 AND 1),
  source_type TEXT DEFAULT 'brain_main_inbound_mvp',
  source_ref UUID,
  entity_type TEXT,
  entity_ref TEXT,
  last_reconfirmed_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_memories_tenant ON rag_memories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_memories_category ON rag_memories(tenant_id, memory_category);
CREATE INDEX IF NOT EXISTS idx_rag_memories_importance ON rag_memories(tenant_id, importance_score DESC);

-- Auto-update trigger
CREATE TRIGGER update_rag_memories_updated_at
BEFORE UPDATE ON rag_memories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: IVFFlat embedding index — create ONLY after >1000 rows exist
-- CREATE INDEX idx_rag_memories_embedding ON rag_memories
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Verify
SELECT 'rag_memories created' AS status,
       count(*) AS existing_rows
FROM rag_memories;
