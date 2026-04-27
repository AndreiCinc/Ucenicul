-- WF-DI-01 / 11_fixtures_cleanup.sql
-- No-op cleanup probe; stage is read-only in the canonical path.
SELECT 'WF-DI-01 cleanup is a no-op on the canonical path.'::text AS cleanup_note;
