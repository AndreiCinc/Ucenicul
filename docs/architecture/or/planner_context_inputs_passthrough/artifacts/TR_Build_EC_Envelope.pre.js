// TR_Build_EC_Envelope — Phase 8 edge-1 adapter.
// Reshapes TR_Return_Result (flat) into EC_Validate_Input (flat) shape.
const src = $json || {};
// If TR already surfaced an error, bail out and propagate unchanged.
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
    status_kind: 'failed',
    result_type: 'error',
    module_name: 'tr_to_ec_adapter',
    error: {
      code: 'MISSING_REQUIRED_IDS',
      message: 'TR result lacks tenant_id, resolved_thread_id, or message_id.',
      missing_fields: ['tenant_id','resolved_thread_id','message_id'].filter(f => !src[f])
    }
  } }];
}
const idempotency_key = `tr-to-ec:${tenant_id}:${trigger_message_id}:v1`;
return [{ json: {
  tenant_id, thread_id, trigger_message_id,
  resolution_method, resolved_at, idempotency_key
} }];
