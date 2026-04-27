// PL_Build_Planner_Input — v2.3 (MEMORY-SUPERSEDE-PL-INTENTMAP-FOLLOWUP)
// Changes vs v2.2:
//   - intentMap.supersede_memory = 'supersede_memory'
//   - actionToModule.supersede_memory = 'memory_module'
//   - extractInputsForAction('supersede_memory', goalText) emits content + safe defaults
//     (memory_type='fact', category='general'); does NOT invent supersedes_memory_id.
//   - New late-binding pass for action='supersede_memory':
//       * normalize upstream `memory_id` → `supersedes_memory_id` (ME canonical key)
//       * inject source_thread_id / source_message_id from verify envelope
//       * inject safe defaults memory_type='fact' / category='general'
//   - Memory V2 internals stay closed; this is a routing-only patch.
//   - All other intents / paths byte-identical to v2.2.
function safeNode(name) {
  try { const it = $(name).first(); return (it && it.json) ? it.json : {}; } catch (e) { return {}; }
}
const verify   = safeNode('PL_Verify_Context_Match');
const extract  = safeNode('PL_Extract_Planning_Input');
const registry = $json && Array.isArray($json.module_registry) ? $json : safeNode('PL_Load_Module_Registry');

if (verify && verify._verified === 'false') {
  return [{ json: {
    _context_ready: 'false',
    error_code: verify.error_code || 'CONTEXT_MISMATCH',
    error_message: verify.error_message || 'Execution context verification failed.',
    missing_fields: Array.isArray(verify.missing_fields) ? verify.missing_fields : []
  }}];
}

const plannerContext = (extract && extract.planner_context) || {};
const goal = String(plannerContext.goal || plannerContext.user_message_text || '').trim();
const primaryIntent = String(plannerContext.primary_intent || '').trim();
let requestedActions = Array.isArray(plannerContext.requested_actions) ? plannerContext.requested_actions.slice() : [];

const intentMap = {
  create_task: 'create_task', list_tasks: 'list_tasks', update_task: 'update_task',
  complete_task: 'complete_task', delete_task: 'delete_task',
  // ADR-REMINDER-AS-TASK-LAYER: current-stage create_reminder is a task with due fields.
  create_reminder: 'create_task',
  list_reminders: 'list_reminders', update_reminder: 'update_reminder', cancel_reminder: 'cancel_reminder',
  // F14: route memory writes to memory_module.store_memory (Memory V2 chain).
  store_memory: 'store_memory',
  // MEMORY-SUPERSEDE-PL-INTENTMAP-FOLLOWUP: route memory supersede to memory_module.supersede_memory (Memory V2 chain).
  supersede_memory: 'supersede_memory',
  search_memory: 'search_memory', save_suggestion: 'capture_feedback',
  // IMPROVEMENT-MODULE-LIVE-EXECUTION: alias for log_improvement_request → capture_feedback.
  log_improvement_request: 'capture_feedback'
};
const actionToModule = {
  create_task: 'task_module', list_tasks: 'task_module', update_task: 'task_module',
  complete_task: 'task_module', delete_task: 'task_module',
  // create_reminder routes through task_module per ADR.
  create_reminder: 'task_module',
  list_reminders: 'reminder_module', update_reminder: 'reminder_module', cancel_reminder: 'reminder_module',
  // F14: memory_module owns store_memory (already owns search_memory).
  store_memory: 'memory_module',
  // MEMORY-SUPERSEDE-PL-INTENTMAP-FOLLOWUP: memory_module owns supersede_memory.
  supersede_memory: 'memory_module',
  search_memory: 'memory_module', capture_feedback: 'improvement_module',
  observe: 'watcher_module_basic'
};

function isReminderPhrase(lower) {
  return /\b(amintest?e[\-\s]?mi|nu\s+m[ăa]\s+l[ăa]sa\s+s[ăa]\s+uit|remind\s+me|don'?t\s+let\s+me\s+forget)\b/.test(lower);
}

function extractDueFields(lower) {
  let dayOffset = null;
  if (/\bpoim[aâ]ine\b/.test(lower)) dayOffset = 2;
  else if (/\bm[aâ]ine\b|\btomorrow\b/.test(lower)) dayOffset = 1;
  else if (/\bazi\b|\btoday\b/.test(lower)) dayOffset = 0;
  let hh = null, mm = null;
  const hm = lower.match(/\b(?:la\s+ora\s+|la\s+|ora\s+|at\s+)(\d{1,2})(?:[:\.h](\d{2}))?\b/);
  if (hm) {
    hh = Math.min(23, Math.max(0, Number(hm[1])));
    mm = hm[2] ? Math.min(59, Math.max(0, Number(hm[2]))) : 0;
  }
  if (dayOffset == null && hh == null) {
    return { due_type: 'flexible', due_date: null, due_at: null };
  }
  if (dayOffset == null) dayOffset = 0;
  const now = new Date();
  if (hh != null) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hh, mm || 0, 0));
    const pad = (n) => String(n).padStart(2, '0');
    const iso = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00+00:00`;
    return { due_type: 'datetime', due_date: null, due_at: iso };
  }
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  return { due_type: 'date', due_date: dateStr, due_at: null };
}

function stripVerbPrefix(s) {
  let r = String(s).trim();
  r = r.replace(/[.!?]+\s*$/, '');
  r = r.replace(/\s+ca\s+(?:terminat[ea]?|finalizat[ea]?|f[ăa]cut[ea]?|done)\s*$/i, '');
  r = r.replace(/\s+(?:pe\s+)?(?:m[aâ]ine|poim[aâ]ine|azi|today|tomorrow)(?:\s+la\s+(?:ora\s+)?\d{1,2}(?:[:\.h]\d{2})?)?\s*$/i, '');
  r = r.replace(/\s+la\s+(?:ora\s+)?\d{1,2}(?:[:\.h]\d{2})?\s*$/i, '');
  r = r.replace(/^\s*(?:creeaz[aă]|creaz[aă]|adaug[ăa]|adauga|seteaz[aă]|seteaza|f[aă]\s+un|f[ăa]\s+|fa\s+|amintest?e[\-\s]?mi(?:\s+s[ăa])?|nu\s+m[ăa]\s+l[ăa]sa\s+s[ăa]\s+uit\s+(?:s[ăa]\s+)?|remind\s+me\s+to\s+|don'?t\s+let\s+me\s+forget\s+to\s+|update[ea]z[aă]\s+|update\s+|completeaz[ăa]\s+|complete\s+|sterge\s+|[sș]terge\s+|delete\s+|cancel\s+|anuleaz[aă]\s+|finalizeaz[aă]\s+|mut[aă]\s+|move\s+|reschedule\s+|marcheaz[aă]\s+)/i, '');
  r = r.replace(/^\s*(?:ca\s+)?(?:terminat[ea]?|finalizat[ea]?|f[ăa]cut[ea]?|done)\s+/i, '');
  r = r.replace(/^\s*(?:task|reminder)\s*[:\-–]\s*/i, '');
  r = r.replace(/^\s*(?:taskul|reminderul|task|reminder)(?:s)?\s+(?:cu|de|despre|pentru|al|on|about|for)?\s*/i, '');
  return r.trim();
}

function stripMemoryWritePrefix(s) {
  let r = String(s).trim();
  r = r.replace(/[.!?]+\s*$/, '');
  r = r.replace(/^\s*(?:[țt]ine\s+minte\s+(?:c[ăa]\s+)?|noteaz[aă]\s+(?:c[ăa]\s+)?|salveaz[aă]\s+(?:c[ăa]\s+)?|memoreaz[aă]\s+(?:c[ăa]\s+)?|[îi]nregistreaz[aă]\s+(?:c[ăa]\s+)?|remember\s+(?:that\s+)?|note\s+(?:that\s+)?|save\s+(?:that\s+)?|memo(?:rize)?\s+(?:that\s+)?)/i, '');
  return r.trim();
}

// MEMORY-SUPERSEDE-PL-INTENTMAP-FOLLOWUP: strip leading supersede verb and trailing punct
// to derive the new content. RO + EN coverage:
//   schimbă / actualizează / înlocuiește / modifică / corectează / amendează
//   change / update / replace / supersede / amend / correct
function stripSupersedePrefix(s) {
  let r = String(s).trim();
  r = r.replace(/[.!?]+\s*$/, '');
  r = r.replace(/^\s*(?:schimb[aă]\s+(?:c[ăa]\s+)?|actualizeaz[aă]\s+(?:c[ăa]\s+)?|[îi]nlocuie[sș]te\s+(?:c[ăa]\s+)?|modific[aă]\s+(?:c[ăa]\s+)?|corecteaz[aă]\s+(?:c[ăa]\s+)?|amendeaz[aă]\s+(?:c[ăa]\s+)?|change\s+(?:that\s+)?|update\s+(?:that\s+)?|replace\s+(?:that\s+)?|supersede\s+(?:that\s+)?|amend\s+(?:that\s+)?|correct\s+(?:that\s+)?)/i, '');
  return r.trim();
}

function extractInputsForAction(action, goalText) {
  if (!goalText) return {};
  const g = String(goalText).trim();
  const lower = g.toLowerCase();

  if (action === 'create_task') {
    const description = stripVerbPrefix(g) || g;
    const due = extractDueFields(lower);
    const out = { description: description };
    if (due.due_type) out.due_type = due.due_type;
    if (due.due_date) out.due_date = due.due_date;
    if (due.due_at)   out.due_at   = due.due_at;
    if (isReminderPhrase(lower)) out.metadata = { origin: 'reminder_intent' };
    return out;
  }
  if (action === 'update_task') {
    const out = { title_match: stripVerbPrefix(g) || g };
    const due = extractDueFields(lower);
    if (due.due_type) out.due_type = due.due_type;
    if (due.due_date) out.due_date = due.due_date;
    if (due.due_at)   out.due_at   = due.due_at;
    return out;
  }
  if (action === 'complete_task') return { title_match: stripVerbPrefix(g) || g };
  if (action === 'delete_task')   return { title_match: stripVerbPrefix(g) || g };
  if (action === 'list_tasks') {
    let status_filter = 'open';
    if (/\b(toate|all)\b/.test(lower)) status_filter = 'any';
    else if (/\b(terminate?|finalizate?|done|completed?)\b/.test(lower)) status_filter = 'done';
    else if (/\b(anulate?|cancel(?:l?ed)?)\b/.test(lower)) status_filter = 'cancelled';
    return { status_filter: status_filter };
  }
  if (action === 'store_memory') {
    const content = stripMemoryWritePrefix(g) || g;
    return { content: content, memory_type: 'fact', category: 'general' };
  }
  if (action === 'supersede_memory') {
    // MEMORY-SUPERSEDE-PL-INTENTMAP-FOLLOWUP: derive content (the NEW fact) from goal.
    // supersedes_memory_id MUST come from upstream (plannerContext.inputs.memory_id /
    // requested_actions[i].inputs.{memory_id, supersedes_memory_id}); PL does not
    // invent it from text. ME Prep returns MISSING_REQUIRED_FIELDS if unresolved.
    const content = stripSupersedePrefix(g) || g;
    return { content: content, memory_type: 'fact', category: 'general' };
  }
  if (action === 'search_memory') {
    let q = g;
    q = q.replace(/^\s*(?:cau?t[aăâ]|cautare|cauta)\s+(?:[îi]n\s+)?memorie?\s*/i, '');
    q = q.replace(/^\s*(?:pentru|despre)\s+/i, '');
    q = q.replace(/^\s*tot\s+ce\s+(?:stii|[ăa]i|stiu)\s+despre\s+/i, '');
    q = q.trim() || g;
    return { query: q };
  }
  if (action === 'capture_feedback') {
    let t = g;
    t = t.replace(/^\s*(?:sugestie|propunere|feedback)\s*[:\-–]\s*/i, '');
    t = t.replace(/^\s*(?:am\s+o\s+sugestie|am\s+o\s+propunere)\s*[:\-–]?\s*/i, '');
    t = t.trim() || g;
    // IMPROVEMENT-MODULE-LIVE-EXECUTION: emit user_message (raw goal) alongside
    // the cleaned feedback_content so ME_Improvement_Capture_Prep can store the
    // raw user input in improvement_requests.user_message.
    return { feedback_content: t, user_message: g };
  }
  if (action === 'observe') return { observation_text: g };
  if (action === 'list_reminders' || action === 'update_reminder' || action === 'cancel_reminder') return {};
  return {};
}

if (!requestedActions.length && primaryIntent && intentMap[primaryIntent]) {
  const action = intentMap[primaryIntent];
  const extractedInputs = extractInputsForAction(action, goal);
  requestedActions = [{
    action,
    module_name: actionToModule[action],
    purpose: `Handle intent ${primaryIntent}`,
    inputs: Object.assign({}, extractedInputs, plannerContext.inputs || {})
  }];
}

requestedActions = requestedActions.map(a => {
  if (a && String(a.action || '') === 'create_reminder') {
    const newInputs = Object.assign({}, extractInputsForAction('create_task', goal), a.inputs || {});
    if (!newInputs.metadata || typeof newInputs.metadata !== 'object') newInputs.metadata = {};
    newInputs.metadata = Object.assign({ origin: 'reminder_intent' }, newInputs.metadata);
    return Object.assign({}, a, { action: 'create_task', module_name: 'task_module', inputs: newInputs });
  }
  return a;
});

// IMPROVEMENT-MODULE-LIVE-EXECUTION: rewrite log_improvement_request action to
// capture_feedback at the request-actions layer when upstream emits the alias.
requestedActions = requestedActions.map(a => {
  if (a && String(a.action || '') === 'log_improvement_request') {
    const newInputs = Object.assign({}, extractInputsForAction('capture_feedback', goal), a.inputs || {});
    return Object.assign({}, a, { action: 'capture_feedback', module_name: 'improvement_module', inputs: newInputs });
  }
  return a;
});

// F14: late-binding inject source_thread_id / source_message_id / safe-default
// memory_type / category for any store_memory action.
requestedActions = requestedActions.map(a => {
  if (a && String(a.action || '') === 'store_memory') {
    const newInputs = Object.assign({}, a.inputs || {});
    if (!newInputs.source_thread_id)  newInputs.source_thread_id  = String(verify.thread_id || '');
    if (!newInputs.source_message_id) newInputs.source_message_id = String(verify.trigger_message_id || '');
    if (!newInputs.memory_type)       newInputs.memory_type       = 'fact';
    if (!newInputs.category)          newInputs.category          = 'general';
    return Object.assign({}, a, { module_name: 'memory_module', inputs: newInputs });
  }
  return a;
});

// MEMORY-SUPERSEDE-PL-INTENTMAP-FOLLOWUP: late-binding for supersede_memory.
// - Normalize upstream alias `memory_id` → `supersedes_memory_id` (canonical key).
// - Inject source_thread_id / source_message_id from verify envelope.
// - Inject safe defaults memory_type='fact' / category='general'.
// - Set module_name='memory_module'.
requestedActions = requestedActions.map(a => {
  if (a && String(a.action || '') === 'supersede_memory') {
    const newInputs = Object.assign({}, a.inputs || {});
    if (!newInputs.supersedes_memory_id && newInputs.memory_id) {
      newInputs.supersedes_memory_id = newInputs.memory_id;
    }
    if (!newInputs.source_thread_id)  newInputs.source_thread_id  = String(verify.thread_id || '');
    if (!newInputs.source_message_id) newInputs.source_message_id = String(verify.trigger_message_id || '');
    if (!newInputs.memory_type)       newInputs.memory_type       = 'fact';
    if (!newInputs.category)          newInputs.category          = 'general';
    return Object.assign({}, a, { module_name: 'memory_module', inputs: newInputs });
  }
  return a;
});

if (!goal) {
  return [{ json: {
    _context_ready: 'false',
    error_code: 'INSUFFICIENT_PLANNING_CONTEXT',
    error_message: 'Planning goal is missing.',
    missing_fields: ['planner_context.goal or planner_context.user_message_text']
  }}];
}
if (!requestedActions.length) {
  return [{ json: {
    _context_ready: 'false',
    error_code: 'INSUFFICIENT_PLANNING_CONTEXT',
    error_message: 'No requested actions or mappable primary intent are available.',
    missing_fields: ['planner_context.requested_actions or planner_context.primary_intent']
  }}];
}

return [{ json: {
  _context_ready: 'true',
  execution_id: String(verify.execution_id || ''),
  tenant_id: String(verify.tenant_id || ''),
  thread_id: String(verify.thread_id || ''),
  trigger_message_id: String(verify.trigger_message_id || ''),
  idempotency_key: String(verify.idempotency_key || ''),
  goal,
  primary_intent: primaryIntent || 'multi_action_request',
  requested_actions: requestedActions,
  module_registry: (registry && registry.module_registry) || [],
  warnings: Array.isArray(verify.warnings) ? verify.warnings : []
}}];
