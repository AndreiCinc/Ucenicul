CREATE TABLE IF NOT EXISTS public.outbound_delivery_ledger_claude_mcp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  execution_context_id uuid NOT NULL,
  thread_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  channel text NOT NULL,
  delivery_target text NOT NULL,
  response_text_hash text NOT NULL,
  provider_message_ref text,
  delivery_status text NOT NULL CHECK (delivery_status IN ('attempted', 'delivered', 'blocked', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_delivery_ledger_claude_mcp_idem
ON public.outbound_delivery_ledger_claude_mcp (tenant_id, idempotency_key);