-- WF-PL-01 / 10_fixtures_create.sql
-- Stage-safe fixture template. Keep read-only unless live proof explicitly requires materialized rows.
-- No-op by default for this source pack.

-- Example only:
-- INSERT INTO public.execution_contexts_claude_mcp (...)
-- VALUES (...)
-- ON CONFLICT DO NOTHING;
