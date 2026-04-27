-- 02_upsert.sql — EC_Upsert_Context canonical SQL (exact text used by the n8n node)
-- Parameter order: $1 tenant_id (uuid), $2 thread_id (uuid), $3 trigger_message_id (uuid),
--                  $4 status (varchar), $5 pending_steps (jsonb), $6 completed_steps (jsonb),
--                  $7 idempotency_key (varchar), $8 expires_at (timestamptz)

INSERT INTO execution_contexts (
  tenant_id, thread_id, trigger_message_id, status,
  pending_steps, completed_steps, idempotency_key, expires_at
) VALUES (
  $1::uuid, $2::uuid, $3::uuid, $4,
  $5::jsonb, $6::jsonb, $7, $8::timestamptz
)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id, tenant_id, thread_id, trigger_message_id, status,
          current_goal, current_plan_ref, pending_steps, completed_steps,
          idempotency_key, expires_at, created_at, updated_at;
