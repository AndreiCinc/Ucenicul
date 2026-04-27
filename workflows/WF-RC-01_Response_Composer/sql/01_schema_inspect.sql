-- WF-RC-01 schema inspection (read-only)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('execution_contexts', 'threads', 'messages')
ORDER BY table_name;
