/**
 * E2E Flow Simulator — simulates Telegram input → every node → final output
 * Tests: create_task, list_tasks (multiple filters), create_reminder, list_reminders (multiple filters)
 *
 * Simulates every node in the workflow chain:
 *   Telegram Trigger → Normalize Telegram Input → Normalize Input → Privacy Gate
 *   → Resolve Org (mock) → IF Org Found → Load Minimal Context (mock)
 *   → Build Brain Input → Brain Decision (mock LLM) → Parse and Validate Brain Contract
 *   → Insert Inbound Message (mock) → Merge Inbound Result → Route by Intent
 *   → [Action Node] → [Format Node if list] → Memory Write (NO-OP)
 *   → Privacy Gate Outbound → Normalize Client Response → IF Skip Outbound
 *   → Insert Outbound Message (mock) → Merge Outbound → IF Send Telegram → Final Output
 *
 * USAGE: node test_e2e_flow.js
 */

// ============================================================
// MOCK DATA — simulates DB state
// ============================================================

const MOCK_ORG = {
  organization_id: '11111111-1111-1111-1111-111111111111',
  organization_name: 'Test Org',
  tenant_id: '22222222-2222-2222-2222-222222222222',
  tenant_name: 'Cleaning Business',
  tenant_slug: 'cleaning',
  tenant_vertical: 'cleaning',
  tenant_timezone: 'Europe/Bucharest',
  tenant_currency_code: 'RON',
  found: true
};

const MOCK_CONTEXT = {
  business: { name: 'EcoClean SRL', business_type: 'cleaning', stage: 'active' },
  tasks: [
    { id: 'aaa-111', title: 'Cumpără detergenți', priority: 'normal', status: 'open', due_date: '2026-04-04', due_at: null, due_type: 'date' },
    { id: 'aaa-222', title: 'Sună furnizorul de echipamente', priority: 'high', status: 'open', due_date: null, due_at: '2026-04-05T10:00:00+03:00', due_type: 'datetime' }
  ],
  reminders: [
    { id: 'bbb-111', title: 'Verifică stocul', remind_at: '2026-04-04T09:00:00+03:00', status: 'pending' },
    { id: 'bbb-222', title: 'Plătește factura Enel', remind_at: '2026-04-10T08:00:00+03:00', status: 'pending' }
  ],
  memories: []
};

// Mock DB rows returned by List Tasks queries
const MOCK_TASK_ROWS = {
  all: [
    { id: 'aaa-111', title: 'Cumpără detergenți', priority: 'normal', status: 'open', due_date: '2026-04-04', due_at: null, due_type: 'date', created_at: '2026-04-02' },
    { id: 'aaa-222', title: 'Sună furnizorul de echipamente', priority: 'high', status: 'open', due_date: null, due_at: '2026-04-05T10:00:00+03:00', due_type: 'datetime', created_at: '2026-04-01' },
    { id: 'aaa-333', title: 'Verifică programul echipei', priority: 'normal', status: 'open', due_date: '2026-04-07', due_at: null, due_type: 'date', created_at: '2026-04-01' }
  ],
  today: [
    { id: 'aaa-444', title: 'Inventar zilnic', priority: 'normal', status: 'open', due_date: '2026-04-03', due_at: null, due_type: 'date', created_at: '2026-04-03' }
  ],
  tomorrow: [
    { id: 'aaa-111', title: 'Cumpără detergenți', priority: 'normal', status: 'open', due_date: '2026-04-04', due_at: null, due_type: 'date', created_at: '2026-04-02' }
  ],
  this_week: [
    { id: 'aaa-111', title: 'Cumpără detergenți', priority: 'normal', status: 'open', due_date: '2026-04-04', due_at: null, due_type: 'date', created_at: '2026-04-02' },
    { id: 'aaa-222', title: 'Sună furnizorul de echipamente', priority: 'high', status: 'open', due_date: null, due_at: '2026-04-05T10:00:00+03:00', due_type: 'datetime', created_at: '2026-04-01' },
    { id: 'aaa-333', title: 'Verifică programul echipei', priority: 'normal', status: 'open', due_date: '2026-04-07', due_at: null, due_type: 'date', created_at: '2026-04-01' }
  ],
  this_month: [
    { id: 'aaa-111', title: 'Cumpără detergenți', priority: 'normal', status: 'open', due_date: '2026-04-04', due_at: null, due_type: 'date', created_at: '2026-04-02' },
    { id: 'aaa-222', title: 'Sună furnizorul de echipamente', priority: 'high', status: 'open', due_date: null, due_at: '2026-04-05T10:00:00+03:00', due_type: 'datetime', created_at: '2026-04-01' },
    { id: 'aaa-333', title: 'Verifică programul echipei', priority: 'normal', status: 'open', due_date: '2026-04-07', due_at: null, due_type: 'date', created_at: '2026-04-01' },
    { id: 'aaa-555', title: 'Raport lunar clienți', priority: 'normal', status: 'open', due_date: '2026-04-30', due_at: null, due_type: 'date', created_at: '2026-04-01' }
  ]
};

const MOCK_REMINDER_ROWS = {
  all: [
    { id: 'bbb-111', title: 'Verifică stocul', remind_at: '2026-04-04T09:00:00+03:00', status: 'pending', created_at: '2026-04-02' },
    { id: 'bbb-222', title: 'Plătește factura Enel', remind_at: '2026-04-10T08:00:00+03:00', status: 'pending', created_at: '2026-04-01' }
  ],
  today: [],
  tomorrow: [
    { id: 'bbb-111', title: 'Verifică stocul', remind_at: '2026-04-04T09:00:00+03:00', status: 'pending', created_at: '2026-04-02' }
  ],
  this_week: [
    { id: 'bbb-111', title: 'Verifică stocul', remind_at: '2026-04-04T09:00:00+03:00', status: 'pending', created_at: '2026-04-02' }
  ],
  this_month: [
    { id: 'bbb-111', title: 'Verifică stocul', remind_at: '2026-04-04T09:00:00+03:00', status: 'pending', created_at: '2026-04-02' },
    { id: 'bbb-222', title: 'Plătește factura Enel', remind_at: '2026-04-10T08:00:00+03:00', status: 'pending', created_at: '2026-04-01' }
  ]
};

// ============================================================
// NODE SIMULATORS (extracted from workflow JSON)
// ============================================================

function simulateNormalizeTelegramInput(telegramMsg) {
  return {
    source: 'telegram',
    organization_id: null,
    tenant_id: null,
    telegram_chat_id: telegramMsg.chatId,
    telegram_message_id: telegramMsg.messageId,
    raw_user_message: telegramMsg.text || '',
    received_at: new Date().toISOString(),
    test_mode: false
  };
}

function simulateNormalizeInput(item) {
  return {
    source: item.source || 'unknown',
    organization_id: item.organization_id || null,
    tenant_id: item.tenant_id || null,
    telegram_chat_id: String(item.telegram_chat_id || ''),
    telegram_message_id: item.telegram_message_id || null,
    raw_user_message: (item.raw_user_message || '').trim(),
    received_at: item.received_at || new Date().toISOString(),
    test_mode: item.test_mode === true
  };
}

function simulatePrivacyGateInbound(item) {
  return item; // NO-OP
}

function simulateResolveOrg(/* input ignored, using mock */) {
  return MOCK_ORG;
}

function simulateIFOrgFound(orgResult) {
  if (!orgResult.found) throw new Error('Organization not found');
  return orgResult;
}

function simulateLoadMinimalContext(/* mock */) {
  return { context: JSON.stringify(MOCK_CONTEXT) };
}

function simulateBuildBrainInput(originalInput, orgData, contextRow) {
  const context = typeof contextRow.context === 'string'
    ? JSON.parse(contextRow.context)
    : (contextRow.context || {});

  return {
    source: originalInput.source,
    organization_id: orgData.organization_id,
    organization_name: orgData.organization_name,
    tenant_id: orgData.tenant_id,
    tenant_name: orgData.tenant_name,
    tenant_slug: orgData.tenant_slug,
    tenant_vertical: orgData.tenant_vertical,
    tenant_timezone: orgData.tenant_timezone,
    tenant_currency_code: orgData.tenant_currency_code,
    telegram_chat_id: originalInput.telegram_chat_id,
    telegram_message_id: originalInput.telegram_message_id,
    raw_user_message: originalInput.raw_user_message,
    received_at: originalInput.received_at,
    test_mode: originalInput.test_mode,
    context: context,
    system_prompt: '(prompt would be built here)',
    user_prompt: originalInput.raw_user_message
  };
}

// ============================================================
// PARSER — extracted from parse_contract_final.js (the CORRECT version)
// ============================================================

function simulateParser(httpResponse, ctx) {
  const VALID_INTENTS = [
    'create_task', 'update_task', 'complete_task', 'cancel_task', 'list_tasks',
    'create_reminder', 'update_reminder', 'cancel_reminder', 'list_reminders',
    'search_memory', 'general_response', 'clarify', 'save_improvement_request', 'none'
  ];
  const VALID_TASK_PRIORITIES = ['urgent', 'high', 'normal', 'low'];
  const VALID_TASK_DUE_TYPES = ['flexible', 'date', 'datetime'];
  const VALID_FALLBACK_DUE_TYPES = ['date', 'datetime'];
  const VALID_FILTER_SCOPES = ['all','today','tomorrow','day_after_tomorrow','overdue','urgent','high','this_week','this_month'];
  const VALID_MEMORY_TYPES = ['fact', 'insight', 'advice'];
  const VALID_MEMORY_CATEGORIES = ['business_profile','customer_market','growth_context','entrepreneur_profile','relationship_history','operational_patterns','preferences','constraints'];

  function makeClarify(reason, responseText) {
    return { version:'brain-decision-v1', intent:'clarify', domain:'general', response: responseText||'Nu am înțeles exact ce dorești. Poți reformula?', debug_summary:reason, requires_confirmation:false, requires_clarification:true, task_action:null, task_fallback_rules:[], reminder_action:null, memory_action:null, improvement_request:null, memory_writes:[] };
  }
  function normalizeTaskAction(v) {
    if (!v||typeof v!=='object') return null;
    return { id:v.id||null, title:typeof v.title==='string'&&v.title.trim()!==''?v.title.trim():null, description:typeof v.description==='string'&&v.description.trim()!==''?v.description.trim():null, priority:VALID_TASK_PRIORITIES.includes(v.priority)?v.priority:null, due_type:VALID_TASK_DUE_TYPES.includes(v.due_type)?v.due_type:null, due_date:typeof v.due_date==='string'&&v.due_date.trim()!==''?v.due_date.trim():null, due_at:typeof v.due_at==='string'&&v.due_at.trim()!==''?v.due_at.trim():null, filter_scope:VALID_FILTER_SCOPES.includes(v.filter_scope)?v.filter_scope:null };
  }
  function normalizeReminderAction(v) {
    if (!v||typeof v!=='object') return null;
    return { id:v.id||null, title:typeof v.title==='string'&&v.title.trim()!==''?v.title.trim():null, description:typeof v.description==='string'&&v.description.trim()!==''?v.description.trim():null, remind_at:typeof v.remind_at==='string'&&v.remind_at.trim()!==''?v.remind_at.trim():null, filter_scope:VALID_FILTER_SCOPES.includes(v.filter_scope)?v.filter_scope:null };
  }
  function normalizeMemoryAction(v) { if(!v||typeof v!=='object') return null; return { query:typeof v.query==='string'?v.query.trim():'', category_filter:typeof v.category_filter==='string'&&v.category_filter.trim()!==''?v.category_filter.trim():null }; }
  function normalizeImprovementRequest(v) { if(!v||typeof v!=='object') return null; return { requested_feature:typeof v.requested_feature==='string'?v.requested_feature.trim():'', user_message:typeof v.user_message==='string'&&v.user_message.trim()!==''?v.user_message.trim():null }; }

  function inferFilterScopeFromMessage(msg) {
    const text = (msg||'').toLowerCase();
    if (text.includes('poimaine')||text.includes('poimâine')) return 'day_after_tomorrow';
    if (text.includes('maine')||text.includes('mâine')||text.includes('miine')) return 'tomorrow';
    if (text.includes('azi')||text.includes('astazi')||text.includes('astăzi')) return 'today';
    if (text.includes('restant')||text.includes('restante')||text.includes('întârzi')||text.includes('intarzi')||text.includes('intarziat')) return 'overdue';
    if (text.includes('urgent')||text.includes('urgente')) return 'urgent';
    if (text.includes('high')||text.includes('prioritate mare')) return 'high';
    if (text.includes('saptamana asta')||text.includes('săptămâna asta')||text.includes('saptamina asta')||text.includes('săptămîna asta')) return 'this_week';
    if (text.includes('luna asta')) return 'this_month';
    return 'all';
  }
  function messageImpliesTaskPreference(msg) {
    const text = (msg||'').toLowerCase();
    return text.includes('trebuie sa')||text.includes('trebuie să')||text.includes('trb sa')||text.includes('trb să')||text.includes('am de')||text.includes('pune-mi task')||text.includes('pune task')||text.includes('creeaza task')||text.includes('creează task')||text.includes('creeaza-mi task')||text.includes('creează-mi task')||text.includes('fa task')||text.includes('fă task')||text.includes('fa-mi task')||text.includes('fă-mi task')||text.includes('adauga task')||text.includes('adaugă task');
  }
  function messageImpliesReminderPreference(msg) {
    const text = (msg||'').toLowerCase();
    return text.includes('adu-mi aminte')||text.includes('adumi aminte')||text.includes('amintește-mi')||text.includes('aminteste-mi')||text.includes('amintestemi')||text.includes('reamintește-mi')||text.includes('reaminteste-mi')||text.includes('reamintestemi')||text.includes('nu uita sa-mi amintesti')||text.includes('nu uita să-mi amintești')||text.includes('sa nu uit')||text.includes('să nu uit')||text.includes('sanuuit')||text.includes('reminder');
  }
  function buildTaskActionFromReminder(ra) {
    if (!ra||!ra.title) return null;
    return normalizeTaskAction({ title:ra.title, description:ra.description||null, priority:'normal', due_type:ra.remind_at?'datetime':'flexible', due_at:ra.remind_at||null });
  }

  let decision;
  try {
    let text = '';
    if (httpResponse.choices&&httpResponse.choices[0]) { text = httpResponse.choices[0].message.content||''; }
    else if (typeof httpResponse === 'string') { text = httpResponse; }
    else { text = JSON.stringify(httpResponse); }
    text = text.replace(/```json\n?|\n?```/g, '').trim();
    decision = JSON.parse(text);

    if (decision.task!==undefined||decision.reminder!==undefined||decision.memory_candidate!==undefined||decision.response_text!==undefined||decision.confidence!==undefined) {
      decision = makeClarify('old_contract_fields_detected');
    } else if (decision.version!=='brain-decision-v1') {
      decision = makeClarify('wrong_version_'+String(decision.version));
    } else if (!VALID_INTENTS.includes(decision.intent)) {
      decision = makeClarify('invalid_intent_'+String(decision.intent));
    } else {
      decision.domain = typeof decision.domain==='string'&&decision.domain.trim()!==''?decision.domain.trim():'general';
      decision.response = typeof decision.response==='string'?decision.response.trim():'';
      decision.debug_summary = typeof decision.debug_summary==='string'?decision.debug_summary.trim():'';
      decision.requires_confirmation = !!decision.requires_confirmation;
      decision.requires_clarification = !!decision.requires_clarification;
      decision.task_action = normalizeTaskAction(decision.task_action);
      decision.reminder_action = normalizeReminderAction(decision.reminder_action);
      decision.memory_action = normalizeMemoryAction(decision.memory_action);
      decision.improvement_request = normalizeImprovementRequest(decision.improvement_request);
      decision.task_fallback_rules = Array.isArray(decision.task_fallback_rules)?decision.task_fallback_rules:[];
      decision.task_fallback_rules = decision.task_fallback_rules.filter(function(rule) { if(!rule||typeof rule!=='object') return false; if(rule.condition!=='not_completed') return false; if(typeof rule.title!=='string'||rule.title.trim()==='') return false; if(!VALID_TASK_PRIORITIES.includes(rule.priority)) return false; if(!VALID_FALLBACK_DUE_TYPES.includes(rule.due_type)) return false; if(rule.due_type==='date'&&(typeof rule.due_date!=='string'||rule.due_date.trim()==='')) return false; if(rule.due_type==='datetime'&&(typeof rule.due_at!=='string'||rule.due_at.trim()==='')) return false; return true; });
      decision.memory_writes = Array.isArray(decision.memory_writes)?decision.memory_writes:[];
      decision.memory_writes = decision.memory_writes.filter(function(item) { if(!item||typeof item!=='object') return false; if(!VALID_MEMORY_TYPES.includes(item.type)) return false; if(!VALID_MEMORY_CATEGORIES.includes(item.category)) return false; if(typeof item.content!=='string'||item.content.trim()==='') return false; return true; });

      if (decision.intent==='list_tasks') { if(!decision.task_action) { decision.task_action = normalizeTaskAction({filter_scope:inferFilterScopeFromMessage(ctx.raw_user_message)}); } else if(!decision.task_action.filter_scope) { decision.task_action.filter_scope = inferFilterScopeFromMessage(ctx.raw_user_message); } }
      if (decision.intent==='list_reminders') { if(!decision.reminder_action) { decision.reminder_action = normalizeReminderAction({filter_scope:inferFilterScopeFromMessage(ctx.raw_user_message)}); } else if(!decision.reminder_action.filter_scope) { decision.reminder_action.filter_scope = inferFilterScopeFromMessage(ctx.raw_user_message); } }

      const hasTaskLanguage = messageImpliesTaskPreference(ctx.raw_user_message);
      const hasReminderLanguage = messageImpliesReminderPreference(ctx.raw_user_message);
      if (hasTaskLanguage&&hasReminderLanguage) { if(decision.intent==='create_reminder') decision.intent='create_task'; if(decision.intent==='create_task'&&(!decision.task_action||!decision.task_action.title)&&decision.reminder_action&&decision.reminder_action.title) decision.task_action=buildTaskActionFromReminder(decision.reminder_action); if(decision.intent==='create_task') decision.reminder_action=null; }

      if (decision.intent==='create_task') { if(!decision.task_action||!decision.task_action.title) { decision=makeClarify('missing_task_action_title_for_create_task'); } else { if(!decision.task_action.priority) decision.task_action.priority='normal'; if(!decision.task_action.due_type){if(decision.task_action.due_at)decision.task_action.due_type='datetime';else if(decision.task_action.due_date)decision.task_action.due_type='date';else decision.task_action.due_type='flexible';} if(decision.task_action.due_type==='date')decision.task_action.due_at=null; if(decision.task_action.due_type==='datetime')decision.task_action.due_date=null; decision.reminder_action=null; } }
      if (['update_task','complete_task','cancel_task'].includes(decision.intent)) { if(!decision.task_action) decision=makeClarify('missing_task_action_for_'+decision.intent); }
      if (decision.intent==='create_reminder') { if(!decision.reminder_action||!decision.reminder_action.title||!decision.reminder_action.remind_at) { decision=makeClarify('missing_reminder_action_for_create_reminder'); } else { if(decision.task_action&&!hasTaskLanguage) { decision=makeClarify('create_reminder_should_not_also_create_task','Vrei să creez un reminder sau un task pentru asta?'); } else { decision.task_action=null; decision.task_fallback_rules=[]; } } }
      if (['update_reminder','cancel_reminder'].includes(decision.intent)) { if(!decision.reminder_action) decision=makeClarify('missing_reminder_action_for_'+decision.intent); }
      if (decision.intent==='search_memory') { if(!decision.memory_action||!decision.memory_action.query||decision.memory_action.query.trim()==='') decision=makeClarify('missing_memory_action_query_for_search_memory'); }
      if (decision.intent==='save_improvement_request') { if(!decision.improvement_request||!decision.improvement_request.requested_feature||decision.improvement_request.requested_feature.trim()==='') decision=makeClarify('missing_improvement_request_feature'); }
      if (decision.intent==='none'||decision.intent==='general_response') { decision.task_action=null; decision.task_fallback_rules=[]; decision.reminder_action=null; decision.memory_action=null; decision.improvement_request=null; }
    }
  } catch(e) { decision = makeClarify('parse_error_'+e.message.substring(0,100)); }

  return {
    organization_id: ctx.organization_id,
    organization_name: ctx.organization_name,
    tenant_id: ctx.tenant_id,
    tenant_name: ctx.tenant_name,
    tenant_slug: ctx.tenant_slug,
    tenant_vertical: ctx.tenant_vertical,
    tenant_timezone: ctx.tenant_timezone,
    tenant_currency_code: ctx.tenant_currency_code,
    telegram_chat_id: ctx.telegram_chat_id,
    telegram_message_id: ctx.telegram_message_id,
    raw_user_message: ctx.raw_user_message,
    received_at: ctx.received_at,
    test_mode: ctx.test_mode,
    source: ctx.source,
    context: ctx.context,
    decision: decision
  };
}

// ============================================================
// ACTION NODE SIMULATORS
// ============================================================

function simulateCreateTask(parsedData) {
  const d = parsedData.decision;
  const ta = d.task_action;
  // Validate SQL params would work
  const params = [
    parsedData.tenant_id,          // $1
    ta.title,                       // $2
    ta.description || '',           // $3
    ta.priority || 'normal',        // $4
    ta.due_type || 'flexible',      // $5
    ta.due_date || '',              // $6 - NULLIF('', '')::date
    ta.due_at || '',                // $7 - NULLIF('', '')::timestamptz
    JSON.stringify({source_message: (parsedData.raw_user_message || '').substring(0,200)}) // $8
  ];

  const issues = [];
  if (!params[0]) issues.push('tenant_id is null — SQL will fail on $1::uuid');
  if (!params[1]) issues.push('title is null — cannot insert task without title');
  if (params[5] && !/^\d{4}-\d{2}-\d{2}$/.test(params[5])) issues.push('due_date format invalid: ' + params[5]);
  if (params[6] && !params[6].match(/T/)) issues.push('due_at not ISO format: ' + params[6]);

  return {
    action: 'create_task',
    sql_params: params,
    mock_result: { id: 'new-task-' + Date.now(), title: ta.title, status: 'open' },
    issues: issues
  };
}

function simulateListTasks(parsedData) {
  const d = parsedData.decision;
  const filterScope = d.task_action?.filter_scope || 'all';
  const params = [parsedData.tenant_id, filterScope];

  const issues = [];
  if (!params[0]) issues.push('tenant_id is null — SQL will fail');

  // Check if filter_scope is supported by the SQL query (FIXED: all 9 values now supported)
  const SQL_SUPPORTED_FILTERS = ['all', 'today', 'tomorrow', 'day_after_tomorrow', 'overdue', 'urgent', 'high', 'this_week', 'this_month'];
  if (!SQL_SUPPORTED_FILTERS.includes(filterScope)) {
    issues.push(`BUG: filter_scope="${filterScope}" is NOT handled in SQL query! Only supports: ${SQL_SUPPORTED_FILTERS.join(', ')}`);
    issues.push('Result: query will return 0 rows because no SQL branch matches this filter');
  }

  const rows = MOCK_TASK_ROWS[filterScope] || MOCK_TASK_ROWS.all;

  return {
    action: 'list_tasks',
    sql_params: params,
    filter_scope: filterScope,
    mock_rows: rows,
    issues: issues
  };
}

function simulateFormatTaskList(listResult) {
  const tasks = listResult.mock_rows || [];
  // FIXED: now includes priority, due_date, due_type
  const formatted = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority || 'normal',
    status: t.status,
    due_type: t.due_type || 'flexible',
    due_date: t.due_date || null,
    due_at: t.due_at || null
  }));

  const issues = [];
  return { action: 'list_tasks', tasks: formatted, count: formatted.length, issues: issues };
}

function simulateCreateReminder(parsedData) {
  const d = parsedData.decision;
  const ra = d.reminder_action;
  const params = [
    parsedData.tenant_id,
    ra.title,
    ra.description || '',
    ra.remind_at,
    JSON.stringify({source_message: (parsedData.raw_user_message || '').substring(0,200)})
  ];

  const issues = [];
  if (!params[0]) issues.push('tenant_id is null — SQL will fail');
  if (!params[1]) issues.push('title is null — cannot insert');
  if (!params[3]) issues.push('remind_at is null — cannot insert reminder without time');
  if (params[3] && !params[3].match(/T/)) issues.push('remind_at not ISO format: ' + params[3]);

  return {
    action: 'create_reminder',
    sql_params: params,
    mock_result: { id: 'new-rem-' + Date.now(), title: ra.title, remind_at: ra.remind_at, status: 'pending' },
    issues: issues
  };
}

function simulateListReminders(parsedData) {
  const d = parsedData.decision;
  const filterScope = d.reminder_action?.filter_scope || 'all';
  // FIXED: now passes filter_scope as $2
  const params = [parsedData.tenant_id, filterScope];

  const issues = [];
  if (!params[0]) issues.push('tenant_id is null — SQL will fail');

  // FIXED: SQL now supports filter_scope
  const SQL_SUPPORTED_FILTERS = ['all', 'today', 'tomorrow', 'day_after_tomorrow', 'overdue', 'this_week', 'this_month'];
  if (!SQL_SUPPORTED_FILTERS.includes(filterScope)) {
    issues.push(`BUG: filter_scope="${filterScope}" is NOT handled in List Reminders SQL!`);
  }

  // Simulate filtered results
  const rows = MOCK_REMINDER_ROWS[filterScope] || MOCK_REMINDER_ROWS.all;

  return {
    action: 'list_reminders',
    sql_params: params,
    filter_scope: filterScope,
    mock_rows: rows,
    issues: issues
  };
}

function simulateFormatReminderList(listResult) {
  const reminders = listResult.mock_rows || [];
  // FIXED: now keeps remind_at (not due_at)
  const formatted = reminders.map(r => ({ id: r.id, title: r.title, remind_at: r.remind_at, status: r.status }));

  const issues = [];
  return { action: 'list_reminders', reminders: formatted, count: formatted.length, issues: issues };
}

function simulateMemoryWrite(item) { return item; } // NO-OP
function simulatePrivacyGateOutbound(item) { return item; } // NO-OP

function simulateNormalizeClientResponse(item) {
  return { ...item, timestamp: new Date().toISOString() };
}

function simulateIFSkipOutbound(item) {
  return { skip: item.decision?.intent === 'none', item: item };
}

function simulateFinalOutput(result) {
  return {
    success: true,
    action: result.action || 'completed',
    message: result.decision?.response || 'Request processed',
    timestamp: new Date().toISOString(),
    data: result
  };
}

// ============================================================
// E2E FLOW RUNNER
// ============================================================

function runE2E(testCase) {
  const errors = [];
  const nodeOutputs = {};

  // Step 1: Telegram Trigger (simulated)
  const telegramMsg = { chatId: '123456789', messageId: testCase.msgId || 9001, text: testCase.input };

  // Step 2: Normalize Telegram Input
  nodeOutputs['Normalize Telegram Input'] = simulateNormalizeTelegramInput(telegramMsg);

  // Step 3: Normalize Input
  nodeOutputs['Normalize Input'] = simulateNormalizeInput(nodeOutputs['Normalize Telegram Input']);

  // Step 4: Privacy Gate Inbound
  nodeOutputs['Privacy Gate Inbound'] = simulatePrivacyGateInbound(nodeOutputs['Normalize Input']);

  // Step 5: Resolve Organization
  nodeOutputs['Resolve Org'] = simulateResolveOrg();

  // Step 6: IF Org Found
  try { simulateIFOrgFound(nodeOutputs['Resolve Org']); } catch(e) { errors.push('STOP: ' + e.message); return { id: testCase.id, errors, nodeOutputs }; }

  // Step 7: Load Minimal Context
  nodeOutputs['Load Minimal Context'] = simulateLoadMinimalContext();

  // Step 8: Build Brain Input
  nodeOutputs['Build Brain Input'] = simulateBuildBrainInput(
    nodeOutputs['Privacy Gate Inbound'],
    nodeOutputs['Resolve Org'],
    nodeOutputs['Load Minimal Context']
  );

  // Step 9: Brain Decision (mock LLM response)
  const mockLLMResponse = { choices: [{ message: { content: JSON.stringify(testCase.llm_response) } }] };

  // Step 10: Parse and Validate Brain Contract
  nodeOutputs['Parse and Validate'] = simulateParser(mockLLMResponse, nodeOutputs['Build Brain Input']);
  const decision = nodeOutputs['Parse and Validate'].decision;

  // Step 11: Route by Intent
  const intent = decision.intent;
  nodeOutputs['Route'] = { intent: intent };

  // Step 12: Action Node
  let actionResult;
  switch (intent) {
    case 'create_task':
      actionResult = simulateCreateTask(nodeOutputs['Parse and Validate']);
      break;
    case 'list_tasks': {
      const listResult = simulateListTasks(nodeOutputs['Parse and Validate']);
      const formatResult = simulateFormatTaskList(listResult);
      actionResult = { ...formatResult, issues: [...(listResult.issues || []), ...(formatResult.issues || [])] };
      break;
    }
    case 'create_reminder':
      actionResult = simulateCreateReminder(nodeOutputs['Parse and Validate']);
      break;
    case 'list_reminders': {
      const listRemResult = simulateListReminders(nodeOutputs['Parse and Validate']);
      const formatRemResult = simulateFormatReminderList(listRemResult);
      actionResult = { ...formatRemResult, issues: [...(listRemResult.issues || []), ...(formatRemResult.issues || [])] };
      break;
    }
    default:
      actionResult = { action: intent, note: 'unexpected intent for this test' };
      errors.push('Unexpected intent: ' + intent);
  }
  nodeOutputs['Action'] = actionResult;
  if (actionResult.issues) errors.push(...actionResult.issues);

  // Step 13: Memory Write (NO-OP)
  // Step 14: Privacy Gate Outbound (NO-OP)
  // Step 15: Normalize Client Response
  // Step 16: IF Skip Outbound
  const skipCheck = simulateIFSkipOutbound(nodeOutputs['Parse and Validate']);
  nodeOutputs['Skip Outbound'] = skipCheck;

  // Step 17: Final Output
  nodeOutputs['Final Output'] = simulateFinalOutput(actionResult);

  return { id: testCase.id, name: testCase.name, intent, errors, decision, actionResult, nodeOutputs };
}

// ============================================================
// TEST CASES
// ============================================================

const testCases = [
  // === CREATE TASK ===
  {
    id: 'E2E-CT-01',
    name: 'Create task simplu din Telegram',
    input: 'pune-mi task sa sun furnizorul de echipamente',
    llm_response: {
      version: 'brain-decision-v1', intent: 'create_task', domain: 'cleaning',
      response: 'Am creat task-ul.', debug_summary: 'create task call supplier',
      requires_confirmation: false, requires_clarification: false,
      task_action: { title: 'Sună furnizorul de echipamente' },
      task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'create_task', has_title: true, priority: 'normal', due_type: 'flexible' }
  },
  {
    id: 'E2E-CT-02',
    name: 'Create task cu due_date din Telegram',
    input: 'pune task sa cumpar detergenti pe maine',
    llm_response: {
      version: 'brain-decision-v1', intent: 'create_task', domain: 'cleaning',
      response: 'Am creat task-ul pe mâine.', debug_summary: 'create task buy detergents tomorrow',
      requires_confirmation: false, requires_clarification: false,
      task_action: { title: 'Cumpără detergenți', due_date: '2026-04-04', due_type: 'date' },
      task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'create_task', has_title: true, due_type: 'date', due_at_null: true }
  },
  {
    id: 'E2E-CT-03',
    name: 'Create task urgent cu datetime din Telegram',
    input: 'pune task urgent sa repar centrala maine la 8',
    llm_response: {
      version: 'brain-decision-v1', intent: 'create_task', domain: 'cleaning',
      response: 'Task urgent creat.', debug_summary: 'urgent task fix heating',
      requires_confirmation: false, requires_clarification: false,
      task_action: { title: 'Repară centrala', priority: 'urgent', due_at: '2026-04-04T08:00:00+03:00', due_type: 'datetime' },
      task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'create_task', priority: 'urgent', due_type: 'datetime', due_date_null: true }
  },

  // === LIST TASKS ===
  {
    id: 'E2E-LT-01',
    name: 'List tasks - toate',
    input: 'ce taskuri am?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_tasks', domain: 'general',
      response: 'Iată task-urile tale:', debug_summary: 'list all tasks',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_tasks', filter_scope: 'all' }
  },
  {
    id: 'E2E-LT-02',
    name: 'List tasks - mâine',
    input: 'ce taskuri am maine?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_tasks', domain: 'general',
      response: 'Task-urile de mâine:', debug_summary: 'tomorrow tasks',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_tasks', filter_scope: 'tomorrow' }
  },
  {
    id: 'E2E-LT-03',
    name: 'List tasks - săptămâna asta',
    input: 'ce taskuri am saptamana asta?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_tasks', domain: 'general',
      response: 'Task-urile săptămânii:', debug_summary: 'this week tasks',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_tasks', filter_scope: 'this_week' }
  },
  {
    id: 'E2E-LT-04',
    name: 'List tasks - luna asta',
    input: 'ce taskuri am luna asta?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_tasks', domain: 'general',
      response: 'Task-urile lunii:', debug_summary: 'this month tasks',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_tasks', filter_scope: 'this_month' }
  },
  {
    id: 'E2E-LT-05',
    name: 'List tasks - azi',
    input: 'ce taskuri am azi?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_tasks', domain: 'general',
      response: 'Task-urile de azi:', debug_summary: 'today tasks',
      requires_confirmation: false, requires_clarification: false,
      task_action: { filter_scope: 'today' }, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_tasks', filter_scope: 'today' }
  },

  // === CREATE REMINDER ===
  {
    id: 'E2E-CR-01',
    name: 'Create reminder simplu din Telegram',
    input: 'aminteste-mi maine la 10 sa sun furnizorul',
    llm_response: {
      version: 'brain-decision-v1', intent: 'create_reminder', domain: 'general',
      response: 'Te voi aminti mâine la 10.', debug_summary: 'reminder call supplier tomorrow 10',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [],
      reminder_action: { title: 'Sună furnizorul', remind_at: '2026-04-04T10:00:00+03:00' },
      memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'create_reminder', has_title: true, has_remind_at: true }
  },
  {
    id: 'E2E-CR-02',
    name: 'Create reminder cu descriere din Telegram',
    input: 'adu-mi aminte vineri la 14 sa verific apartamentul 3',
    llm_response: {
      version: 'brain-decision-v1', intent: 'create_reminder', domain: 'airbnb',
      response: 'Te voi aminti vineri la 14.', debug_summary: 'reminder check apt3 friday',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [],
      reminder_action: { title: 'Verifică apartamentul 3', description: 'Apartamentul din zona centrală', remind_at: '2026-04-10T14:00:00+03:00' },
      memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'create_reminder', has_title: true, has_remind_at: true }
  },

  // === LIST REMINDERS ===
  {
    id: 'E2E-LR-01',
    name: 'List reminders - toate',
    input: 'ce remindere am?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_reminders', domain: 'general',
      response: 'Reminderele tale:', debug_summary: 'list all reminders',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_reminders', filter_scope: 'all' }
  },
  {
    id: 'E2E-LR-02',
    name: 'List reminders - mâine',
    input: 'ce remindere am maine?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_reminders', domain: 'general',
      response: 'Reminderele de mâine:', debug_summary: 'tomorrow reminders',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_reminders', filter_scope: 'tomorrow' }
  },
  {
    id: 'E2E-LR-03',
    name: 'List reminders - săptămâna asta',
    input: 'ce remindere am saptamana asta?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_reminders', domain: 'general',
      response: 'Reminderele săptămânii:', debug_summary: 'this week reminders',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_reminders', filter_scope: 'this_week' }
  },
  {
    id: 'E2E-LR-04',
    name: 'List reminders - luna asta',
    input: 'ce remindere am luna asta?',
    llm_response: {
      version: 'brain-decision-v1', intent: 'list_reminders', domain: 'general',
      response: 'Reminderele lunii:', debug_summary: 'this month reminders',
      requires_confirmation: false, requires_clarification: false,
      task_action: null, task_fallback_rules: [], reminder_action: null, memory_action: null, improvement_request: null, memory_writes: []
    },
    expected: { intent: 'list_reminders', filter_scope: 'this_month' }
  }
];

// ============================================================
// VALIDATION & REPORTING
// ============================================================

function validateResult(result, testCase) {
  const checks = [];
  const d = result.decision;
  const e = testCase.expected;

  if (e.intent) checks.push({ field: 'intent', expected: e.intent, actual: d.intent, pass: d.intent === e.intent });
  if (e.filter_scope) {
    const scope = d.task_action?.filter_scope || d.reminder_action?.filter_scope || null;
    checks.push({ field: 'filter_scope', expected: e.filter_scope, actual: scope, pass: scope === e.filter_scope });
  }
  if (e.has_title) {
    const has = !!(d.task_action?.title || d.reminder_action?.title);
    checks.push({ field: 'has_title', expected: true, actual: has, pass: has });
  }
  if (e.has_remind_at) {
    const has = !!d.reminder_action?.remind_at;
    checks.push({ field: 'has_remind_at', expected: true, actual: has, pass: has });
  }
  if (e.priority) checks.push({ field: 'priority', expected: e.priority, actual: d.task_action?.priority, pass: d.task_action?.priority === e.priority });
  if (e.due_type) checks.push({ field: 'due_type', expected: e.due_type, actual: d.task_action?.due_type, pass: d.task_action?.due_type === e.due_type });
  if (e.due_at_null) checks.push({ field: 'due_at_null', expected: true, actual: d.task_action?.due_at === null, pass: d.task_action?.due_at === null });
  if (e.due_date_null) checks.push({ field: 'due_date_null', expected: true, actual: d.task_action?.due_date === null, pass: d.task_action?.due_date === null });

  return checks;
}

// ============================================================
// MAIN
// ============================================================

console.log('═══════════════════════════════════════════════════════════');
console.log('  E2E FLOW SIMULATOR — Tasks & Reminders');
console.log('  Simulating: Telegram → every node → Final Output');
console.log('═══════════════════════════════════════════════════════════\n');

let totalPass = 0, totalFail = 0;
const allIssues = [];

for (const tc of testCases) {
  const result = runE2E(tc);
  const checks = validateResult(result, tc);
  const allChecksPass = checks.every(c => c.pass);
  const hasIssues = result.errors.length > 0;

  const icon = allChecksPass && !hasIssues ? '✅' : allChecksPass ? '⚠️' : '❌';
  console.log(`${icon} ${tc.id}: ${tc.name}`);
  console.log(`   Input: "${tc.input}"`);
  console.log(`   Intent: ${result.intent} | Filter: ${result.decision.task_action?.filter_scope || result.decision.reminder_action?.filter_scope || 'N/A'}`);

  for (const c of checks) {
    if (!c.pass) {
      console.log(`   ❌ ${c.field}: expected=${JSON.stringify(c.expected)} actual=${JSON.stringify(c.actual)}`);
      totalFail++;
    } else {
      totalPass++;
    }
  }

  if (hasIssues) {
    const bugs = result.errors.filter(e => e.startsWith('BUG'));
    const warns = result.errors.filter(e => e.startsWith('WARN') || e.startsWith('INFO'));
    if (bugs.length > 0) {
      console.log('   🐛 BUGS:');
      bugs.forEach(b => console.log('      ' + b));
    }
    if (warns.length > 0) {
      warns.forEach(w => console.log('      ℹ️  ' + w));
    }
    allIssues.push(...result.errors.map(e => ({ testId: tc.id, issue: e })));
  }

  console.log('');
}

console.log('═══════════════════════════════════════════════════════════');
console.log(`CHECKS: ${totalPass + totalFail} total | ✅ ${totalPass} PASS | ❌ ${totalFail} FAIL`);
console.log('═══════════════════════════════════════════════════════════\n');

// Aggregate unique issues
const uniqueBugs = [...new Set(allIssues.filter(i => i.issue.startsWith('BUG')).map(i => i.issue))];
const uniqueWarns = [...new Set(allIssues.filter(i => i.issue.startsWith('WARN') || i.issue.startsWith('INFO')).map(i => i.issue))];

if (uniqueBugs.length > 0) {
  console.log('🐛 UNIQUE BUGS FOUND:');
  uniqueBugs.forEach((b, i) => console.log(`   ${i+1}. ${b}`));
  console.log('');
}
if (uniqueWarns.length > 0) {
  console.log('ℹ️  WARNINGS:');
  uniqueWarns.forEach((w, i) => console.log(`   ${i+1}. ${w}`));
  console.log('');
}
