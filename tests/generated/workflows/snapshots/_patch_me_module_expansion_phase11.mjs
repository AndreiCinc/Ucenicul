#!/usr/bin/env node
// Phase-11 ME module expansion (additive, canonical).
//
// Mirrors docs/architecture/ME_Module_Expansion_Plan.md Sections 5-7.
// Adds handlers for reminder_module (4), memory_module (2),
// improvement_module (1), watcher_module_basic (1) — total 8 new handler
// code nodes — plus 2 new per-action switches (ME_Route_Reminder_Action,
// ME_Route_Memory_Action). Extends ME_Route_Module_Name from 1 rule +
// fallback to 5 rules + fallback. Updates ME_Return_Error to report
// UNSUPPORTED_ACTION for any recognized module, UNSUPPORTED_MODULE only
// for genuinely unknown module_name values.
//
// All new handlers follow the plan-describer pattern used by
// ME_Task_Create_Result: they build a module_result envelope but do NOT
// write to domain tables (`domain_writes_performed: false`). DB writes
// stay RA/SU's responsibility.
//
// Script is idempotent: if ME_Route_Reminder_Action already exists, exits
// successfully without rewriting.

import { readFileSync, writeFileSync } from 'node:fs';

function loadEnv() {
  const raw = readFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env', 'utf8');
  const env = {};
  for (const l of raw.split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].trim(); }
  return env;
}
const env = loadEnv();
const N8N_URL = env.N8N_URL.replace(/\/$/, '');
const N8N_API_KEY = env.N8N_API_KEY;
const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress','saveManualExecutions','saveDataErrorExecution',
  'saveDataSuccessExecution','executionTimeout','errorWorkflow','timezone',
  'executionOrder','callerPolicy','callerIds','timeSavedPerExecution','availableInMCP'
]);

async function apiGet(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json' } });
  if (!r.ok) throw new Error(`GET ${id} ${r.status}: ${await r.text()}`);
  return r.json();
}
async function apiDeactivate(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}/deactivate`, { method: 'POST', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: '{}' });
  if (!r.ok) console.error('deactivate', r.status, await r.text());
}
async function apiActivate(id) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}/activate`, { method: 'POST', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: '{}' });
  if (!r.ok) throw new Error(`activate ${r.status}: ${await r.text()}`);
}
async function apiPut(id, body) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, { method: 'PUT', headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PUT ${id} ${r.status}: ${await r.text()}`);
  return r.json();
}

// -------------------------- handler jsCode builders --------------------------
function rule(rightValue, outputKey) {
  return {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{
        leftValue: "={{ $('ME_Validate_Dispatcher_Result').first().json.step.inputs.action }}",
        rightValue,
        operator: { type: 'string', operation: 'equals' }
      }],
      combinator: 'and'
    },
    renameOutput: true,
    outputKey
  };
}
function moduleRule(rightValue, outputKey) {
  return {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{
        leftValue: "={{ $('ME_Validate_Dispatcher_Result').first().json.step.module_name }}",
        rightValue,
        operator: { type: 'string', operation: 'equals' }
      }],
      combinator: 'and'
    },
    renameOutput: true,
    outputKey
  };
}

// --- reminder handlers ---
const CODE_REMINDER_CREATE = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const missing = ['description'].filter(f => !inputs[f]);
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Reminder create inputs are incomplete.', missing_fields: missing } }];
}
const reminderId = \`reminder:\${env.tenant_id}:\${step.step_id}\`;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'reminder_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: 'success',
    summary: 'Reminder create request prepared successfully.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'create_reminder',
      details: {
        reminder_id: reminderId,
        title: inputs.title || inputs.description,
        description: inputs.description,
        due_date: inputs.due_date || null,
        time: inputs.time || null,
        remind_at: inputs.remind_at || null,
        recurrence: inputs.recurrence || null
      }
    }],
    artifacts: [{ type: 'reminder_id', value: reminderId }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
`;

const CODE_REMINDER_LIST = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'reminder_module',
    step_id: step.step_id,
    result_type: 'analysis',
    status: 'success',
    summary: 'Reminder list request prepared successfully.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'list_reminders',
      details: {
        timeframe: inputs.timeframe || 'all',
        status: inputs.status || null,
        limit: inputs.limit || 25,
        list_results: []
      }
    }],
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

const CODE_REMINDER_UPDATE = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const hasIdentifier = !!(inputs.reminder_id || inputs.title_match);
const patch = inputs.patch && typeof inputs.patch === 'object' ? inputs.patch : {};
const hasPatch = Object.keys(patch).some(k => patch[k] !== undefined && patch[k] !== null && patch[k] !== '');
const missing = [];
if (!hasIdentifier) missing.push('reminder_id_or_title_match');
if (!hasPatch) missing.push('patch');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Reminder update inputs are incomplete.', missing_fields: missing } }];
}
const reminderRef = inputs.reminder_id || \`title_match:\${inputs.title_match}\`;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'reminder_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: 'success',
    summary: 'Reminder update request prepared successfully.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'update_reminder',
      details: {
        reminder_id: inputs.reminder_id || null,
        title_match: inputs.title_match || null,
        patch: {
          title: patch.title || null,
          description: patch.description || null,
          remind_at: patch.remind_at || null,
          status: patch.status || null,
          recurrence: patch.recurrence || null
        }
      }
    }],
    artifacts: [{ type: 'reminder_id', value: reminderRef }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
`;

const CODE_REMINDER_CANCEL = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const missing = [];
if (!inputs.reminder_id && !inputs.title_match) missing.push('reminder_id_or_title_match');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Reminder cancel inputs are incomplete.', missing_fields: missing } }];
}
const reminderRef = inputs.reminder_id || \`title_match:\${inputs.title_match}\`;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'reminder_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: 'success',
    summary: 'Reminder cancel request prepared successfully.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'cancel_reminder',
      details: {
        reminder_id: inputs.reminder_id || null,
        title_match: inputs.title_match || null,
        new_status: 'cancelled'
      }
    }],
    artifacts: [{ type: 'reminder_id', value: reminderRef }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
`;

// --- memory handlers ---
const CODE_MEMORY_STORE = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const validTypes = ['fact','observation','pattern','inference','preference','constraint'];
const missing = [];
if (!inputs.content) missing.push('content');
if (!inputs.memory_type || !validTypes.includes(inputs.memory_type)) missing.push('memory_type');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Memory store inputs are incomplete.', missing_fields: missing } }];
}
const memoryId = \`memory:\${env.tenant_id}:\${step.step_id}\`;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: 'success',
    summary: 'Memory store request prepared successfully.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'store_memory',
      details: {
        memory_id: memoryId,
        content: inputs.content,
        memory_type: inputs.memory_type,
        source_context: inputs.source_context || null,
        durability: inputs.durability || 'standard'
      }
    }],
    artifacts: [{ type: 'memory_id', value: memoryId }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
`;

const CODE_MEMORY_SEARCH = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const missing = [];
if (!inputs.query) missing.push('query');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Memory search inputs are incomplete.', missing_fields: missing } }];
}
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'analysis',
    status: 'success',
    summary: 'Memory search request prepared successfully.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'search_memory',
      details: {
        query: inputs.query,
        timeframe: inputs.timeframe || 'all',
        memory_type: inputs.memory_type || null,
        limit: inputs.limit || 10,
        recall_results: []
      }
    }],
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

// --- improvement handler ---
const CODE_IMPROVEMENT_CAPTURE = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const missing = [];
if (!inputs.feedback_content) missing.push('feedback_content');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Improvement capture inputs are incomplete.', missing_fields: missing } }];
}
const improvementId = \`improvement:\${env.tenant_id}:\${step.step_id}\`;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'improvement_module',
    step_id: step.step_id,
    result_type: 'execution',
    status: 'success',
    summary: 'Improvement capture request prepared successfully.',
    observations: [],
    proposals: [],
    actions_executed: [{
      action: 'capture_feedback',
      details: {
        improvement_id: improvementId,
        feedback_content: inputs.feedback_content,
        category: inputs.category || null,
        severity: inputs.severity || 'normal'
      }
    }],
    artifacts: [{ type: 'improvement_id', value: improvementId }],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
`;

// --- watcher handler (never fails) ---
const CODE_WATCHER_OBSERVE = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const digest = {
  has_thread_summary: !!inputs.thread_summary,
  has_recent_memory_context: !!inputs.recent_memory_context,
  module_results_so_far_count: Array.isArray(inputs.module_results_so_far) ? inputs.module_results_so_far.length : 0
};
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'watcher_module_basic',
    step_id: step.step_id,
    result_type: 'analysis',
    status: 'success',
    summary: 'Watcher observation returned empty result set.',
    observations: [],
    proposals: [],
    anomaly_signals: [],
    actions_executed: [{
      action: 'observe',
      details: { trigger: 'passive', inputs_digest: digest }
    }],
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

// Updated ME_Return_Error: module-aware error reporting.
const CODE_RETURN_ERROR_V2 = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const data = $json || {};
const KNOWN_MODULES = new Set(['task_module','reminder_module','memory_module','improvement_module','watcher_module_basic']);
let code, message, missing, details;
if (data && data.error_code) {
  code = data.error_code;
  message = data.error_message || 'Module execution validation error.';
  missing = Array.isArray(data.missing_fields) ? data.missing_fields : [];
  details = {};
} else if (env && env.step && !KNOWN_MODULES.has(env.step.module_name)) {
  code = 'UNSUPPORTED_MODULE';
  message = \`WF-ME-01 does not support module \${env.step.module_name}.\`;
  missing = [];
  details = { module_name: env.step.module_name };
} else {
  const moduleName = env && env.step ? env.step.module_name : 'unknown_module';
  const action = (env && env.step && env.step.inputs) ? env.step.inputs.action : null;
  code = 'UNSUPPORTED_ACTION';
  message = \`Unsupported \${moduleName} action: \${action}.\`;
  missing = [];
  details = { module_name: moduleName, action: action };
}
return [{ json: {
  status_kind: 'error',
  result_type: 'module_error',
  module_name: 'module_execution',
  error: {
    code: code,
    message: message,
    missing_fields: missing,
    details: details
  }
}}];
`;

// ------------------------------- apply patch -------------------------------
const ME_ID = 'uq26nh1grIpnHju0';
const cur = await apiGet(ME_ID);
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-ME-01_phase11_pre.json', JSON.stringify(cur, null, 2));

const existingNames = new Set(cur.nodes.map(n => n.name));
if (existingNames.has('ME_Route_Reminder_Action')) {
  console.log('Phase-11 ME patch: already applied (ME_Route_Reminder_Action exists); no-op.');
  process.exit(0);
}

// Build new nodes (handlers + switches).
const newHandlerNodes = [
  { name: 'ME_Reminder_Create_Result',     code: CODE_REMINDER_CREATE,    pos: [2768, 700] },
  { name: 'ME_Reminder_List_Result',       code: CODE_REMINDER_LIST,      pos: [2768, 770] },
  { name: 'ME_Reminder_Update_Result',     code: CODE_REMINDER_UPDATE,    pos: [2768, 840] },
  { name: 'ME_Reminder_Cancel_Result',     code: CODE_REMINDER_CANCEL,    pos: [2768, 910] },
  { name: 'ME_Memory_Store_Result',        code: CODE_MEMORY_STORE,       pos: [2768, 1040] },
  { name: 'ME_Memory_Search_Result',       code: CODE_MEMORY_SEARCH,      pos: [2768, 1110] },
  { name: 'ME_Improvement_Capture_Result', code: CODE_IMPROVEMENT_CAPTURE,pos: [2768, 1240] },
  { name: 'ME_Watcher_Observe_Result',     code: CODE_WATCHER_OBSERVE,    pos: [2768, 1340] }
].map(h => ({
  parameters: { jsCode: h.code },
  id: `me-phase11-${h.name.toLowerCase().replace(/_/g,'-')}`,
  name: h.name,
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: h.pos
}));

const newReminderSwitch = {
  parameters: {
    rules: { values: [
      rule('create_reminder','create_reminder'),
      rule('list_reminders','list_reminders'),
      rule('update_reminder','update_reminder'),
      rule('cancel_reminder','cancel_reminder')
    ]},
    options: { fallbackOutput: 'extra' }
  },
  id: 'me-phase11-route-reminder-action',
  name: 'ME_Route_Reminder_Action',
  type: 'n8n-nodes-base.switch',
  typeVersion: 3.2,
  position: [2528, 805]
};

const newMemorySwitch = {
  parameters: {
    rules: { values: [
      rule('store_memory','store_memory'),
      rule('search_memory','search_memory')
    ]},
    options: { fallbackOutput: 'extra' }
  },
  id: 'me-phase11-route-memory-action',
  name: 'ME_Route_Memory_Action',
  type: 'n8n-nodes-base.switch',
  typeVersion: 3.2,
  position: [2528, 1075]
};

// Extend ME_Route_Module_Name to 5 rules.
const newModuleRouteRules = [
  moduleRule('task_module','task_module'),
  moduleRule('reminder_module','reminder_module'),
  moduleRule('memory_module','memory_module'),
  moduleRule('improvement_module','improvement_module'),
  moduleRule('watcher_module_basic','watcher_module_basic')
];

const newNodes = cur.nodes.map(n => {
  if (n.name === 'ME_Route_Module_Name') {
    return {
      ...n,
      parameters: {
        rules: { values: newModuleRouteRules },
        options: { fallbackOutput: 'extra' }
      }
    };
  }
  if (n.name === 'ME_Return_Error') {
    return { ...n, parameters: { ...n.parameters, jsCode: CODE_RETURN_ERROR_V2 } };
  }
  return n;
}).concat(newReminderSwitch, newMemorySwitch, newHandlerNodes);

// Extend connections.
const conns = JSON.parse(JSON.stringify(cur.connections));

// ME_Route_Module_Name now 5 real outputs + fallback. Re-materialize.
conns['ME_Route_Module_Name'] = { main: [
  [{ node: 'ME_Route_Task_Action',           type: 'main', index: 0 }],
  [{ node: 'ME_Route_Reminder_Action',       type: 'main', index: 0 }],
  [{ node: 'ME_Route_Memory_Action',         type: 'main', index: 0 }],
  [{ node: 'ME_Improvement_Capture_Result',  type: 'main', index: 0 }],
  [{ node: 'ME_Watcher_Observe_Result',      type: 'main', index: 0 }],
  [{ node: 'ME_Return_Error',                type: 'main', index: 0 }]
]};

// New per-action switches
conns['ME_Route_Reminder_Action'] = { main: [
  [{ node: 'ME_Reminder_Create_Result', type: 'main', index: 0 }],
  [{ node: 'ME_Reminder_List_Result',   type: 'main', index: 0 }],
  [{ node: 'ME_Reminder_Update_Result', type: 'main', index: 0 }],
  [{ node: 'ME_Reminder_Cancel_Result', type: 'main', index: 0 }],
  [{ node: 'ME_Return_Error',           type: 'main', index: 0 }]
]};
conns['ME_Route_Memory_Action'] = { main: [
  [{ node: 'ME_Memory_Store_Result',  type: 'main', index: 0 }],
  [{ node: 'ME_Memory_Search_Result', type: 'main', index: 0 }],
  [{ node: 'ME_Return_Error',         type: 'main', index: 0 }]
]};

// All new handlers converge on ME_Return_Result.
for (const name of [
  'ME_Reminder_Create_Result','ME_Reminder_List_Result','ME_Reminder_Update_Result','ME_Reminder_Cancel_Result',
  'ME_Memory_Store_Result','ME_Memory_Search_Result',
  'ME_Improvement_Capture_Result','ME_Watcher_Observe_Result'
]) {
  conns[name] = { main: [[{ node: 'ME_Return_Result', type: 'main', index: 0 }]] };
}

const cleanSettings = {};
for (const k of Object.keys(cur.settings || {})) if (SETTINGS_WHITELIST.has(k)) cleanSettings[k] = cur.settings[k];

const body = { name: cur.name, nodes: newNodes, connections: conns, settings: cleanSettings };
writeFileSync('/sessions/amazing-festive-maxwell/mnt/Ucenicul/tests/generated/workflows/snapshots/WF-ME-01_phase11_put.json', JSON.stringify(body, null, 2));

await apiDeactivate(ME_ID);
await apiPut(ME_ID, body);
await apiActivate(ME_ID);

const after = await apiGet(ME_ID);
const names = new Set(after.nodes.map(n => n.name));
const requiredNew = [
  'ME_Route_Reminder_Action','ME_Route_Memory_Action',
  'ME_Reminder_Create_Result','ME_Reminder_List_Result','ME_Reminder_Update_Result','ME_Reminder_Cancel_Result',
  'ME_Memory_Store_Result','ME_Memory_Search_Result',
  'ME_Improvement_Capture_Result','ME_Watcher_Observe_Result'
];
for (const n of requiredNew) {
  if (!names.has(n)) throw new Error(`Phase-11 ME patch: missing node after PUT: ${n}`);
}
const route = after.nodes.find(n => n.name === 'ME_Route_Module_Name');
const ruleCount = route?.parameters?.rules?.values?.length || 0;
console.log('ME_Route_Module_Name rule count:', ruleCount, '(expected 5)');
if (ruleCount !== 5) throw new Error('Phase-11 ME patch: module route rule count mismatch');
console.log('Phase-11 ME patch: OK —', requiredNew.length, 'new nodes present');
