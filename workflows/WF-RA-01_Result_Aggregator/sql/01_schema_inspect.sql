-- WF-RA-01 schema inspection (read-only)
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('execution_contexts', 'tasks', 'reminders', 'messages', 'rag_memories')
ORDER BY table_name;
