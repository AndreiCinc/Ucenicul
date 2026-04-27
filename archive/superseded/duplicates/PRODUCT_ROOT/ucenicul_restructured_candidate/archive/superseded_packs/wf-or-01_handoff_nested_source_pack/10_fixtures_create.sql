-- WF-OR-01 :: optional fallback fixtures
-- Use ONLY if live canonical read-path is blocked or isolated fallback proof is required.

CREATE TABLE IF NOT EXISTS public.execution_contexts_claude_mcp (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  thread_id uuid NOT NULL,
  trigger_message_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  fixture_label text NOT NULL,
  stage_code text NOT NULL DEFAULT 'WF-OR-01'
);

INSERT INTO public.execution_contexts_claude_mcp (
  id,
  tenant_id,
  thread_id,
  trigger_message_id,
  idempotency_key,
  status,
  expires_at,
  fixture_label
)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'wf_or_01_fixture_happy_v1',
    'initialized',
    now() + interval '15 minutes',
    'WF-OR-01_FIXTURE_CANONICAL_ROW'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    'wf_or_01_fixture_cross_tenant_v1',
    'initialized',
    now() + interval '15 minutes',
    'WF-OR-01_FIXTURE_CROSS_TENANT_ROW'
  )
ON CONFLICT (id) DO NOTHING;
