// build_me_patch.mjs — produce the patched WF-ME-01 JSON for IMPROVEMENT_MODULE_LIST_FOLLOWUP.
// Reads the current workflow snapshot and emits a new file ready for n8n-patch replace.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRE = resolve(__dirname, 'WF-ME-01_pre.json');
const POST = resolve(__dirname, 'WF-ME-01_post.json');
const wf = JSON.parse(readFileSync(PRE, 'utf8'));

// ── Sanity ────────────────────────────────────────────────────────
if (wf.name !== 'WF-ME-01 Module Execution') throw new Error('unexpected workflow name: ' + wf.name);
const initialNodeCount = wf.nodes.length;
const captureNode = wf.nodes.find(n => n.name === 'ME_Improvement_Capture_Prep');
if (!captureNode) throw new Error('ME_Improvement_Capture_Prep not found');
const routeModuleNode = wf.nodes.find(n => n.name === 'ME_Route_Module_Name');
if (!routeModuleNode) throw new Error('ME_Route_Module_Name not found');

// ── New node code (inline) ────────────────────────────────────────
const LIST_PREP_CODE = `// ME_Improvement_List_Prep — v1.0 (IMPROVEMENT_MODULE_LIST_FOLLOWUP 2026-04-27)
// Validates inputs, normalizes filters, emits __db payload.
// Read-only; tenant-scoped at DB. No writes.
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = (env && env.step) || {};
const inputs = step.inputs || {};

const limit = Math.min(Math.max(parseInt(inputs.limit, 10) || 25, 1), 200);
const status_filter = (inputs.status_filter != null && String(inputs.status_filter).trim() !== '') ? String(inputs.status_filter) : null;
const include_closed = !!inputs.include_closed;
const sinceRaw = (inputs.since != null && String(inputs.since).trim() !== '') ? String(inputs.since) : null;
let since = null;
if (sinceRaw) {
  const d = new Date(sinceRaw);
  if (!isNaN(d.getTime())) since = d.toISOString();
}

return [{ json: {
  __db: {
    tenant_id: env.tenant_id,
    status_filter,
    include_closed,
    since,
    limit
  },
  __ctx: {
    execution_context_id: env.execution_context_id,
    thread_id: env.thread_id,
    tenant_id: env.tenant_id,
    step_id: step.step_id,
    filters_applied: { status_filter, include_closed, since, limit }
  }
}}];
`;

const LIST_DB_QUERY = `SELECT id, organization_id, tenant_id, requested_feature, user_message, status, created_at
FROM public.improvement_requests
WHERE tenant_id = $1::uuid
  AND ($2::text IS NULL OR status = $2::text)
  AND ($3::boolean OR status <> 'closed')
  AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
ORDER BY created_at DESC
LIMIT $5::int;`;

const LIST_DB_QR = `={{ $json.__db ? [$json.__db.tenant_id, $json.__db.status_filter, $json.__db.include_closed, $json.__db.since, $json.__db.limit] : [null, null, false, null, 25] }}`;

const LIST_RESULT_CODE = `// ME_Improvement_List_Result — v1.0 (IMPROVEMENT_MODULE_LIST_FOLLOWUP 2026-04-27)
function safeNode(name) { try { const it = $(name).first(); return (it && it.json) ? it.json : null; } catch (e) { return null; } }
const prep = safeNode('ME_Improvement_List_Prep') || {};
const ctx  = prep.__ctx || {};
const env  = safeNode('ME_Validate_Dispatcher_Result') || {};
const rawRows = $items().map(i => i.json);
const rows = rawRows.filter(r => r && typeof r === 'object' && typeof r.id === 'string');

const items = rows.map(r => ({
  improvement_id: r.id,
  requested_feature: r.requested_feature,
  user_message: r.user_message,
  status: r.status,
  created_at: r.created_at
}));
const row_count = items.length;
const row_word = row_count === 1 ? 'sugestie' : 'sugestii';
const summary = row_count === 0
  ? 'Nu există sugestii înregistrate pentru filtrele cerute.'
  : ('Am găsit ' + row_count + ' ' + row_word + ' înregistrat' + (row_count === 1 ? 'ă' : 'e') + '.');

return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: ctx.execution_context_id || env.execution_context_id,
  thread_id: ctx.thread_id || env.thread_id,
  tenant_id: ctx.tenant_id || env.tenant_id,
  module_result: {
    module_name: 'improvement_module',
    step_id: ctx.step_id || (env.step && env.step.step_id),
    result_type: 'analysis',
    status: 'success',
    summary: summary,
    observations: [],
    proposals: [],
    actions_executed: [{ action: 'list_improvements', details: { items, filters_applied: ctx.filters_applied || {} } }],
    artifacts: [],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
`;

// ── Crypto-stable IDs ─────────────────────────────────────────────
const NEW_IDS = {
  ME_Route_Improvement_Action:  'a3b4c5d6-7890-4abc-9def-improv-route',
  ME_Improvement_List_Prep:     'b4c5d6e7-8901-4abc-9def-improv-prep',
  ME_Improvement_List_DB:       'c5d6e7f8-9012-4abc-9def-improv-listdb',
  ME_Improvement_List_Result:   'd6e7f8a9-0123-4abc-9def-improv-listrs',
};

// Capture credentials from existing improvement DB node.
const captureDbNode = wf.nodes.find(n => n.name === 'ME_Improvement_Capture_DB');
if (!captureDbNode) throw new Error('ME_Improvement_Capture_DB not found');
const POSTGRES_CREDS = captureDbNode.credentials;
const POSTGRES_TYPE = captureDbNode.type;
const POSTGRES_TYPEV = captureDbNode.typeVersion;
const CODE_TYPE = captureNode.type;
const CODE_TYPEV = captureNode.typeVersion;

// ── New nodes ─────────────────────────────────────────────────────
const newNodes = [
  {
    id: NEW_IDS.ME_Route_Improvement_Action,
    name: 'ME_Route_Improvement_Action',
    type: 'n8n-nodes-base.switch',
    typeVersion: 3,
    position: [2520, 1100],
    parameters: {
      rules: {
        values: [
          { outputKey: 'capture_feedback', renameOutput: true,
            conditions: { options: { version: 2, leftValue: '', caseSensitive: true, typeValidation: 'strict' }, combinator: 'and',
              conditions: [{ operator: { type: 'string', operation: 'equals' },
                              leftValue: "={{ $('ME_Validate_Dispatcher_Result').first().json.step.inputs.action }}",
                              rightValue: 'capture_feedback' }] } },
          { outputKey: 'list_improvements', renameOutput: true,
            conditions: { options: { version: 2, leftValue: '', caseSensitive: true, typeValidation: 'strict' }, combinator: 'and',
              conditions: [{ operator: { type: 'string', operation: 'equals' },
                              leftValue: "={{ $('ME_Validate_Dispatcher_Result').first().json.step.inputs.action }}",
                              rightValue: 'list_improvements' }] } },
          { outputKey: 'log_improvement_request', renameOutput: true,
            conditions: { options: { version: 2, leftValue: '', caseSensitive: true, typeValidation: 'strict' }, combinator: 'and',
              conditions: [{ operator: { type: 'string', operation: 'equals' },
                              leftValue: "={{ $('ME_Validate_Dispatcher_Result').first().json.step.inputs.action }}",
                              rightValue: 'log_improvement_request' }] } },
        ]
      },
      options: { fallbackOutput: 'extra' }
    }
  },
  {
    id: NEW_IDS.ME_Improvement_List_Prep,
    name: 'ME_Improvement_List_Prep',
    type: CODE_TYPE,
    typeVersion: CODE_TYPEV,
    position: [2768, 1400],
    parameters: { jsCode: LIST_PREP_CODE }
  },
  {
    id: NEW_IDS.ME_Improvement_List_DB,
    name: 'ME_Improvement_List_DB',
    type: POSTGRES_TYPE,
    typeVersion: POSTGRES_TYPEV,
    position: [2960, 1400],
    parameters: { query: LIST_DB_QUERY, options: { queryReplacement: LIST_DB_QR }, operation: 'executeQuery' },
    credentials: POSTGRES_CREDS
  },
  {
    id: NEW_IDS.ME_Improvement_List_Result,
    name: 'ME_Improvement_List_Result',
    type: CODE_TYPE,
    typeVersion: CODE_TYPEV,
    position: [3160, 1400],
    parameters: { jsCode: LIST_RESULT_CODE }
  },
];

wf.nodes.push(...newNodes);

// ── Connection rewiring ───────────────────────────────────────────
// 1) Replace ME_Route_Module_Name's improvement_module output (3rd in the list, index 3)
//    from ME_Improvement_Capture_Prep → ME_Route_Improvement_Action.
const rmnConns = wf.connections['ME_Route_Module_Name'];
if (!rmnConns || !rmnConns.main || rmnConns.main.length < 4) throw new Error('unexpected ME_Route_Module_Name connections shape');
// Index 3 is the improvement_module branch (per pre-snapshot inspection).
const improvIdx = 3;
const oldImprov = rmnConns.main[improvIdx];
if (!Array.isArray(oldImprov) || oldImprov.length !== 1 || oldImprov[0].node !== 'ME_Improvement_Capture_Prep') {
  throw new Error('ME_Route_Module_Name[3] expected to be ME_Improvement_Capture_Prep but got: ' + JSON.stringify(oldImprov));
}
rmnConns.main[improvIdx] = [{ node: 'ME_Route_Improvement_Action', type: 'main', index: 0 }];

// 2) ME_Route_Improvement_Action outputs:
//    [0] capture_feedback → ME_Improvement_Capture_Prep
//    [1] list_improvements → ME_Improvement_List_Prep
//    [2] log_improvement_request → ME_Improvement_Capture_Prep (compat alias — PL.v2.2 already
//                                  rewrites log_improvement_request → capture_feedback at the
//                                  request-actions layer, but we add this branch defensively.)
//    [3] extra (fallback) → ME_Return_Error
wf.connections['ME_Route_Improvement_Action'] = {
  main: [
    [{ node: 'ME_Improvement_Capture_Prep', type: 'main', index: 0 }],
    [{ node: 'ME_Improvement_List_Prep', type: 'main', index: 0 }],
    [{ node: 'ME_Improvement_Capture_Prep', type: 'main', index: 0 }],
    [{ node: 'ME_Return_Error', type: 'main', index: 0 }],
  ]
};

// 3) List chain wiring
wf.connections['ME_Improvement_List_Prep'] = {
  main: [[{ node: 'ME_Improvement_List_DB', type: 'main', index: 0 }]]
};
wf.connections['ME_Improvement_List_DB'] = {
  main: [[{ node: 'ME_Improvement_List_Result', type: 'main', index: 0 }]]
};
wf.connections['ME_Improvement_List_Result'] = {
  main: [[{ node: 'ME_Return_Result', type: 'main', index: 0 }]]
};

// ── Stats ─────────────────────────────────────────────────────────
const finalNodeCount = wf.nodes.length;
const finalConnCount = Object.values(wf.connections).reduce((s, o) => {
  return s + (o.main || []).reduce((s2, arr) => s2 + (Array.isArray(arr) ? arr.length : 0), 0);
}, 0);

writeFileSync(POST, JSON.stringify(wf, null, 2));
console.log(JSON.stringify({
  initialNodeCount, finalNodeCount,
  nodeDelta: finalNodeCount - initialNodeCount,
  finalConnCount,
  newNodes: newNodes.map(n => n.name),
}, null, 2));
