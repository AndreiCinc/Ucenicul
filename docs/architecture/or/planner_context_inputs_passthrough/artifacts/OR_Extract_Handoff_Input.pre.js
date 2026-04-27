
const ec = $json._normalized_ec_result;
const p = ec.payload;
return [{ json: {
  tenant_id: p.tenant_id,
  thread_id: p.thread_id,
  execution_id: p.execution_id,
  trigger_message_id: p.trigger_message_id,
  idempotency_key: p.idempotency_key,
  expected_status: p.status,
  ttl_seconds: p.ttl_seconds,
  source_module: ec.module_name,
  warnings: ec.warnings || []
}}];

