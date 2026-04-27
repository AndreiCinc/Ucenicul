-- WF-OR-01 :: schema reality check for the OR read-path
-- Purpose: verify that public.execution_contexts has every column the OR stage
--          reads, with types compatible with the handoff contract.
-- This SQL is READ-ONLY and has no side effects.

-- A. Columns expected by OR read-path (subset of the full EC schema)
SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'execution_contexts'
  AND column_name IN (
    'id',
    'tenant_id',
    'thread_id',
    'trigger_message_id',
    'idempotency_key',
    'status',
    'current_goal',
    'current_plan_ref',
    'pending_steps',
    'completed_steps',
    'created_at',
    'updated_at',
    'expires_at'
  )
ORDER BY ordinal_position;

-- B. Status CHECK must permit 'initialized' so the OR stage can classify planning-readiness.
SELECT tc.constraint_name, cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name   = 'execution_contexts'
  AND tc.constraint_type = 'CHECK';

-- C. Indexes — confirm idempotency_key is indexed (global UNIQUE is the known pattern).
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'execution_contexts'
ORDER BY indexname;

-- D. Live row shape sanity — return a small sample (read-only).
SELECT id,
       tenant_id,
       thread_id,
       trigger_message_id,
       status,
       idempotency_key,
       created_at,
       updated_at,
       expires_at,
       CASE
         WHEN expires_at IS NULL THEN NULL
         ELSE EXTRACT(EPOCH FROM (expires_at - created_at))::int
       END AS ttl_seconds
FROM public.execution_contexts
ORDER BY created_at DESC
LIMIT 5;

-- E. Optional fallback structure presence check (only returns rows if present).
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'execution_contexts_claude_mcp'
ORDER BY ordinal_position;
