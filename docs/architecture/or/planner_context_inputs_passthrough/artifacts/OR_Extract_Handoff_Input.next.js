// OR_Extract_Handoff_Input — v1.1 (OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP 2026-04-26)
// v1.1 adds envelope_metadata passthrough so OR_Build_Handoff_Payload can allowlist
// safe IDs into planner_context.inputs.
const ec = $json._normalized_ec_result;
const p = ec.payload;
const env_meta = (p.envelope_metadata && typeof p.envelope_metadata === 'object' && !Array.isArray(p.envelope_metadata))
  ? p.envelope_metadata : {};
return [{ json: {
  tenant_id: p.tenant_id,
  thread_id: p.thread_id,
  execution_id: p.execution_id,
  trigger_message_id: p.trigger_message_id,
  idempotency_key: p.idempotency_key,
  expected_status: p.status,
  ttl_seconds: p.ttl_seconds,
  source_module: ec.module_name,
  warnings: ec.warnings || [],
  envelope_metadata: env_meta
}}];
