DELETE FROM public.execution_contexts
WHERE id = '33333333-3333-3333-3333-333333333333';

DELETE FROM public.threads
WHERE id = '55555555-5555-5555-5555-555555555555';

DELETE FROM public.outbound_delivery_ledger_claude_mcp
WHERE execution_context_id = '33333333-3333-3333-3333-333333333333';