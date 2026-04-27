-- WF-RA-01 module-batch shape probe (documentation query placeholder)
-- No dedicated module_results table is assumed in MVP.
-- This file documents the expected read-only posture and batch shape checks
-- performed in code before aggregation.
SELECT
  $1::uuid AS execution_context_id,
  $2::uuid AS tenant_id,
  $3::uuid AS thread_id;
