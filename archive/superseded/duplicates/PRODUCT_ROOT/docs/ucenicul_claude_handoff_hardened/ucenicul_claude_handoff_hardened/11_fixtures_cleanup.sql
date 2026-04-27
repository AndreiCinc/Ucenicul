-- WF-OR-01 :: optional fallback fixture cleanup
DELETE FROM public.execution_contexts_claude_mcp
WHERE stage_code = 'WF-OR-01'
  AND fixture_label IN (
    'WF-OR-01_FIXTURE_CANONICAL_ROW',
    'WF-OR-01_FIXTURE_CROSS_TENANT_ROW'
  );
