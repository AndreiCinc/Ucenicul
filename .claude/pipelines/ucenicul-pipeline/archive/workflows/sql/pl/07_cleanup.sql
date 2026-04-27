-- 07_cleanup.sql — stage-local fixture cleanup
-- NOT EXECUTED DURING PREP CYCLE.
-- Execute ONLY at stage close, per 14_TEST_FIXTURE_REGISTRY.md §6 cleanup rule,
-- and ONLY after classifying each fixture (delete_now / keep_until_stage_closure /
-- keep_for_next_stage / keep_for_evidence).

-- WARNING: this deletes ONLY rows that carry the stage marker prefix.
-- It does NOT touch any row whose idempotency_key does not start with 'wf_pl_01_fixture_'.
-- It does NOT touch canonical/legacy data.

BEGIN;

-- Preview what would be deleted (run this first, verify, then run the DELETE)
SELECT id, idempotency_key, tenant_id, execution_id, status, created_at
FROM execution_plans_claude_mcp
WHERE idempotency_key LIKE 'wf_pl_01_fixture_%'
  AND idempotency_key NOT IN (
    -- carry-forward exclusions (kept for next stage)
    'wf_pl_01_fixture_v6_orpl_smoke_001'
  );

-- Uncomment to actually delete. Per 14_…§6 classify first.
-- DELETE FROM execution_plans_claude_mcp
-- WHERE idempotency_key LIKE 'wf_pl_01_fixture_%'
--   AND idempotency_key NOT IN (
--     'wf_pl_01_fixture_v6_orpl_smoke_001'
--   );

COMMIT;

-- If canonical execution_plans was used (not fallback), replace the table
-- name above but DO NOT cleanup without a before-snapshot of the canonical
-- table per 13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md.
