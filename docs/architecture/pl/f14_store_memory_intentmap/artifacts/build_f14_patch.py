#!/usr/bin/env python3
"""
build_f14_patch.py — F14 PL patch builder.

Reads:  WF-PL-01.pre.json
Writes: WF-PL-01.next.json (same shape; PL_Build_Planner_Input.parameters.jsCode rewritten).

Pure mutation; 1 jsCode rewrite, 0 node delta, 0 connection delta.
"""

import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
PRE  = os.path.join(HERE, "WF-PL-01.pre.json")
NEXT = os.path.join(HERE, "WF-PL-01.next.json")

# ───────────────────────────────────────────────────────────────────
# New PL_Build_Planner_Input jsCode (v2.1 — F14 store_memory routing)
# ───────────────────────────────────────────────────────────────────

NEW_JS = r"""
// PL_Build_Planner_Input — v2.1 (F14-PL-MEMORY-INTENTMAP-STORE-MEMORY-FIX)
// Changes vs v2.0:
//   - intentMap.store_memory = 'store_memory'  (F14: was missing, callers using
//     messages.intent='store_memory' fell through unmapped; fixed).
//   - actionToModule.store_memory = 'memory_module'  (F14: same gap, same fix).
//   - extractInputsForAction(store_memory, goal): strips Romanian/English
//     memory-write verb prefixes ("ține minte că…", "remember that…",
//     "noteaz[ăa] că…") and emits `content`. Safe defaults emitted at the
//     request-actions level below: memory_type='fact', category='general',
//     source_thread_id from verify.thread_id, source_message_id from
//     verify.trigger_message_id. Caller-provided plannerContext.inputs
//     override defaults via the existing Object.assign chain.
// v2.0 task_module / reminder routing entries are byte-identical and untouched.
// Memory V2 internals are NOT modified; this patch only adds an existing
// canonical capability (memory_module.store_memory) to PL's intent map.
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
  search_memory: 'search_memory', save_suggestion: 'capture_feedback'
};
const actionToModule = {
  create_task: 'task_module', list_tasks: 'task_module', update_task: 'task_module',
  complete_task: 'task_module', delete_task: 'task_module',
  // create_reminder routes through task_module per ADR.
  create_reminder: 'task_module',
  list_reminders: 'reminder_module', update_reminder: 'reminder_module', cancel_reminder: 'reminder_module',
  // F14: memory_module owns store_memory (already owns search_memory).
  store_memory: 'memory_module',
  search_memory: 'memory_module', capture_feedback: 'improvement_module',
  observe: 'watcher_module_basic'
};

function isReminderPhrase(lower) {
  return /\b(amintest?e[\-\s]?mi|nu\s+m[ăa]\s+l[ăa]sa\s+s[ăa]\s+uit|remind\s+me|don'?t\s+let\s+me\s+forget)\b/.test(lower);
}

function extractDueFields(lower) {
  // returns { due_type, due_date, due_at }
  let dayOffset = null; // null = no day specified
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
  // date-only
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  return { due_type: 'date', due_date: dateStr, due_at: null };
}

function stripVerbPrefix(s) {
  let r = String(s).trim();
  // remove trailing punctuation
  r = r.replace(/[.!?]+\s*$/, '');
  // strip trailing "ca făcut/terminat/finalizat/done" — the complete-task tail marker
  r = r.replace(/\s+ca\s+(?:terminat[ea]?|finalizat[ea]?|f[ăa]cut[ea]?|done)\s*$/i, '');
  // strip trailing temporal qualifiers ("pe mâine", "mâine la 10", "la ora 9", etc.)
  // These are due-field signals, not part of the task identity.
  r = r.replace(/\s+(?:pe\s+)?(?:m[aâ]ine|poim[aâ]ine|azi|today|tomorrow)(?:\s+la\s+(?:ora\s+)?\d{1,2}(?:[:\.h]\d{2})?)?\s*$/i, '');
  r = r.replace(/\s+la\s+(?:ora\s+)?\d{1,2}(?:[:\.h]\d{2})?\s*$/i, '');
  // strip leading verb cluster
  r = r.replace(/^\s*(?:creeaz[aă]|creaz[aă]|adaug[ăa]|adauga|seteaz[aă]|seteaza|f[aă]\s+un|f[ăa]\s+|fa\s+|amintest?e[\-\s]?mi(?:\s+s[ăa])?|nu\s+m[ăa]\s+l[ăa]sa\s+s[ăa]\s+uit\s+(?:s[ăa]\s+)?|remind\s+me\s+to\s+|don'?t\s+let\s+me\s+forget\s+to\s+|update[ea]z[aă]\s+|update\s+|completeaz[ăa]\s+|complete\s+|sterge\s+|[sș]terge\s+|delete\s+|cancel\s+|anuleaz[aă]\s+|finalizeaz[aă]\s+|mut[aă]\s+|move\s+|reschedule\s+|marcheaz[aă]\s+)/i, '');
  // strip leading "ca făcut/terminat/done" (when verb sits BEFORE the marker)
  r = r.replace(/^\s*(?:ca\s+)?(?:terminat[ea]?|finalizat[ea]?|f[ăa]cut[ea]?|done)\s+/i, '');
  // strip leading "task:" / "reminder:" colon prefix
  r = r.replace(/^\s*(?:task|reminder)\s*[:\-–]\s*/i, '');
  // strip leading "taskul/reminderul/task/reminder" + optional connector
  r = r.replace(/^\s*(?:taskul|reminderul|task|reminder)(?:s)?\s+(?:cu|de|despre|pentru|al|on|about|for)?\s*/i, '');
  return r.trim();
}

function stripMemoryWritePrefix(s) {
  // F14: strip Romanian/English "remember that …" / "ține minte că …" / "notează că …"
  // verb prefixes from the goal so the stored memory content is the noun phrase, not the directive.
  let r = String(s).trim();
  r = r.replace(/[.!?]+\s*$/, '');
  r = r.replace(/^\s*(?:[țt]ine\s+minte\s+(?:c[ăa]\s+)?|noteaz[aă]\s+(?:c[ăa]\s+)?|salveaz[aă]\s+(?:c[ăa]\s+)?|memoreaz[aă]\s+(?:c[ăa]\s+)?|[îi]nregistreaz[aă]\s+(?:c[ăa]\s+)?|remember\s+(?:that\s+)?|note\s+(?:that\s+)?|save\s+(?:that\s+)?|memo(?:rize)?\s+(?:that\s+)?)/i, '');
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
  if (action === 'complete_task') {
    return { title_match: stripVerbPrefix(g) || g };
  }
  if (action === 'delete_task') {
    return { title_match: stripVerbPrefix(g) || g };
  }
  if (action === 'list_tasks') {
    let status_filter = 'open';
    if (/\b(toate|all)\b/.test(lower)) status_filter = 'any';
    else if (/\b(terminate?|finalizate?|done|completed?)\b/.test(lower)) status_filter = 'done';
    else if (/\b(anulate?|cancel(?:l?ed)?)\b/.test(lower)) status_filter = 'cancelled';
    return { status_filter: status_filter };
  }
  // F14: memory write input extraction.
  if (action === 'store_memory') {
    const content = stripMemoryWritePrefix(g) || g;
    return {
      content: content,
      memory_type: 'fact',
      category: 'general'
    };
  }
  // Memory + improvement + observation behavior preserved verbatim from v1.3.
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
    return { feedback_content: t };
  }
  if (action === 'observe') {
    return { observation_text: g };
  }
  // Reminder list/update/cancel — kept as legacy reminder_module routing (stub-only,
  // does not write to public.reminders). create_reminder is routed via intentMap above.
  if (action === 'list_reminders' || action === 'update_reminder' || action === 'cancel_reminder') {
    return {};
  }
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

// Re-route any upstream-supplied requested_action with action='create_reminder' onto
// task_module.create_task and refresh inputs. This handles the case where OR emitted
// an explicit requested_actions array carrying the legacy action name.
requestedActions = requestedActions.map(a => {
  if (a && String(a.action || '') === 'create_reminder') {
    const newInputs = Object.assign({}, extractInputsForAction('create_task', goal), a.inputs || {});
    if (!newInputs.metadata || typeof newInputs.metadata !== 'object') newInputs.metadata = {};
    newInputs.metadata = Object.assign({ origin: 'reminder_intent' }, newInputs.metadata);
    return Object.assign({}, a, { action: 'create_task', module_name: 'task_module', inputs: newInputs });
  }
  return a;
});

// F14: late-binding inject source_thread_id / source_message_id / safe-default
// memory_type / category for any store_memory action. ME_Memory_Store_Prep
// requires `content`, `memory_type`, `category`, `source_thread_id`. The
// extractInputsForAction function above does not see verify.thread_id, so this
// defaulting must happen at the request-actions level. Caller-provided values
// in plannerContext.inputs already win because they were Object.assigned LAST in
// the loop above; here we only fill in what's still missing.
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
""".strip("\n")

# ───────────────────────────────────────────────────────────────────
# Apply
# ───────────────────────────────────────────────────────────────────

with open(PRE) as f:
    wf = json.load(f)

found = False
for n in wf["nodes"]:
    if n["name"] == "PL_Build_Planner_Input":
        n["parameters"]["jsCode"] = NEW_JS
        found = True
        break

if not found:
    raise SystemExit("PL_Build_Planner_Input node not found in pre snapshot")

with open(NEXT, "w") as f:
    json.dump(wf, f, indent=2)

print(f"WROTE {NEXT}: nodes={len(wf['nodes'])} (no node delta)")
