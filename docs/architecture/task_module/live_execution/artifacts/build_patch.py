#!/usr/bin/env python3
"""
build_patch.py — task_module live execution patch builder.

Reads:
  WF-ME-01.pre.json
  WF-PL-01.pre.json
Writes:
  WF-ME-01.next.json   — patched ME with Prep+DB nodes per task action
  WF-PL-01.next.json   — patched PL with rewritten PL_Build_Planner_Input

Pure mutation: no external deps. Run from the artifacts directory.
"""

import json
import os
import sys
from copy import deepcopy

HERE = os.path.dirname(os.path.abspath(__file__))
ME_PRE = os.path.join(HERE, "WF-ME-01.pre.json")
PL_PRE = os.path.join(HERE, "WF-PL-01.pre.json")
ME_NEXT = os.path.join(HERE, "WF-ME-01.next.json")
PL_NEXT = os.path.join(HERE, "WF-PL-01.next.json")

POSTGRES_CRED = {"id": "z9nKgToNWvIW7P8f", "name": "Postgres account 2"}

# ────────────────────────────────────────────────────────────────────
# ME — Prep node jsCode per action
# ────────────────────────────────────────────────────────────────────

PREP_JS = {
    "Create": r"""
// ME_Task_Create_Prep — v1.0
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};
const description = (inputs.description != null ? String(inputs.description) : '').trim();
const title       = (inputs.title       != null ? String(inputs.title)       : '').trim();
if (!description && !title) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS',
    error_message: 'Task create requires title or description.',
    missing_fields: ['title_or_description'] } }];
}
const ALLOWED_PRIORITY = new Set(['low','normal','high','urgent']);
const ALLOWED_DUE_TYPE = new Set(['flexible','date','datetime']);
let priority = (inputs.priority != null ? String(inputs.priority).toLowerCase() : '').trim();
if (!ALLOWED_PRIORITY.has(priority)) priority = 'normal';
function uuidOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return s;
  return null;
}
function dateOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
function tsOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
let due_date = dateOrNull(inputs.due_date);
let due_at   = tsOrNull(inputs.due_at);
let due_type = (inputs.due_type != null ? String(inputs.due_type).toLowerCase() : '').trim();
if (!ALLOWED_DUE_TYPE.has(due_type)) {
  if (due_at) due_type = 'datetime';
  else if (due_date) due_type = 'date';
  else due_type = 'flexible';
}
if (due_type === 'datetime' && !due_at) due_type = due_date ? 'date' : 'flexible';
if (due_type === 'date' && !due_date) due_type = due_at ? 'datetime' : 'flexible';
if (due_type === 'flexible') { /* keep both possibly null */ }
const business_id = uuidOrNull(inputs.business_id);
const entity_id   = uuidOrNull(inputs.entity_id);
const sourceVal   = (inputs.source != null ? String(inputs.source) : '').trim() || null;
let userMeta = {};
if (inputs.metadata && typeof inputs.metadata === 'object' && !Array.isArray(inputs.metadata)) {
  userMeta = inputs.metadata;
}
const idempotency_key = `idem:create_task:${env.execution_context_id}:${step.step_id}`;
return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    business_id: business_id,
    entity_id: entity_id,
    title: title || description.slice(0, 240),
    description: description || null,
    priority: priority,
    due_type: due_type,
    due_date: due_date,
    due_at: due_at,
    source: sourceVal,
    metadata: JSON.stringify(userMeta || {}),
    idempotency_key: idempotency_key
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id
  }
}}];
""".strip("\n"),

    "List": r"""
// ME_Task_List_Prep — v1.0
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};
const ALLOWED_STATUS = new Set(['open','done','cancelled']);
const ALLOWED_PRIORITY = new Set(['low','normal','high','urgent']);
let status = inputs.status_filter != null ? String(inputs.status_filter).toLowerCase() : (inputs.status != null ? String(inputs.status).toLowerCase() : '');
status = status.trim();
let status_filter = null;
if (status === 'any' || status === 'all') status_filter = null;
else if (ALLOWED_STATUS.has(status)) status_filter = status;
else if (!status) status_filter = 'open';
else status_filter = 'open';
let priority = inputs.priority != null ? String(inputs.priority).toLowerCase() : '';
priority = priority.trim();
const priority_filter = ALLOWED_PRIORITY.has(priority) ? priority : null;
function uuidOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return s;
  return null;
}
const entity_id_filter = uuidOrNull(inputs.entity_id);
let limit = Number(inputs.limit);
if (!Number.isFinite(limit) || limit <= 0) limit = 20;
limit = Math.max(1, Math.min(100, Math.floor(limit)));
return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    status_filter: status_filter,
    entity_id_filter: entity_id_filter,
    priority_filter: priority_filter,
    list_limit: limit
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id,
    status_filter: status_filter,
    priority_filter: priority_filter,
    entity_id_filter: entity_id_filter,
    limit: limit
  }
}}];
""".strip("\n"),

    "Update": r"""
// ME_Task_Update_Prep — v1.0
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};
function uuidOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return s;
  return null;
}
function dateOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
function tsOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
const ALLOWED_PRIORITY = new Set(['low','normal','high','urgent']);
const ALLOWED_DUE_TYPE = new Set(['flexible','date','datetime']);
const ALLOWED_STATUS   = new Set(['open','done','cancelled']);
const task_id = uuidOrNull(inputs.task_id);
const title_match = (inputs.title_match != null ? String(inputs.title_match) : '').trim();
if (!task_id && !title_match) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS',
    error_message: 'Task update requires task_id or title_match.',
    missing_fields: ['task_id_or_title_match'] } }];
}
const title       = (inputs.title       != null ? String(inputs.title).trim()       : '');
const description = (inputs.description != null ? String(inputs.description).trim() : '');
let priority = inputs.priority != null ? String(inputs.priority).toLowerCase().trim() : '';
priority = ALLOWED_PRIORITY.has(priority) ? priority : '';
let due_type = inputs.due_type != null ? String(inputs.due_type).toLowerCase().trim() : '';
due_type = ALLOWED_DUE_TYPE.has(due_type) ? due_type : '';
const due_date = dateOrNull(inputs.due_date);
const due_at   = tsOrNull(inputs.due_at);
let status = inputs.status != null ? String(inputs.status).toLowerCase().trim() : '';
status = ALLOWED_STATUS.has(status) ? status : '';
const entity_id = uuidOrNull(inputs.entity_id);
const sourceVal = (inputs.source != null ? String(inputs.source).trim() : '');
const patchKeys = [];
if (title)       patchKeys.push('title');
if (description) patchKeys.push('description');
if (priority)    patchKeys.push('priority');
if (due_type)    patchKeys.push('due_type');
if (due_date)    patchKeys.push('due_date');
if (due_at)      patchKeys.push('due_at');
if (status)      patchKeys.push('status');
if (entity_id)   patchKeys.push('entity_id');
if (sourceVal)   patchKeys.push('source');
if (patchKeys.length === 0) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS',
    error_message: 'Task update requires at least one mutable field.',
    missing_fields: ['patch'] } }];
}
return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    task_id: task_id,
    title_match: title_match || null,
    title: title || null,
    description: description || null,
    priority: priority || null,
    due_type: due_type || null,
    due_date: due_date,
    due_at: due_at,
    status: status || null,
    entity_id: entity_id,
    source: sourceVal || null
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id,
    requested_task_id: task_id,
    requested_title_match: title_match || null,
    patch_keys: patchKeys
  }
}}];
""".strip("\n"),

    "Complete": r"""
// ME_Task_Complete_Prep — v1.0
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};
function uuidOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return s;
  return null;
}
const task_id = uuidOrNull(inputs.task_id);
const title_match = (inputs.title_match != null ? String(inputs.title_match) : '').trim();
if (!task_id && !title_match) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS',
    error_message: 'Task complete requires task_id or title_match.',
    missing_fields: ['task_id_or_title_match'] } }];
}
return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    task_id: task_id,
    title_match: title_match || null
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id,
    requested_task_id: task_id,
    requested_title_match: title_match || null
  }
}}];
""".strip("\n"),

    "Delete": r"""
// ME_Task_Delete_Prep — v1.0  (soft-cancel semantics)
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};
function uuidOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return s;
  return null;
}
const task_id = uuidOrNull(inputs.task_id);
const title_match = (inputs.title_match != null ? String(inputs.title_match) : '').trim();
if (!task_id && !title_match) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS',
    error_message: 'Task delete/cancel requires task_id or title_match.',
    missing_fields: ['task_id_or_title_match'] } }];
}
return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    task_id: task_id,
    title_match: title_match || null
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id,
    requested_task_id: task_id,
    requested_title_match: title_match || null
  }
}}];
""".strip("\n"),
}

# ────────────────────────────────────────────────────────────────────
# ME — DB SQL per action
# ────────────────────────────────────────────────────────────────────

CREATE_SQL = """
WITH lookup AS (
  SELECT id FROM public.tasks
   WHERE tenant_id = $1::uuid
     AND metadata->>'idempotency_key' = $12::text
   LIMIT 1
),
ins AS (
  INSERT INTO public.tasks (
    tenant_id, business_id, entity_id, title, description,
    priority, due_type, due_date, due_at, status, source, metadata
  )
  SELECT $1::uuid, $2::uuid, $3::uuid, $4::text, $5::text,
         $6::task_priority_enum, $7::due_type_enum, $8::date, $9::timestamptz,
         'open'::task_status_enum, $10::text,
         COALESCE($11::jsonb, '{}'::jsonb) || jsonb_build_object('idempotency_key', $12::text)
  WHERE NOT EXISTS (SELECT 1 FROM lookup)
  RETURNING *, TRUE AS inserted
)
SELECT * FROM ins
UNION ALL
SELECT t.*, FALSE AS inserted
  FROM public.tasks t
 WHERE t.id = (SELECT id FROM lookup)
   AND NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
""".strip()

LIST_SQL = """
SELECT id, tenant_id, business_id, entity_id, title, description,
       priority, due_type, due_date, due_at, status, source, metadata,
       created_at, updated_at, completed_at
  FROM public.tasks
 WHERE tenant_id = $1::uuid
   AND ($2::text IS NULL OR status = $2::task_status_enum)
   AND ($3::uuid IS NULL OR entity_id = $3::uuid)
   AND ($4::text IS NULL OR priority = $4::task_priority_enum)
 ORDER BY (due_at IS NULL), due_at ASC, created_at DESC
 LIMIT GREATEST(1, LEAST(100, COALESCE($5::int, 20)));
""".strip()

# Common CTE skeleton for update/complete/delete
def resolve_mutate_sql(set_clause: str, allow_terminal_states: bool) -> str:
    extra_filter = "" if allow_terminal_states else "AND status NOT IN ('done','cancelled')"
    return f"""
WITH candidates AS (
  SELECT id, title FROM public.tasks
   WHERE tenant_id = $1::uuid
     {extra_filter}
     AND (
       ($2::uuid IS NOT NULL AND id = $2::uuid)
       OR ($2::uuid IS NULL AND $3::text IS NOT NULL AND $3::text <> ''
           AND (title ILIKE '%' || $3::text || '%' OR description ILIKE '%' || $3::text || '%'))
     )
   LIMIT 3
),
match_count AS (SELECT count(*)::int AS c FROM candidates),
target AS (SELECT id FROM candidates LIMIT 1),
mutated AS (
  UPDATE public.tasks t
     SET {set_clause},
         updated_at = now()
   WHERE t.tenant_id = $1::uuid
     AND t.id = (SELECT id FROM target)
     AND (SELECT c FROM match_count) = 1
   RETURNING t.*
)
SELECT 'updated'::text AS outcome, m.id AS id, m.tenant_id AS tenant_id, m.business_id AS business_id, m.entity_id AS entity_id,
       m.title AS title, m.description AS description, m.priority AS priority, m.due_type AS due_type,
       m.due_date AS due_date, m.due_at AS due_at, m.status AS status, m.source AS source, m.metadata AS metadata,
       m.created_at AS created_at, m.updated_at AS updated_at, m.completed_at AS completed_at,
       (SELECT json_agg(json_build_object('id', c.id, 'title', c.title)) FROM candidates c) AS candidates
  FROM mutated m
UNION ALL
SELECT CASE WHEN (SELECT c FROM match_count) = 0 THEN 'not_found' ELSE 'ambiguous' END AS outcome,
       NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
       NULL::text, NULL::text, NULL::task_priority_enum, NULL::due_type_enum,
       NULL::date, NULL::timestamptz, NULL::task_status_enum, NULL::text, NULL::jsonb,
       NULL::timestamptz, NULL::timestamptz, NULL::timestamptz,
       (SELECT json_agg(json_build_object('id', c.id, 'title', c.title)) FROM candidates c)
 WHERE NOT EXISTS (SELECT 1 FROM mutated);
""".strip()

UPDATE_SET = (
    "title=COALESCE($4::text, t.title), "
    "description=COALESCE($5::text, t.description), "
    "priority=COALESCE($6::task_priority_enum, t.priority), "
    "due_type=COALESCE($7::due_type_enum, t.due_type), "
    "due_date=COALESCE($8::date, t.due_date), "
    "due_at=COALESCE($9::timestamptz, t.due_at), "
    "status=COALESCE($10::task_status_enum, t.status), "
    "entity_id=COALESCE($11::uuid, t.entity_id), "
    "source=COALESCE($12::text, t.source)"
)
COMPLETE_SET = "status='done'::task_status_enum, completed_at=now()"
DELETE_SET   = "status='cancelled'::task_status_enum"

UPDATE_SQL   = resolve_mutate_sql(UPDATE_SET,   allow_terminal_states=True)
COMPLETE_SQL = resolve_mutate_sql(COMPLETE_SET, allow_terminal_states=False)
DELETE_SQL   = resolve_mutate_sql(DELETE_SET,   allow_terminal_states=False)

QUERY_REPL_CREATE = (
    "={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null] : "
    "[$json.__db.tenant_id, $json.__db.business_id, $json.__db.entity_id, $json.__db.title, "
    "$json.__db.description, $json.__db.priority, $json.__db.due_type, $json.__db.due_date, "
    "$json.__db.due_at, $json.__db.source, $json.__db.metadata, $json.__db.idempotency_key] }}"
)
QUERY_REPL_LIST = (
    "={{ $json._error ? [null,null,null,null,null] : "
    "[$json.__db.tenant_id, $json.__db.status_filter, $json.__db.entity_id_filter, "
    "$json.__db.priority_filter, $json.__db.list_limit] }}"
)
QUERY_REPL_UPDATE = (
    "={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null] : "
    "[$json.__db.tenant_id, $json.__db.task_id, $json.__db.title_match, $json.__db.title, "
    "$json.__db.description, $json.__db.priority, $json.__db.due_type, $json.__db.due_date, "
    "$json.__db.due_at, $json.__db.status, $json.__db.entity_id, $json.__db.source] }}"
)
QUERY_REPL_COMPLETE = (
    "={{ $json._error ? [null,null,null] : "
    "[$json.__db.tenant_id, $json.__db.task_id, $json.__db.title_match] }}"
)
QUERY_REPL_DELETE = QUERY_REPL_COMPLETE

# ────────────────────────────────────────────────────────────────────
# ME — Result jsCode per action (consumes DB output + Prep)
# ────────────────────────────────────────────────────────────────────

RESULT_JS = {
    "Create": r"""
// ME_Task_Create_Result — v2.0 DB-backed
function safeNode(name) { try { const it = $(name).first(); return (it && it.json) ? it.json : null; } catch (e) { return null; } }
const prep = safeNode('ME_Task_Create_Prep') || {};
const ctx  = prep.__ctx || {};
const env  = safeNode('ME_Validate_Dispatcher_Result') || {};
if (prep && prep._error) {
  return [{ json: {
    _error: true,
    error_code: prep.error_code || 'MISSING_REQUIRED_FIELDS',
    error_message: prep.error_message || 'Task create input invalid.',
    missing_fields: prep.missing_fields || []
  }}];
}
const row = $json || {};
if (!row || !row.id) {
  return [{ json: {
    _error: true,
    error_code: 'DB_WRITE_FAILED',
    error_message: 'Task create did not return a row.',
    missing_fields: []
  }}];
}
const inserted = row.inserted === true;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: ctx.execution_context_id || env.execution_context_id,
  thread_id: ctx.thread_id || env.thread_id,
  tenant_id: ctx.tenant_id || env.tenant_id,
  module_result: {
    module_name: 'task_module',
    step_id: ctx.step_id || (env.step && env.step.step_id),
    result_type: 'execution',
    status: 'success',
    summary: inserted ? 'Task created.' : 'Task already exists (idempotent replay).',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'create_task',
      details: {
        task_id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        due_type: row.due_type,
        due_date: row.due_date,
        due_at: row.due_at,
        status: row.status,
        inserted: inserted
      }
    }],
    artifacts: [{ type: 'task_id', value: row.id }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: inserted === true,
  response_generation_allowed: false
}}];
""".strip("\n"),

    "List": r"""
// ME_Task_List_Result — v2.0 DB-backed
function safeNode(name) { try { const it = $(name).first(); return (it && it.json) ? it.json : null; } catch (e) { return null; } }
function safeAll(name)  { try { return $(name).all().map(x => (x && x.json) ? x.json : x).filter(Boolean); } catch (e) { return []; } }
const prep = safeNode('ME_Task_List_Prep') || {};
const ctx  = prep.__ctx || {};
const env  = safeNode('ME_Validate_Dispatcher_Result') || {};
if (prep && prep._error) {
  return [{ json: {
    _error: true,
    error_code: prep.error_code || 'MISSING_REQUIRED_FIELDS',
    error_message: prep.error_message || 'Task list input invalid.',
    missing_fields: prep.missing_fields || []
  }}];
}
const rows = safeAll('ME_Task_List_DB');
const tasks = rows.map(r => ({
  task_id: r.id, title: r.title, description: r.description, priority: r.priority,
  due_type: r.due_type, due_date: r.due_date, due_at: r.due_at, status: r.status,
  entity_id: r.entity_id, created_at: r.created_at, updated_at: r.updated_at,
  completed_at: r.completed_at
}));
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: ctx.execution_context_id || env.execution_context_id,
  thread_id: ctx.thread_id || env.thread_id,
  tenant_id: ctx.tenant_id || env.tenant_id,
  module_result: {
    module_name: 'task_module',
    step_id: ctx.step_id || (env.step && env.step.step_id),
    result_type: 'analysis',
    status: 'success',
    summary: tasks.length === 0
      ? 'No matching tasks.'
      : `Found ${tasks.length} matching task${tasks.length === 1 ? '' : 's'}.`,
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'list_tasks',
      details: {
        filters: {
          status: ctx.status_filter,
          entity_id: ctx.entity_id_filter,
          priority: ctx.priority_filter,
          limit: ctx.limit
        },
        count: tasks.length,
        tasks: tasks
      }
    }],
    artifacts: tasks.map(t => ({ type: 'task_id', value: t.task_id })),
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
""".strip("\n"),
}


def make_mutate_result_js(action: str, past_tense: str) -> str:
    """Generate Result JS for update/complete/delete (CTE outcome-based)."""
    return r"""
// ME_Task___ACTION___Result — v2.0 DB-backed
function safeNode(name) { try { const it = $(name).first(); return (it && it.json) ? it.json : null; } catch (e) { return null; } }
const prep = safeNode('ME_Task___ACTION___Prep') || {};
const ctx  = prep.__ctx || {};
const env  = safeNode('ME_Validate_Dispatcher_Result') || {};
if (prep && prep._error) {
  return [{ json: {
    _error: true,
    error_code: prep.error_code || 'MISSING_REQUIRED_FIELDS',
    error_message: prep.error_message || 'Task __LOWER_ACTION__ input invalid.',
    missing_fields: prep.missing_fields || []
  }}];
}
const row = $json || {};
const outcome = (row && row.outcome) ? String(row.outcome) : null;
if (!outcome) {
  return [{ json: {
    _error: true,
    error_code: 'DB_WRITE_FAILED',
    error_message: 'Task __LOWER_ACTION__ did not return an outcome.',
    missing_fields: []
  }}];
}
if (outcome === 'not_found') {
  return [{ json: {
    _error: true,
    error_code: 'NOT_FOUND',
    error_message: 'No matching task found for the given criteria.',
    missing_fields: [],
    candidates: []
  }}];
}
if (outcome === 'ambiguous') {
  const cands = Array.isArray(row.candidates) ? row.candidates : [];
  return [{ json: {
    _error: true,
    error_code: 'AMBIGUOUS_TASK_REFERENCE',
    error_message: 'Multiple tasks match — please disambiguate.',
    missing_fields: [],
    candidates: cands.map(c => ({ task_id: c.id, title: c.title }))
  }}];
}
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: ctx.execution_context_id || env.execution_context_id,
  thread_id: ctx.thread_id || env.thread_id,
  tenant_id: ctx.tenant_id || env.tenant_id,
  module_result: {
    module_name: 'task_module',
    step_id: ctx.step_id || (env.step && env.step.step_id),
    result_type: 'execution',
    status: 'success',
    summary: '__PAST_TENSE_SUMMARY__',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: '__LOWER_ACTION___task',
      details: {
        task_id: row.id,
        title: row.title,
        priority: row.priority,
        due_type: row.due_type,
        due_date: row.due_date,
        due_at: row.due_at,
        status: row.status,
        completed_at: row.completed_at
      }
    }],
    artifacts: [{ type: 'task_id', value: row.id }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: true,
  response_generation_allowed: false
}}];
""".strip("\n").replace("__ACTION__", action).replace("__LOWER_ACTION__", action.lower()).replace("__PAST_TENSE_SUMMARY__", past_tense)


RESULT_JS["Update"]   = make_mutate_result_js("Update",   "Task updated.")
RESULT_JS["Complete"] = make_mutate_result_js("Complete", "Task completed.")
RESULT_JS["Delete"]   = make_mutate_result_js("Delete",   "Task cancelled.")

# ────────────────────────────────────────────────────────────────────
# ME — node positions
# ────────────────────────────────────────────────────────────────────

ACTION_INDEX = {
    "Create":   0,
    "List":     1,
    "Update":   2,
    "Complete": 3,
    "Delete":   4,
}
ACTION_Y = {
    "Create":   112,
    "List":     192,
    "Update":   272,
    "Complete": 352,
    "Delete":   432,
}
PREP_X = 2768
DB_X   = 2920
RESULT_X = 3120  # moved east of DB

ACTION_SQL = {
    "Create":   CREATE_SQL,
    "List":     LIST_SQL,
    "Update":   UPDATE_SQL,
    "Complete": COMPLETE_SQL,
    "Delete":   DELETE_SQL,
}
ACTION_QREPL = {
    "Create":   QUERY_REPL_CREATE,
    "List":     QUERY_REPL_LIST,
    "Update":   QUERY_REPL_UPDATE,
    "Complete": QUERY_REPL_COMPLETE,
    "Delete":   QUERY_REPL_DELETE,
}

PREP_NODE_IDS = {
    "Create":   "task-create-prep",
    "List":     "task-list-prep",
    "Update":   "task-update-prep",
    "Complete": "task-complete-prep",
    "Delete":   "task-delete-prep",
}
DB_NODE_IDS = {
    "Create":   "task-create-db",
    "List":     "task-list-db",
    "Update":   "task-update-db",
    "Complete": "task-complete-db",
    "Delete":   "task-delete-db",
}

# ────────────────────────────────────────────────────────────────────
# Build ME patched JSON
# ────────────────────────────────────────────────────────────────────

def build_me():
    with open(ME_PRE) as f:
        wf = json.load(f)

    # 1. Add 10 new nodes (Prep + DB per action)
    new_nodes = []
    for action in ["Create", "List", "Update", "Complete", "Delete"]:
        y = ACTION_Y[action]
        # Prep node
        new_nodes.append({
            "id": PREP_NODE_IDS[action],
            "name": f"ME_Task_{action}_Prep",
            "type": "n8n-nodes-base.code",
            "position": [PREP_X, y],
            "parameters": {
                "jsCode": PREP_JS[action]
            },
            "typeVersion": 2,
        })
        # DB node
        new_nodes.append({
            "id": DB_NODE_IDS[action],
            "name": f"ME_Task_{action}_DB",
            "type": "n8n-nodes-base.postgres",
            "position": [DB_X, y],
            "parameters": {
                "query": ACTION_SQL[action],
                "options": {"queryReplacement": ACTION_QREPL[action]},
                "operation": "executeQuery",
            },
            "credentials": {"postgres": POSTGRES_CRED},
            "typeVersion": 2.4,
            "continueOnFail": True,
            "alwaysOutputData": True,
        })
    wf["nodes"].extend(new_nodes)

    # 2. Rewrite Result jsCode and reposition Result east of DB
    for n in wf["nodes"]:
        for action in ["Create", "List", "Update", "Complete", "Delete"]:
            if n["name"] == f"ME_Task_{action}_Result":
                n["parameters"]["jsCode"] = RESULT_JS[action]
                n["position"] = [RESULT_X, ACTION_Y[action]]

    # 3. Rewire connections — switch outputs go to Prep instead of Result; insert
    #    Prep → DB → Result.
    conns = wf["connections"]
    old = conns["ME_Route_Task_Action"]["main"]  # list-of-lists; 6 outputs
    new_main = []
    for action in ["Create", "List", "Update", "Complete", "Delete"]:
        new_main.append([{"node": f"ME_Task_{action}_Prep", "type": "main", "index": 0}])
    # Preserve the 6th fallback (was → ME_Return_Error)
    new_main.append(old[5] if len(old) >= 6 else [{"node": "ME_Return_Error", "type": "main", "index": 0}])
    conns["ME_Route_Task_Action"]["main"] = new_main

    # Add Prep → DB edges
    for action in ["Create", "List", "Update", "Complete", "Delete"]:
        conns[f"ME_Task_{action}_Prep"] = {
            "main": [[{"node": f"ME_Task_{action}_DB", "type": "main", "index": 0}]]
        }
        conns[f"ME_Task_{action}_DB"] = {
            "main": [[{"node": f"ME_Task_{action}_Result", "type": "main", "index": 0}]]
        }
    # Existing ME_Task_*_Result → ME_Return_Result connections are already correct in the
    # original JSON; we keep them as-is (assert in build_check below).

    with open(ME_NEXT, "w") as f:
        json.dump(wf, f, indent=2)
    print(f"WROTE {ME_NEXT}: nodes={len(wf['nodes'])} conns={sum(len(v.get('main', [])) for v in wf['connections'].values())}")


# ────────────────────────────────────────────────────────────────────
# PL patch — rewrite PL_Build_Planner_Input.parameters.jsCode
# ────────────────────────────────────────────────────────────────────

PL_BUILD_PLANNER_INPUT_JS = r"""
// PL_Build_Planner_Input — v2.0 (TASK-MODULE-LIVE-EXECUTION-USER-READY)
// Changes vs v1.3:
//   - intentMap.create_reminder → 'create_task' (per ADR-REMINDER-AS-TASK-LAYER).
//   - actionToModule.create_reminder → 'task_module'.
//   - extractInputsForAction(create_task, ...) handles reminder phrasing AND vanilla
//     task phrasing: produces description + due_type/due_date/due_at + metadata.origin.
//   - update/complete/delete extraction adds title_match heuristic from goal text.
//   - list_tasks extraction adds optional status_filter heuristic.
// Memory routing entries (search_memory, capture_feedback, observe) are unchanged.
// F14 store_memory gap is OUT OF SCOPE for this mission — left as in v1.3.
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
  search_memory: 'search_memory', save_suggestion: 'capture_feedback'
};
const actionToModule = {
  create_task: 'task_module', list_tasks: 'task_module', update_task: 'task_module',
  complete_task: 'task_module', delete_task: 'task_module',
  // create_reminder routes through task_module per ADR.
  create_reminder: 'task_module',
  list_reminders: 'reminder_module', update_reminder: 'reminder_module', cancel_reminder: 'reminder_module',
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
            n["parameters"]["jsCode"] = PL_BUILD_PLANNER_INPUT_JS
            found = True
    if not found:
        raise SystemExit("PL_Build_Planner_Input node not found in PL pre-snapshot")
    with open(PL_NEXT, "w") as f:
        json.dump(wf, f, indent=2)
    print(f"WROTE {PL_NEXT}: nodes={len(wf['nodes'])} conns={sum(len(v.get('main', [])) for v in wf['connections'].values())}")


if __name__ == "__main__":
    build_me()
    build_pl()
.primary_intent']
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
            n["parameters"]["jsCode"] = PL_BUILD_PLANNER_INPUT_JS
            found = True
    if not found:
        raise SystemExit("PL_Build_Planner_Input node not found in PL pre-snapshot")
    with open(PL_NEXT, "w") as f:
        json.dump(wf, f, indent=2)
    print(f"WROTE {PL_NEXT}: nodes={len(wf['nodes'])} conns={sum(len(v.get('main', [])) for v in wf['connections'].values())}")


if __name__ == "__main__":
    build_me()
    build_pl()
