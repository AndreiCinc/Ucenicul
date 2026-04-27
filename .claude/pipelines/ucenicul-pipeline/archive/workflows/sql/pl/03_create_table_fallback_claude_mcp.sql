-- 03_create_table_fallback_claude_mcp.sql — FALLBACK DDL
-- ==========================================================================
-- Use this ONLY if DDL on public.execution_plans is blocked by ownership or
-- risk per 05_DB_AUTONOMY_PLAYBOOK.md + 11_DECISION_PRESETS.md §7.
-- ==========================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.execution_plans_claude_mcp (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  execution_id    UUID NOT NULL,
  thread_id       UUID NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('planned','superseded','abandoned','completed','failed')),
  steps           JSONB NOT NULL,
  validation      JSONB NOT NULL,
  plan_envelope_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_execution_plans_claude_mcp_tenant_execution
  ON public.execution_plans_claude_mcp (tenant_id, execution_id);

CREATE INDEX IF NOT EXISTS idx_execution_plans_claude_mcp_status
  ON public.execution_plans_claude_mcp (status);

CREATE INDEX IF NOT EXISTS idx_execution_plans_claude_mcp_idempotency_key
  ON public.execution_plans_claude_mcp (idempotency_key);

COMMIT;

-- NOTE: if the fallback is adopted, the n8n node PL_Upsert_Plan must target
-- execution_plans_claude_mcp instead of execution_plans. This is resolved via
-- a single templated env var (see workflows/WF-PL-01_IMPORT_PATCH_PLAN.md).
