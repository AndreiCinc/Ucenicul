-- WF-ME-01 schema inspection
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('execution_contexts', 'tasks', 'threads', 'messages')
ORDER BY table_name, ordinal_position;
