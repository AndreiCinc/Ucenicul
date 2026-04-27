-- WF-MO-01 schema inspection
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'execution_contexts',
    'threads',
    'messages',
    'tenants',
    'outbound_delivery_ledger_claude_mcp'
  )
ORDER BY table_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('execution_contexts', 'threads', 'messages', 'tenants')
ORDER BY table_name, ordinal_position;