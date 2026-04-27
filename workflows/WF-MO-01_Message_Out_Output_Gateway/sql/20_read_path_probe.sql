-- Happy-path read probe using the canonical fixture ids.
SELECT 'execution_context' AS probe, *
FROM public.execution_contexts
WHERE id = '33333333-3333-3333-3333-333333333333'
  AND tenant_id = '44444444-4444-4444-4444-444444444444'
UNION ALL
SELECT 'thread' AS probe, id, tenant_id, NULL::uuid AS thread_id, status, COALESCE(last_activity_at, now()) AS updated_at
FROM public.threads
WHERE id = '55555555-5555-5555-5555-555555555555'
  AND tenant_id = '44444444-4444-4444-4444-444444444444';