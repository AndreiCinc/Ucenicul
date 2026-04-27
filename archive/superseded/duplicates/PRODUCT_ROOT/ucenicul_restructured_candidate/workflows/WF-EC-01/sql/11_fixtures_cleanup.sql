-- 11_fixtures_cleanup.sql — Remove ONLY WF-EC-01 stage-marked fixtures.
-- Safe to run repeatedly. Does NOT touch carry-forward TR evidence
-- (idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000001:aaaabbbb-0000-0000-0000-000000000010:exec_ctx:v1').

DELETE FROM public.execution_contexts
WHERE idempotency_key LIKE 'wfec01_fixture_%'
   OR idempotency_key LIKE 'wfec01_test_%';

DELETE FROM public.messages
WHERE id IN (
  'eeeeeeec-0100-0000-0000-000000000001'::uuid,
  'eeeeeeec-0100-0000-0000-000000000002'::uuid
);

DELETE FROM public.threads
WHERE id IN (
  '11111111-0000-0000-0000-00000000ec01'::uuid,
  '22222222-0000-0000-0000-00000000ec02'::uuid
);

-- Tenant #2 is NOT deleted on cleanup (it may be referenced by other stages).
-- If you truly need to remove it for a clean slate, uncomment the next line:
-- DELETE FROM public.tenants WHERE id='aaaaaaaa-0000-0000-0000-000000000002';
