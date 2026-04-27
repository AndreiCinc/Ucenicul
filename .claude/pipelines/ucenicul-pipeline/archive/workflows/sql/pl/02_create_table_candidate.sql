-- 02_create_table_candidate.sql — CANDIDATE DDL for execution_plans
-- ==========================================================================
-- CANDIDATE DDL — NOT authoritative. Live-introspect first via 01_schema_inspect.sql.
-- Per 12_TOOL_FAILURE_MATRIX.md §5: no schema inference from validator errors.
-- Per 05_DB_AUTONOMY_PLAYBOOK.md: if ALTER/CREATE is blocked, use the fallback at
-- 03_create_table_fallback_claude_mcp.sql instead.
-- ==========================================================================
--
-- Target: public.execution_plans
-- Shape reference: 06_STAGE_WF-PL-01.md §"Required DB side effects"
-- Sibling reference: BUILD_REPORT.md (EC-01) §2 — live execution_contexts shape
--                    confirms pattern (UNIQUE idempotency_key, TEXT type, CHECK status).

BEGIN;

CREATE TABLE IF NOT EXISTS public.execution_plans (
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

-- FK — apply ONLY if execution_contexts (canonical, not _claude_mcp) is confirmed live.
-- Commented out in candidate to avoid cross-table coupling until the live decision is made.
-- ALTER TABLE public.execution_plans
--   ADD CONSTRAINT execution_plans_execution_id_fkey
--   FOREIGN KEY (execution_id) REFERENCES public.execution_contexts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_execution_plans_tenant_execution
  ON public.execution_plans (tenant_id, execution_id);

CREATE INDEX IF NOT EXISTS idx_execution_plans_status
  ON public.execution_plans (status);

CREATE INDEX IF NOT EXISTS idx_execution_plans_idempotency_key
  ON public.execution_plans (idempotency_key);

COMMIT;
