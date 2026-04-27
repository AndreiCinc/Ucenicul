-- 01_schema_inspect.sql — WF-EC-01 schema reality check
-- Verifies live schema of execution_contexts matches stage contract.

-- A. Columns
SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'execution_contexts'
ORDER BY ordinal_position;

-- B. Constraints (PK, UNIQUE, CHECK)
SELECT tc.constraint_name, tc.constraint_type, cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name   = 'execution_contexts'
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK');

-- C. Indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'execution_contexts'
ORDER BY indexname;

-- D. Foreign keys (expect 0 for MVP)
SELECT tc.constraint_name, kcu.column_name,
       ccu.table_name  AS foreign_table,
       ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name   = 'execution_contexts'
  AND tc.constraint_type = 'FOREIGN KEY';

-- E. Live row count + recent rows
SELECT COUNT(*) AS row_count FROM public.execution_contexts;

SELECT id, tenant_id, thread_id, trigger_message_id, status, idempotency_key, created_at
FROM public.execution_contexts
ORDER BY created_at DESC
LIMIT 5;
