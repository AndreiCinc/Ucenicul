// PL_Build_Planner_Input — v2.6 (IMPROVEMENT_MODULE_LIST_FOLLOWUP 2026-04-27)
// Changes vs v2.5:
//   - intentMap.list_improvements = 'list_improvements'
//   - actionToModule.list_improvements = 'improvement_module'
//   - extractInputsForAction('list_improvements', goalText) extracts safe filters
//     (limit, include_closed, status_filter) from goal text + defaults.
//   - All v2.5 routes byte-identical.
// (Earlier v2.4 → v2.5 changelog preserved below for lineage:)
// Changes v2.4 → v2.5:
//   - intentMap.recall_memory = 'recall_memory'
//   - actionToModule.recall_memory = 'memory_module'
//   - extractInputsForAction('recall_memory', goalText) returns { limit: 25 }.
//     Recall is structural (not query-driven) per ME contract.
//   - Late-binding pass for recall_memory: injects source_thread_id from
//     verify.thread_id when upstream did not supply a structural filter, so
//     ME MISSING_REQUIRED_FIELDS guard is not tripped on bare
//     intent=recall_memory. tenant_id is taken from env.tenant_id by ME.
//   - All other routes byte-identical to v2.4.
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
  // MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: route memory recall to memory_module.recall_memory.
  recall_memory: 'recall_memory',
  // IMPROVEMENT_MODULE_LIST_FOLLOWUP: route list_improvements through improvement_module.
  list_improvements: 'list_improvements',
  // IMPROVEMENT-MODULE-LIVE-EXECUTION: alias for log_improvement_request → capture_feedback.
  log_improvement_request: 'capture_feedback',
  // PL_BRIEFING_INTENT_MAPPING_FOLLOWUP: route briefing → response_module.respond_only.
  briefing: 'respond_only'
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
  // MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: memory_module owns recall_memory.
  recall_memory: 'memory_module',
  // IMPROVEMENT_MODULE_LIST_FOLLOWUP: improvement_module owns list_improvements (read-only lane).
  list_improvements: 'improvement_module',
  observe: 'watcher_module_basic',
  // PL_BRIEFING_INTENT_MAPPING_FOLLOWUP: response_module owns respond_only (no-write composer).
  respond_only: 'response_module'
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
  if (action === 'recall_memory') {
    // Recall is structural; provide a safe default limit. The late-binding
    // pass below injects source_thread_id when no structural filter is set.
    return { limit: 25 };
  }
  if (action === 'list_improvements') {
    // IMPROVEMENT_MODULE_LIST_FOLLOWUP: read-only tenant-scoped list.
    // Parse light filters from goal text; ME does parameterised SQL.
    const out = { limit: 25, include_closed: false };
    if (/\b(closed|inchise|terminate|done)\b/i.test(lower)) out.include_closed = true;
    const sm = lower.match(/\b(?:status[:=]?\s*|stare[:=]?\s*)(pending|in_progress|closed|rejected|accepted)\b/);
    if (sm) out.status_filter = sm[1];
    return out;
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
  if (action === 'respond_only') {
    // PL_BRIEFING_INTENT_MAPPING_FOLLOWUP: pass user_message + response_intent
    // straight through; no_domain_write tags the request as a no-side-effect lane.
    return { user_message: g, response_intent: 'briefing', no_domain_write: true };
  }
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


// MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: late-binding for recall_memory.
// ME ME_Memory_Recall_Prep requires AT LEAST ONE structural filter from
// {entity_id, source_thread_id, category, memory_type}; on bare
// intent=recall_memory we inject source_thread_id from verify.thread_id
// so ME does not error out. Cross-tenant isolation is enforced by ME via
// env.tenant_id (envelope), not via inputs.
requestedActions = requestedActions.map(a => {
  if (a && String(a.action || '') === 'recall_memory') {
    const newInputs = Object.assign({}, a.inputs || {});
    const hasStructural = (newInputs.entity_id || newInputs.source_thread_id ||
                            newInputs.category || newInputs.memory_type);
    if (!hasStructural && verify.thread_id) {
      newInputs.source_thread_id = String(verify.thread_id);
    }
    if (!newInputs.limit) newInputs.limit = 25;
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
