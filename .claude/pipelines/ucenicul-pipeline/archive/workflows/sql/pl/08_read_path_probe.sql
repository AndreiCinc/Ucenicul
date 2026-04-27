-- 08_read_path_probe.sql — READ-ONLY evidence queries for V3–V6
-- Use these during and after runtime tests to capture BUILD_REPORT / AUDIT_REPORT evidence.
-- NOT EXECUTED DURING PREP CYCLE.

-- Probe A — confirm V3 happy-path row exists
SELECT id, tenant_id, execution_id, status, jsonb_array_length(steps) AS step_count,
       validation->>'graph_valid' AS graph_valid,
       validation->>'privacy_preflight_ok' AS privacy_preflight_ok,
       idempotency_key, created_at
FROM execution_plans_claude_mcp
WHERE idempotency_key = $1;  -- bind 'wf_pl_01_fixture_v3_happy_001'

-- Probe B — confirm execution_contexts.current_plan_ref was updated
SELECT ec.id, ec.current_plan_ref, ep.id AS ep_id, ep.idempotency_key
FROM execution_contexts ec
LEFT JOIN execution_plans_claude_mcp ep ON ep.id = ec.current_plan_ref
WHERE ec.id = $1;  -- bind the execution_id used in V3

-- Probe C — confirm V4 replay did NOT create a duplicate
SELECT count(*) AS copies
FROM execution_plans_claude_mcp
WHERE idempotency_key = $1;  -- bind 'wf_pl_01_fixture_v3_happy_001'
-- Expect: 1

-- Probe D — V5 cross-tenant isolation: should return exactly one row with tenant A
-- (not two). Run once bound to tenant A, then to tenant B, compare.
SELECT tenant_id, idempotency_key
FROM execution_plans_claude_mcp
WHERE idempotency_key LIKE 'wf_pl_01_fixture_v5_%';
-- Expect: one row per tenant marker, no cross-tenant leakage.

-- Probe E — steps array structural check
SELECT
  idempotency_key,
  jsonb_array_elements(steps)->>'step_id' AS step_id,
  jsonb_array_elements(steps)->>'target_module' AS target_module,
  jsonb_array_elements(steps)->>'status' AS status,
  jsonb_array_elements(steps)->'depends_on' AS depends_on
FROM execution_plans_claude_mcp
WHERE idempotency_key = $1;
