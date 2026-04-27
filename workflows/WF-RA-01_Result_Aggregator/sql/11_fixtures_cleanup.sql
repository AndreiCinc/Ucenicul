-- WF-RA-01 fixtures cleanup
DELETE FROM public.execution_contexts
WHERE id = $1::uuid
  AND tenant_id = $2::uuid;
