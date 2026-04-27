-- 01_schema_inspect.sql — READ-ONLY live introspection for PL-01 build cycle
-- Purpose: produce authoritative evidence for the actual shape of execution_plans (or its absence)
--          and the relevant neighbor columns in execution_contexts.
-- Per 12_TOOL_FAILURE_MATRIX.md §5: schema truth comes ONLY from live introspection or authoritative migrations.
-- Execute FIRST. Do not proceed to DDL until this output is recorded in BUILD_REPORT.md.

-- 1) Does execution_plans exist? Who owns it?
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  pg_catalog.pg_get_userbyid(c.relowner) AS owner,
  c.relkind AS kind
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('execution_plans', 'execution_plans_claude_mcp');

-- 2) Column list for execution_plans if it exists
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('execution_plans', 'execution_plans_claude_mcp')
ORDER BY table_name, ordinal_position;

-- 3) Constraints on execution_plans
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('execution_plans', 'execution_plans_claude_mcp')
ORDER BY tc.table_name, tc.constraint_name;

-- 4) CHECK constraint text (critical for status/enum-like columns)
SELECT
  conname,
  conrelid::regclass AS table_ref,
  pg_get_constraintdef(oid) AS check_def
FROM pg_constraint
WHERE contype = 'c'
  AND conrelid::regclass::text IN ('execution_plans', 'execution_plans_claude_mcp');

-- 5) Indexes on execution_plans
SELECT
  schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('execution_plans', 'execution_plans_claude_mcp');

-- 6) Confirm execution_contexts.current_plan_ref column exists and its type
SELECT
  column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'execution_contexts'
  AND column_name IN ('current_plan_ref', 'id', 'tenant_id', 'thread_id');

-- 7) Privileges (for ownership decision per 11_DECISION_PRESETS.md §7)
SELECT
  grantee, privilege_type, table_name
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('execution_plans', 'execution_plans_claude_mcp', 'execution_contexts')
ORDER BY table_name, grantee;

-- 8) Current role identity
SELECT current_user, session_user, current_schema();
