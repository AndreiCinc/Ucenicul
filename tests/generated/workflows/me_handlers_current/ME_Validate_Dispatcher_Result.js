
const input = $json;
let candidate = input;
if (input && typeof input.chatInput === 'string' && !input.status_kind && !input.dispatcher_input) {
  try { candidate = JSON.parse(input.chatInput); } catch (e) { candidate = input; }
}
function invalid(code, message, missing) {
  return [{ json: { _valid: 'false', error_code: code, error_message: message, missing_fields: missing || [] } }];
}
if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
  return invalid('INVALID_DISPATCH_INPUT', 'Input is not a JSON object.', ['root']);
}
const requiredTop = ['status_kind','result_type','execution_context_id','thread_id','tenant_id','dispatcher_input'];
const missingTop = requiredTop.filter(k => !(k in candidate));
if (missingTop.length) return invalid('INVALID_DISPATCH_INPUT', 'Dispatcher envelope missing required top-level fields.', missingTop);
if (candidate.status_kind !== 'success') return invalid('INVALID_DISPATCH_INPUT', 'status_kind must be success.', ['status_kind']);
if (candidate.result_type !== 'dispatch') return invalid('INVALID_DISPATCH_INPUT', 'result_type must be dispatch.', ['result_type']);
const di = candidate.dispatcher_input;
if (!di || typeof di !== 'object' || Array.isArray(di)) return invalid('INVALID_DISPATCH_INPUT', 'dispatcher_input must be an object.', ['dispatcher_input']);
const requiredDi = ['dispatch_allowed','module_execution_started','response_generation_allowed','domain_writes_performed','step'];
const missingDi = requiredDi.filter(k => !(k in di));
if (missingDi.length) return invalid('INVALID_DISPATCH_INPUT', 'Dispatcher input is incomplete.', missingDi.map(k => `dispatcher_input.${k}`));
if (di.dispatch_allowed !== true) return invalid('INVALID_DISPATCH_INPUT', 'Dispatch is not allowed by upstream guard flags.', ['dispatcher_input.dispatch_allowed']);
if (di.module_execution_started !== false) return invalid('INVALID_DISPATCH_INPUT', 'Module execution already started for this dispatch envelope.', ['dispatcher_input.module_execution_started']);
if (di.response_generation_allowed !== false) return invalid('INVALID_DISPATCH_INPUT', 'Response generation must remain disabled in module execution stage.', ['dispatcher_input.response_generation_allowed']);
if (di.domain_writes_performed !== false) return invalid('INVALID_DISPATCH_INPUT', 'Dispatcher envelope already indicates domain writes were performed.', ['dispatcher_input.domain_writes_performed']);
const step = di.step;
if (!step || typeof step !== 'object' || Array.isArray(step)) return invalid('INVALID_DISPATCH_INPUT', 'dispatcher_input.step must be an object.', ['dispatcher_input.step']);
const requiredStep = ['step_id','module_name','purpose','inputs','execution_mode'];
const missingStep = requiredStep.filter(k => !(k in step));
if (missingStep.length) return invalid('MISSING_REQUIRED_FIELDS', 'Dispatch step is missing required fields.', missingStep.map(k => `dispatcher_input.step.${k}`));
return [{ json: {
  _valid: 'true',
  execution_context_id: String(candidate.execution_context_id),
  thread_id: String(candidate.thread_id),
  tenant_id: String(candidate.tenant_id),
  idempotency_key: String(candidate.idempotency_key || `dispatch:${step.step_id}`),
  step: step
}}];
