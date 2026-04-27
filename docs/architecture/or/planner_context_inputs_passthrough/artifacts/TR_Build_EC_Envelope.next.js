// TR_Build_EC_Envelope — v1.1 (OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP 2026-04-26)
// v1.0 base: Phase 8 edge-1 adapter. Reshapes TR_Return_Result (flat) into
// EC_Validate_Input (flat) shape.
// v1.1 adds: pass through chat envelope metadata. Read it from TR_Validate_Input
// (the first node that preserves the full envelope), since TR_Return_Result/
// TR_Build_Result drop arbitrary fields.
function safeNode(name) {
  try { const it = $(name).first(); return (it && it.json) ? it.json : {}; } catch (e) { return {}; }
}
const src = $json || {};
if (src.error || src.status === 'failed' || src.status_kind === 'failed') {
  return [{ json: src }];
}
const tenant_id = src.tenant_id;
const thread_id = src.resolved_thread_id;
const trigger_message_id = src.message_id;
const resolution_method = src.resolution_action || src.decision || null;
const resolved_at = src.timestamp || null;
if (!tenant_id || !thread_id || !trigger_message_id) {
  return [{ json: {
    status_kind: 'failed', result_type: 'error', module_name: 'tr_to_ec_adapter',
    error: {
      code: 'MISSING_REQUIRED_IDS',
      message: 'TR result lacks tenant_id, resolved_thread_id, or message_id.',
      missing_fields: ['tenant_id','resolved_thread_id','message_id'].filter(f => !src[f])
    }
  }}];
}
const idempotency_key = `tr-to-ec:${tenant_id}:${trigger_message_id}:v1`;
// v1.1: read metadata from TR_Validate_Input (canonical source) — TR_Return_Result
// strips it. metadata is the chat-envelope metadata field (object only; arrays / non-objects → {}).
const validated = safeNode('TR_Validate_Input');
const env_meta = (validated.metadata && typeof validated.metadata === 'object' && !Array.isArray(validated.metadata))
  ? validated.metadata : {};
return [{ json: {
  tenant_id, thread_id, trigger_message_id,
  resolution_method, resolved_at, idempotency_key,
  envelope_metadata: env_meta
}}];
