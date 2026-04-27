-- 03_load_existing.sql — EC_Load_Existing_Context canonical SQL
-- Parameter order: $1 idempotency_key, $2 tenant_id (uuid)

SELECT id, tenant_id, thread_id, trigger_message_id, status,
       current_goal, current_plan_ref, pending_steps, completed_steps,
       idempotency_key, expires_at, created_at, updated_at
FROM execution_contexts
WHERE idempotency_key = $1 AND tenant_id = $2::uuid
LIMIT 1;
