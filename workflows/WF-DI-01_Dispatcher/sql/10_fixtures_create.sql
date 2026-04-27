-- WF-DI-01 / 10_fixtures_create.sql
-- Optional fixture marker query only. No writes are required for source-pack validation.
SELECT
  'WF-DI-01_FIXTURE_CANONICAL_PLAN'::text AS fixture_label,
  'runtime_input'::text AS scope_class,
  'keep_until_stage_closure'::text AS cleanup_classification;
