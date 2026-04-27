#!/usr/bin/env python3
"""
build_improvement_patch.py — IMPROVEMENT-MODULE-LIVE-EXECUTION-USER-READY patch builder.

Reads:
  WF-ME-01.pre.json
  WF-PL-01.pre.json
Writes:
  WF-ME-01.next.json   — adds Prep + DB nodes for capture_feedback; rewrites the
                         existing ME_Improvement_Capture_Result jsCode in place.
  WF-PL-01.next.json   — single jsCode rewrite on PL_Build_Planner_Input v2.1 → v2.2:
                         adds intentMap.log_improvement_request alias + emits raw
                         user_message alongside feedback_content for capture_feedback.

ME surface: +2 nodes, +2 net connection edges, 0 schema mutation.
PL surface: 1 jsCode rewrite, 0 node delta, 0 connection delta.
"""

import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ME_PRE  = os.path.join(HERE, "WF-ME-01.pre.json")
ME_NEXT = os.path.join(HERE, "WF-ME-01.next.json")
PL_PRE  = os.path.join(HERE, "WF-PL-01.pre.json")
PL_NEXT = os.path.join(HERE, "WF-PL-01.next.json")

POSTGRES_CRED = {"id": "z9nKgToNWvIW7P8f", "name": "Postgres account 2"}

# ────────────────────────────────────────────────────────────────────
# ME — Capture Prep jsCode
# ────────────────────────────────────────────────────────────────────

PREP_JS = r"""
// ME_Improvement_Capture_Prep — v1.0
// Validates inputs, normalizes feedback content, applies a light category
// heuristic for telemetry, and emits the __db payload consumed by
// ME_Improvement_Capture_DB. ME_Improvement_Capture_Result reads __ctx and
// the DB row to compose the canonical envelope.
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};

// Accept either feedback_content (canonical PL output for save_suggestion)
// or raw feedback aliases.
let content = '';
if (inputs.feedback_content != null && String(inputs.feedback_content).trim()) {
  content = String(inputs.feedback_content);
} else if (inputs.feedback != null && String(inputs.feedback).trim()) {
  content = String(inputs.feedback);
} else if (inputs.content != null && String(inputs.content).trim()) {
  content = String(inputs.content);
}
content = String(content).trim();

const MIN_LEN = 4;
if (!content || content.length < MIN_LEN) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_FEEDBACK',
    error_message: 'Feedback content is empty or too short to capture meaningfully.',
    missing_fields: !content ? ['feedback_content'] : [] }}];
}

// Strip leading verb prefix in case PL did not (defensive).
content = content.replace(/^\s*(?:sugestie|propunere|feedback)\s*[:\-–]\s*/i, '');
content = content.replace(/^\s*(?:am\s+o\s+sugestie|am\s+o\s+propunere)\s*[:\-–]?\s*/i, '');
content = content.trim();
if (!content || content.length < MIN_LEN) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_FEEDBACK',
    error_message: 'Feedback content is empty after normalization.',
    missing_fields: ['feedback_content'] }}];
}

// Light category heuristic for downstream telemetry. Stored in __ctx; not
// persisted to the DB (no metadata column on improvement_requests).
const lower = content.toLowerCase();
let category = 'other';
if (/\b(bug|eroare|error|crash|broken|crap[aă]|nu\s+funct|defect|nu\s+merge|stric)\b/.test(lower)) category = 'bug';
else if (/\b(feature|functie|funcționalitate|adaug[aă]|imbun[aă]t|implement|please\s+add|add\s+(?:a\s+)?(?:new|the))\b/.test(lower)) category = 'feature';
else if (/\b(ux|user\s+experience|ui|interfa[țt]|usability|usable|design|prea\s+greu|prea\s+complicat|confuz)\b/.test(lower)) category = 'ux';
else if (/\b(automatiz|automate|integrat|integrate|connect(?:are)?|sync|webhook)\b/.test(lower)) category = 'automation';

// requested_feature is the structured ask (NOT NULL); user_message is the raw input.
// PL v2.2 emits both feedback_content (cleaned) and user_message (raw goal). If
// PL didn't emit user_message, fall back to the cleaned content.
const requested_feature = content;
const user_message = (inputs.user_message != null && String(inputs.user_message).trim())
  ? String(inputs.user_message).trim()
  : content;

return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    requested_feature: requested_feature,
    user_message: user_message
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id,
    category: category
  }
}}];
""".strip("\n")

# ────────────────────────────────────────────────────────────────────
# ME — Capture DB SQL
# ────────────────────────────────────────────────────────────────────
#
# Idempotency strategy: the schema lacks an idempotency_key column, so we use
# a SELECT-before-INSERT CTE scoped by (tenant_id, user_message). Replay of the
# same envelope produces an identical user_message → returns the existing row
# with inserted=FALSE. Two distinct genuine submissions of identical text from
# the same tenant collapse to a single row — accepted limitation for the
# current stage; documented in the closeout. organization_id is derived via
# JOIN with public.tenants so the chain doesn't have to carry it.

CAPTURE_SQL = """
WITH lookup AS (
  SELECT id, organization_id, tenant_id, requested_feature, user_message, status, created_at
    FROM public.improvement_requests
   WHERE tenant_id = $1::uuid
     AND user_message = $3::text
   ORDER BY created_at DESC
   LIMIT 1
),
ins AS (
  INSERT INTO public.improvement_requests (organization_id, tenant_id, requested_feature, user_message, status)
  SELECT t.organization_id, $1::uuid, $2::text, $3::text, 'pending'::text
    FROM public.tenants t
   WHERE t.id = $1::uuid
     AND NOT EXISTS (SELECT 1 FROM lookup)
  RETURNING id, organization_id, tenant_id, requested_feature, user_message, status, created_at, TRUE AS inserted
)
SELECT id, organization_id, tenant_id, requested_feature, user_message, status, created_at, inserted FROM ins
UNION ALL
SELECT l.id, l.organization_id, l.tenant_id, l.requested_feature, l.user_message, l.status, l.created_at, FALSE AS inserted
  FROM lookup l
 WHERE NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
""".strip()

CAPTURE_QREPL = (
    "={{ $json._error ? [null,null,null] : "
    "[$json.__db.tenant_id, $json.__db.requested_feature, $json.__db.user_message] }}"
)

# ────────────────────────────────────────────────────────────────────
# ME — Capture Result jsCode (replaces the existing stub in place)
# ────────────────────────────────────────────────────────────────────

RESULT_JS = r"""
// ME_Improvement_Capture_Result — v2.0 (DB-backed)
function safeNode(name) { try { const it = $(name).first(); return (it && it.json) ? it.json : null; } catch (e) { return null; } }
const prep = safeNode('ME_Improvement_Capture_Prep') || {};
const ctx  = prep.__ctx || {};
const env  = safeNode('ME_Validate_Dispatcher_Result') || {};
if (prep && prep._error) {
  return [{ json: {
    _error: true,
    error_code: prep.error_code || 'AMBIGUOUS_OR_EMPTY_FEEDBACK',
    error_message: prep.error_message || 'Improvement capture input invalid.',
    missing_fields: prep.missing_fields || []
  }}];
}
const row = $json || {};
if (!row || !row.id) {
  return [{ json: {
    _error: true,
    error_code: 'DB_WRITE_FAILED',
    error_message: 'Improvement capture did not return a row.',
    missing_fields: []
  }}];
}
const inserted = row.inserted === true;
const summary = inserted
  ? 'Am notat sugestia / problema pentru îmbunătățire.'
  : 'Sugestia a fost deja notată anterior (replay idempotent).';
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: ctx.execution_context_id || env.execution_context_id,
  thread_id: ctx.thread_id || env.thread_id,
  tenant_id: ctx.tenant_id || env.tenant_id,
  module_result: {
    module_name: 'improvement_module',
    step_id: ctx.step_id || (env.step && env.step.step_id),
    result_type: 'execution',
    status: 'success',
    summary: summary,
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'capture_feedback',
      details: {
        improvement_id: row.id,
        category: ctx.category || 'other',
        status: row.status,
        inserted: inserted
      }
    }],
    artifacts: [{ type: 'improvement_id', value: row.id }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: inserted === true,
  response_generation_allowed: false
}}];
""".strip("\n")

# ────────────────────────────────────────────────────────────────────
# ME patch builder
# ────────────────────────────────────────────────────────────────────

PREP_NODE_ID = "imp-capture-prep"
DB_NODE_ID   = "imp-capture-db"

PREP_X, PREP_Y = 2768, 1240   # where the existing Result currently sits
DB_X,   DB_Y   = 2960, 1240
RESULT_X, RESULT_Y = 3160, 1240   # move existing Result east of DB


def build_me():
    with open(ME_PRE) as f:
        wf = json.load(f)

    # 1. Add 2 new nodes (Prep + DB)
    wf["nodes"].append({
        "id": PREP_NODE_ID,
        "name": "ME_Improvement_Capture_Prep",
        "type": "n8n-nodes-base.code",
        "position": [PREP_X, PREP_Y],
        "parameters": {"jsCode": PREP_JS},
        "typeVersion": 2,
    })
    wf["nodes"].append({
        "id": DB_NODE_ID,
        "name": "ME_Improvement_Capture_DB",
        "type": "n8n-nodes-base.postgres",
        "position": [DB_X, DB_Y],
        "parameters": {
            "query": CAPTURE_SQL,
            "options": {"queryReplacement": CAPTURE_QREPL},
            "operation": "executeQuery",
        },
        "credentials": {"postgres": POSTGRES_CRED},
        "typeVersion": 2.4,
        "continueOnFail": True,
        "alwaysOutputData": True,
    })

    # 2. Rewrite ME_Improvement_Capture_Result jsCode in place + reposition east.
    for n in wf["nodes"]:
        if n["name"] == "ME_Improvement_Capture_Result":
            n["parameters"]["jsCode"] = RESULT_JS
            n["position"] = [RESULT_X, RESULT_Y]

    # 3. Rewire connections.
    conns = wf["connections"]

    # ME_Route_Module_Name[3] currently → ME_Improvement_Capture_Result.
    # Rewire to → ME_Improvement_Capture_Prep.
    rm = conns["ME_Route_Module_Name"]["main"]
    # outputs[3] is the improvement_module branch (per discovery dump).
    rm[3] = [{"node": "ME_Improvement_Capture_Prep", "type": "main", "index": 0}]

    # Add Prep → DB → Result edges.
    conns["ME_Improvement_Capture_Prep"] = {
        "main": [[{"node": "ME_Improvement_Capture_DB", "type": "main", "index": 0}]]
    }
    conns["ME_Improvement_Capture_DB"] = {
        "main": [[{"node": "ME_Improvement_Capture_Result", "type": "main", "index": 0}]]
    }
    # ME_Improvement_Capture_Result → ME_Return_Result already exists in the
    # original JSON; do not touch.

    with open(ME_NEXT, "w") as f:
        json.dump(wf, f, indent=2)
    edges = sum(len(outs) for src, c in wf["connections"].items() for outs in c.get("main", []))
    print(f"WROTE {ME_NEXT}: nodes={len(wf['nodes'])} edges={edges}")


# ────────────────────────────────────────────────────────────────────
# PL — PL_Build_Planner_Input v2.2 (adds log_improvement_request alias +
# user_message passthrough for capture_feedback)
# ────────────────────────────────────────────────────────────────────

NEW_PL_JS = r"""
// PL_Build_Planner_Input — v2.2 (IMPROVEMENT-MODULE-LIVE-EXECUTION-USER-READY)
// Changes vs v2.1:
//   - intentMap.log_improvement_request = 'capture_feedback'  (acceptance #2:
//     alias for capture_feedback so upstream classifiers that emit
//     log_improvement_request still route to improvement_module).
//   - extractInputsForAction(capture_feedback, …) now also emits user_message
//     (= the raw goal text) alongside feedback_content. ME_Improvement_Capture_Prep
//     uses user_message for the DB user_message column; if PL omits it, ME falls
//     back to feedback_content.
// Memory + task + reminder routing entries are byte-identical to v2.1.
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


def build_pl():
    with open(PL_PRE) as f:
        wf = json.load(f)
    found = False
    for n in wf["nodes"]:
        if n["name"] == "PL_Build_Planner_Input":
            n["parameters"]["jsCode"] = NEW_PL_JS
            found = True
    if not found:
        raise SystemExit("PL_Build_Planner_Input not found")
    with open(PL_NEXT, "w") as f:
        json.dump(wf, f, indent=2)
    edges = sum(len(outs) for src, c in wf["connections"].items() for outs in c.get("main", []))
    print(f"WROTE {PL_NEXT}: nodes={len(wf['nodes'])} edges={edges}")


if __name__ == "__main__":
    build_me()
    build_pl()
