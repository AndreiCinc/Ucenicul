-- WF-PL-01 / 20_read_path_probe.sql
-- Read-only probe used during live verification.

SELECT
  COUNT(*) AS matched_rows
FROM public.execution_contexts ec
WHERE ec.id = $1::uuid
  AND ec.tenant_id = $2::uuid
  AND ec.thread_id = $3::uuid;
