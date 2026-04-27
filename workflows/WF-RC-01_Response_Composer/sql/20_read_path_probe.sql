-- RC read-path probe
SELECT
  (SELECT COUNT(*) FROM public.execution_contexts WHERE id = $1::uuid AND tenant_id = $2::uuid) AS execution_context_matches,
  (SELECT COUNT(*) FROM public.threads WHERE id = $3::uuid AND tenant_id = $2::uuid) AS thread_matches;
