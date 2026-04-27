-- WF-PL-01 / 01_schema_inspect.sql
-- Read-only schema probe for the plan-generation stage.

SELECT
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'execution_contexts'
ORDER BY c.ordinal_position;
