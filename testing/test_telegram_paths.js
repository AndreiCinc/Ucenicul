#!/usr/bin/env node

/**
 * TELEGRAM PATH SIMULATOR
 * Simulates full workflow paths from Telegram Trigger → Final Output
 * Tests context propagation through every branch
 *
 * USAGE: node testing/test_telegram_paths.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function pass(id, msg) { passed++; console.log(`  ✅ ${id}: ${msg}`); }
function fail(id, msg) { failed++; failures.push(`${id}: ${msg}`); console.log(`  ❌ ${id}: ${msg}`); }

// ============================================================================
// MOCK TELEGRAM TRIGGER OUTPUT (real structure from user)
// ============================================================================

function makeTelegramInput(text, chatId = '5101664726') {
  return {
    update_id: 887425269,
    message: {
      message_id: 307,
      from: { id: parseInt(chatId), is_bot: false, first_name: 'Andrei', last_name: 'Cinc', language_code: 'en' },
      chat: { id: parseInt(chatId), first_name: 'Andrei', last_name: 'Cinc', type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: text
    }
  };
}

// ============================================================================
// MOCK DB RESULTS
// ============================================================================

const MOCK_ORG_TENANT = {
  organization_id: '6cd50498-237b-4ba9-84cb-04b556a34de8',
  organization_name: 'Organizația lui Andrei',
  tenant_id: '622578ca-4200-413d-b17e-1419ee6bc44e',
  tenant_name: 'Curățenie',
  tenant_slug: 'curatenie',
  tenant_vertical: 'cleaning',
  tenant_timezone: 'Europe/Bucharest',
  tenant_currency_code: 'EUR',
  telegram_chat_id: '5101664726'
};

const MOCK_CONTEXT = {
  business: { id: 'biz-001', name: 'Curățenie SRL', type: 'cleaning' },
  tasks: [],
  reminders: [],
  memories: []
};

// ============================================================================
// SIMULATE NODE FUNCTIONS (extracted from workflow Code nodes)
// ============================================================================

function normalizeTelegramInput(telegramPayload) {
  const msg = telegramPayload.message || telegramPayload;
  const chat = msg.chat || {};
  return {
    source: 'telegram',
    organization_id: '',
    tenant_id: '',
    telegram_chat_id: String(chat.id || ''),
    telegram_message_id: msg.message_id || null,
    raw_user_message: (msg.text || '').trim(),
    received_at: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
    test_mode: false
  };
}

function normalizeInput(item) {
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

function privacyGateInbound(item) { return item; } // NO-OP

function resolveOrgTenant(item) {
  // Simulate DB lookup success
  return { ...item, ...MOCK_ORG_TENANT };
}

function loadMinimalContext(item) {
  return { ...item, context: MOCK_CONTEXT };
}

function buildBrainInput(item) {
  // Simplified — in real workflow this builds the LLM prompt
  return item;
}

function brainDecision(item, mockDecision) {
  // Instead of calling OpenAI, we inject the mock decision
  return { ...item, _brain_raw: mockDecision };
}

// Simplified parser that just wraps the mock decision
function parseAndValidateContract(item, mockDecision) {
  return {
    ...item,
    decision: mockDecision,
    _parse_status: 'valid'
  };
}

function insertInboundMessage(item) {
  return { id: 'msg-inbound-001' };
}

function mergeInboundResult(insertResult, parseCtx) {
  return { ...parseCtx, _inbound_message_id: insertResult.id || null };
}

// === BRANCH HANDLERS ===

function noneHandler(parseCtx) {
  return { ...parseCtx, _branch: 'none' };
}

function generalResponseHandler(parseCtx) {
  return parseCtx; // return $input.all()
}

function clarifyHandler(parseCtx) {
  return { ...parseCtx, _branch: 'clarify' };
}

function fallbackToClarify(parseCtx) {
  const d = { ...parseCtx.decision };
  const originalIntent = d.intent || 'undefined';
  d.intent = 'clarify';
  d.debug_summary = 'switch_fallback_unknown_intent_' + originalIntent;
  d.response = d.response || 'Nu am inteles exact ce doresti. Poti reformula?';
  d.requires_clarification = true;
  return { ...parseCtx, decision: d, _branch: 'fallback_to_clarify', _original_unknown_intent: originalIntent };
}

// Mock DB operations
function createTask(parseCtx) { return { id: 'task-001', title: parseCtx.decision.task_action?.title }; }
function mergeCreateTaskResult(dbResult, parseCtx) { return { ...parseCtx, _branch: 'create_task', _db_result: dbResult }; }

function createReminder(parseCtx) { return { id: 'rem-001', title: parseCtx.decision.reminder_action?.title }; }
function mergeCreateReminderResult(dbResult, parseCtx) { return { ...parseCtx, _branch: 'create_reminder', _db_result: dbResult }; }

// n8n PostgreSQL returns each row as a SEPARATE ITEM via $input.all()
// NOT wrapped in .rows — this is the critical difference
function listTasks(parseCtx) {
  // Returns array of items (like n8n $input.all())
  return [
    { id: '42d9b1e3-7933-497d-8db5-7f6002952d', title: 'Finalizează brain-ul', priority: 'normal', status: 'open', due_date: '2026-04-03T00:00:00.000Z', due_at: null, due_type: 'date', created_at: '2026-04-02T17:31:37.056175+00:00' },
    { id: '0be6ed8b-f354-4238-b880-459ab00585', title: 'Finalizează brain-ul', priority: 'normal', status: 'open', due_date: '2026-04-03T00:00:00.000Z', due_at: null, due_type: 'date', created_at: '2026-04-02T17:48:31.505267+00:00' },
    { id: 'e7901384-1722-4c88-9284-6260149ea8', title: 'Cumpără detergenți', priority: 'normal', status: 'open', due_date: '2026-04-06T00:00:00.000Z', due_at: null, due_type: 'date', created_at: '2026-04-02T17:57:14.568802+00:00' }
  ];
}

function formatTaskList(dbResult) {
  const tasks = dbResult.rows || [];
  const formatted = tasks.map(task => ({
    id: task.id, title: task.title, priority: task.priority || 'normal',
    status: task.status, due_type: task.due_type || 'flexible',
    due_date: task.due_date || null, due_at: task.due_at || null
  }));
  return { action: 'list_tasks', tasks: formatted, count: formatted.length };
}

function listReminders(parseCtx) {
  return [
    { id: 'rem-001', title: 'Sună furnizorul', remind_at: '2026-04-05T10:00:00+00:00', status: 'pending' },
    { id: 'rem-002', title: 'Sună-o pe Ana de la detergenți', remind_at: '2026-04-08T09:00:00+00:00', status: 'pending' }
  ];
}

function formatReminderList(dbResult) {
  const reminders = dbResult.rows || [];
  const formatted = reminders.map(r => ({ id: r.id, title: r.title, remind_at: r.remind_at, status: r.status }));
  return { action: 'list_reminders', reminders: formatted, count: formatted.length };
}

// FIXED versions: restore context from Parse node
// n8n: $input.all() returns separate items, $('Parse...').first().json gets context
function formatTaskListFixed(dbItems, parseCtx) {
  // dbItems is an ARRAY of row objects (from $input.all().map(i => i.json))
  const tasks = Array.isArray(dbItems) ? dbItems : [];
  const formatted = tasks.map(task => ({
    id: task.id, title: task.title, priority: task.priority || 'normal',
    status: task.status, due_type: task.due_type || 'flexible',
    due_date: task.due_date || null, due_at: task.due_at || null
  }));
  let responseText = '';
  if (formatted.length === 0) { responseText = 'Nu ai task-uri.'; }
  else { responseText = formatted.map((t, i) => { let line = (i+1) + '. ' + t.title; if (t.priority !== 'normal') line += ' [' + t.priority + ']'; if (t.due_date) line += ' — ' + t.due_date; return line; }).join('\n'); }
  const updatedDecision = Object.assign({}, parseCtx.decision, { response: responseText });
  return { ...parseCtx, decision: updatedDecision, _branch: 'list_tasks', _listed_task_rows: formatted };
}

function formatReminderListFixed(dbItems, parseCtx) {
  const reminders = Array.isArray(dbItems) ? dbItems : [];
  const formatted = reminders.map(r => ({ id: r.id, title: r.title, remind_at: r.remind_at, status: r.status }));
  let responseText = '';
  if (formatted.length === 0) { responseText = 'Nu ai remindere.'; }
  else { responseText = formatted.map((r, i) => { let line = (i+1) + '. ' + r.title; if (r.remind_at) line += ' — ' + r.remind_at; return line; }).join('\n'); }
  const updatedDecision = Object.assign({}, parseCtx.decision, { response: responseText });
  return { ...parseCtx, decision: updatedDecision, _branch: 'list_reminders', _listed_reminder_rows: formatted };
}

function deleteTask(parseCtx) { return [{ id: 'task-001', title: 'Test task' }]; }
function mergeDeleteTaskResult(dbRows, parseCtx) {
  const deletedCount = dbRows.filter(r => r.id).length;
  const deletedTitles = dbRows.filter(r => r.title).map(r => r.title);
  let confirmMsg = '';
  if (deletedCount === 0) confirmMsg = 'Nu am gasit task-ul specificat pentru stergere.';
  else if (deletedCount === 1) confirmMsg = 'Am sters task-ul: ' + (deletedTitles[0] || 'fara titlu') + '.';
  else confirmMsg = 'Am sters ' + deletedCount + ' task-uri.';
  const updatedDecision = Object.assign({}, parseCtx.decision, { response: confirmMsg });
  return { ...parseCtx, decision: updatedDecision, _branch: 'cancel_task', _db_result: dbRows, _deleted_count: deletedCount, _deleted_titles: deletedTitles };
}

function deleteReminder(parseCtx) { return [{ id: 'rem-001', title: 'Test reminder' }]; }
function mergeDeleteReminderResult(dbRows, parseCtx) {
  const deletedCount = dbRows.filter(r => r.id).length;
  const deletedTitles = dbRows.filter(r => r.title).map(r => r.title);
  let confirmMsg = '';
  if (deletedCount === 0) confirmMsg = 'Nu am gasit reminderul specificat pentru stergere.';
  else if (deletedCount === 1) confirmMsg = 'Am sters reminderul: ' + (deletedTitles[0] || 'fara titlu') + '.';
  else confirmMsg = 'Am sters ' + deletedCount + ' remindere.';
  const updatedDecision = Object.assign({}, parseCtx.decision, { response: confirmMsg });
  return { ...parseCtx, decision: updatedDecision, _branch: 'cancel_reminder', _db_result: dbRows, _deleted_count: deletedCount, _deleted_titles: deletedTitles };
}

function saveImprovement(parseCtx) { return { id: 'imp-001' }; }
function mergeSaveImprovementResult(dbResult, parseCtx) { return { ...parseCtx, _branch: 'save_improvement_request', _db_result: dbResult }; }

// === MEMORY WRITE GATE (simplified) ===
function ifHasMemoryWrites(item) {
  const mw = item.decision?.memory_writes || [];
  return Array.isArray(mw) && mw.length > 0;
}

// === PRIVACY GATE OUTBOUND ===
function privacyGateOutbound(item) {
  return {
    organization_id: item.organization_id,
    organization_name: item.organization_name,
    tenant_id: item.tenant_id,
    tenant_name: item.tenant_name,
    tenant_slug: item.tenant_slug || '',
    tenant_vertical: item.tenant_vertical || '',
    tenant_timezone: item.tenant_timezone || 'Europe/Bucharest',
    tenant_currency_code: item.tenant_currency_code || 'RON',
    telegram_chat_id: item.telegram_chat_id,
    telegram_message_id: item.telegram_message_id,
    raw_user_message: item.raw_user_message,
    received_at: item.received_at,
    test_mode: item.test_mode,
    source: item.source,
    context: item.context,
    decision: item.decision,
    _branch: item._branch || null,
    _listed_task_rows: item._listed_task_rows || null,
    _listed_reminder_rows: item._listed_reminder_rows || null,
    _original_unknown_intent: item._original_unknown_intent || null
  };
}

// === NORMALIZE CLIENT RESPONSE (simplified critical parts) ===
function normalizeClientResponse(item) {
  const decision = item.decision || {};
  const intent = decision.intent;
  const branch = item._branch || null;
  let finalResponse = decision.response || '';
  let responseNormalized = false;

  if (branch === 'list_tasks') {
    finalResponse = decision.response || '';
  } else if (branch === 'list_reminders') {
    finalResponse = decision.response || '';
  } else if (intent === 'create_task') {
    const ta = decision.task_action || {};
    let msg = 'Am creat task-ul: ' + (ta.title || 'fara titlu') + '.';
    if (ta.due_date) msg += ' Scadent: ' + ta.due_date + '.';
    if (ta.priority && ta.priority !== 'normal') msg += ' Prioritate: ' + ta.priority + '.';
    finalResponse = msg;
    responseNormalized = true;
  } else if (intent === 'create_reminder') {
    const ra = decision.reminder_action || {};
    let msg = 'Am setat reminderul: ' + (ra.title || 'fara titlu') + '.';
    if (ra.remind_at) msg += ' Te voi notifica la: ' + ra.remind_at + '.';
    finalResponse = msg;
    responseNormalized = true;
  } else if (intent === 'clarify' || branch === 'fallback_to_clarify') {
    finalResponse = 'Nu am inteles exact ce doresti. Poti reformula?';
    responseNormalized = true;
  } else if (intent === 'save_improvement_request') {
    finalResponse = 'Am notat sugestia ta de imbunatatire.';
    responseNormalized = true;
  } else if (intent === 'none') {
    finalResponse = '';
  } else if (intent === 'general_response') {
    finalResponse = decision.response || '';
  }

  const updatedDecision = Object.assign({}, decision, { response: finalResponse });
  return Object.assign({}, item, { decision: updatedDecision, _response_normalized: responseNormalized, _memory_ack_appended: false });
}

// === IF SKIP OUTBOUND ===
function ifSkipOutbound(item) {
  const intent = item.decision?.intent;
  return intent !== 'none'; // true = insert outbound + send telegram, false = skip to Final Output
}

// ============================================================================
// FULL PIPELINE SIMULATION
// ============================================================================

function runPipeline(testId, text, mockDecision, branchFn) {
  const errors = [];

  // 1. Telegram Trigger
  const telegramRaw = makeTelegramInput(text);

  // 2. Normalize Telegram Input
  const normalized1 = normalizeTelegramInput(telegramRaw);

  // 3. Normalize Input
  const normalized2 = normalizeInput(normalized1);

  // 4. Privacy Gate Inbound
  const afterPrivacy = privacyGateInbound(normalized2);

  // 5. Resolve Org + Tenant
  const resolved = resolveOrgTenant(afterPrivacy);

  // 6. Load Minimal Context
  const withContext = loadMinimalContext(resolved);

  // 7-8. Brain Decision (mocked)
  const parseCtx = parseAndValidateContract(withContext, mockDecision);

  // 9. Insert Inbound Message
  const inboundResult = insertInboundMessage(parseCtx);
  const afterInbound = mergeInboundResult(inboundResult, parseCtx);

  // 10. Route by Intent → Branch handler
  const afterBranch = branchFn(afterInbound);

  // 11. IF Has Memory Writes (skip for simplicity — route to NO path)
  const hasMemWrites = ifHasMemoryWrites(afterBranch);
  const afterMemory = afterBranch; // simplified — no memory writes in these tests

  // 12. Privacy Gate Outbound
  const afterPrivacyOut = privacyGateOutbound(afterMemory);

  // 13. Normalize Client Response
  const afterNormalize = normalizeClientResponse(afterPrivacyOut);

  // === CRITICAL CHECKS ===

  // Check context propagation at Privacy Gate Outbound
  if (!afterPrivacyOut.organization_id) errors.push('organization_id LOST at Privacy Gate Outbound');
  if (!afterPrivacyOut.tenant_id) errors.push('tenant_id LOST at Privacy Gate Outbound');
  if (!afterPrivacyOut.telegram_chat_id) errors.push('telegram_chat_id LOST at Privacy Gate Outbound');
  if (!afterPrivacyOut.decision) errors.push('decision LOST at Privacy Gate Outbound');
  if (!afterPrivacyOut.decision?.intent) errors.push('decision.intent LOST at Privacy Gate Outbound');

  // Check context at Normalize Client Response output
  if (!afterNormalize.organization_id) errors.push('organization_id LOST at Normalize Client Response');
  if (!afterNormalize.tenant_id) errors.push('tenant_id LOST at Normalize Client Response');
  if (!afterNormalize.telegram_chat_id) errors.push('telegram_chat_id LOST at Normalize Client Response');

  // 14. IF Skip Outbound
  const shouldInsertOutbound = ifSkipOutbound(afterNormalize);
  const intent = afterNormalize.decision?.intent;

  if (intent === 'none') {
    if (shouldInsertOutbound) errors.push('IF Skip Outbound: should be FALSE for none intent, got TRUE');
  } else {
    if (!shouldInsertOutbound) errors.push('IF Skip Outbound: should be TRUE for ' + intent + ' intent, got FALSE');

    // Check Insert Outbound Message would have valid data
    const orgId = afterNormalize.organization_id;
    const tenantId = afterNormalize.tenant_id;
    const response = afterNormalize.decision?.response;
    const chatId = afterNormalize.telegram_chat_id;

    if (!orgId) errors.push('INSERT outbound would fail: organization_id is null');
    if (!tenantId) errors.push('INSERT outbound would fail: tenant_id is null');
    if (response === undefined || response === null) errors.push('INSERT outbound: response is null/undefined');
  }

  // Check Telegram Send would have valid data
  if (shouldInsertOutbound && !afterNormalize.test_mode) {
    if (!afterNormalize.telegram_chat_id) errors.push('Telegram Send: chat_id missing');
    if (!afterNormalize.decision?.response && intent !== 'none') errors.push('Telegram Send: response empty for ' + intent);
  }

  return errors;
}

// ============================================================================
// TEST CASES
// ============================================================================

console.log('\n🔗 TELEGRAM PATH SIMULATOR');
console.log('='.repeat(60));

// --- TEST 1: create_task ---
console.log('\n--- create_task path ---');
{
  const errs = runPipeline('T1', 'Creează un task urgent sună-l pe Ion mâine', {
    version: 'brain-decision-v1', intent: 'create_task', domain: 'operations',
    response: 'Am creat task-ul.', debug_summary: 'task_create',
    task_action: { title: 'Sună-l pe Ion', priority: 'urgent', due_type: 'date', due_date: '2026-04-05' },
    reminder_action: null, memory_action: null, memory_writes: []
  }, (ctx) => mergeCreateTaskResult(createTask(ctx), ctx));
  if (errs.length === 0) pass('T1', 'create_task — context intact through full pipeline');
  else errs.forEach(e => fail('T1', e));
}

// --- TEST 2: create_reminder ---
console.log('\n--- create_reminder path ---');
{
  const errs = runPipeline('T2', 'Adu-mi aminte mâine la 10 să sun furnizorul', {
    version: 'brain-decision-v1', intent: 'create_reminder', domain: 'operations',
    response: 'Am setat reminderul.', debug_summary: 'reminder_create',
    task_action: null, reminder_action: { title: 'Sună furnizorul', remind_at: '2026-04-05T10:00:00+03:00' },
    memory_action: null, memory_writes: []
  }, (ctx) => mergeCreateReminderResult(createReminder(ctx), ctx));
  if (errs.length === 0) pass('T2', 'create_reminder — context intact through full pipeline');
  else errs.forEach(e => fail('T2', e));
}

// --- TEST 3: list_tasks ---
console.log('\n--- list_tasks path ---');
{
  const errs = runPipeline('T3', 'Ce task-uri am azi?', {
    version: 'brain-decision-v1', intent: 'list_tasks', domain: 'operations',
    response: 'Iată task-urile tale.', debug_summary: 'list_tasks_today',
    task_action: { filter_scope: 'today' }, reminder_action: null, memory_action: null, memory_writes: []
  }, (ctx) => {
    // n8n: List Tasks (PostgreSQL) returns separate items
    // Format Task List reads $input.all() for rows + $('Parse...') for context
    const dbItems = listTasks(ctx);
    const formatted = formatTaskListFixed(dbItems, ctx);
    return formatted;
  });
  if (errs.length === 0) pass('T3', 'list_tasks — context intact through full pipeline');
  else errs.forEach(e => fail('T3', e));
}

// --- TEST 4: list_reminders ---
console.log('\n--- list_reminders path ---');
{
  const errs = runPipeline('T4', 'Ce remindere am mâine?', {
    version: 'brain-decision-v1', intent: 'list_reminders', domain: 'operations',
    response: 'Iată reminderele.', debug_summary: 'list_reminders_tomorrow',
    task_action: null, reminder_action: { filter_scope: 'tomorrow' }, memory_action: null, memory_writes: []
  }, (ctx) => {
    // n8n: List Reminders (PostgreSQL) returns separate items
    const dbItems = listReminders(ctx);
    const formatted = formatReminderListFixed(dbItems, ctx);
    return formatted;
  });
  if (errs.length === 0) pass('T4', 'list_reminders — context intact through full pipeline');
  else errs.forEach(e => fail('T4', e));
}

// --- TEST 5: general_response ---
console.log('\n--- general_response path ---');
{
  const errs = runPipeline('T5', 'Bună! Cum merge?', {
    version: 'brain-decision-v1', intent: 'general_response', domain: 'general',
    response: 'Bună! Sunt aici să te ajut.', debug_summary: 'greeting',
    task_action: null, reminder_action: null, memory_action: null, memory_writes: []
  }, (ctx) => generalResponseHandler(ctx));
  if (errs.length === 0) pass('T5', 'general_response — context intact through full pipeline');
  else errs.forEach(e => fail('T5', e));
}

// --- TEST 6: none ---
console.log('\n--- none path ---');
{
  const errs = runPipeline('T6', 'OK', {
    version: 'brain-decision-v1', intent: 'none', domain: 'general',
    response: '', debug_summary: 'acknowledgment',
    task_action: null, reminder_action: null, memory_action: null, memory_writes: []
  }, (ctx) => noneHandler(ctx));
  if (errs.length === 0) pass('T6', 'none — correctly skips outbound');
  else errs.forEach(e => fail('T6', e));
}

// --- TEST 7: clarify ---
console.log('\n--- clarify path ---');
{
  const errs = runPipeline('T7', 'Vreau ceva', {
    version: 'brain-decision-v1', intent: 'clarify', domain: 'general',
    response: 'Poți fi mai specific?', debug_summary: 'ambiguous',
    task_action: null, reminder_action: null, memory_action: null, memory_writes: []
  }, (ctx) => clarifyHandler(ctx));
  if (errs.length === 0) pass('T7', 'clarify — context intact through full pipeline');
  else errs.forEach(e => fail('T7', e));
}

// --- TEST 8: save_improvement_request ---
console.log('\n--- save_improvement_request path ---');
{
  const errs = runPipeline('T8', 'Ar fi util să ai și calendar sync', {
    version: 'brain-decision-v1', intent: 'save_improvement_request', domain: 'system',
    response: 'Am notat.', debug_summary: 'feature_request',
    task_action: null, reminder_action: null, memory_action: null,
    improvement_request: { requested_feature: 'calendar sync', user_message: 'Ar fi util să ai și calendar sync' },
    memory_writes: []
  }, (ctx) => mergeSaveImprovementResult(saveImprovement(ctx), ctx));
  if (errs.length === 0) pass('T8', 'save_improvement_request — context intact through full pipeline');
  else errs.forEach(e => fail('T8', e));
}

// --- TEST 9: cancel_task ---
console.log('\n--- cancel_task path ---');
{
  const errs = runPipeline('T9', 'Șterge task-ul "Sună-l pe Ion"', {
    version: 'brain-decision-v1', intent: 'cancel_task', domain: 'operations',
    response: 'Șterg task-ul.', debug_summary: 'delete_task',
    task_action: { title: 'Sună-l pe Ion' }, reminder_action: null, memory_action: null, memory_writes: []
  }, (ctx) => mergeDeleteTaskResult(deleteTask(ctx), ctx));
  if (errs.length === 0) pass('T9', 'cancel_task — context intact through full pipeline');
  else errs.forEach(e => fail('T9', e));
}

// --- TEST 10: cancel_reminder ---
console.log('\n--- cancel_reminder path ---');
{
  const errs = runPipeline('T10', 'Șterge reminderul "Sună furnizorul"', {
    version: 'brain-decision-v1', intent: 'cancel_reminder', domain: 'operations',
    response: 'Șterg reminderul.', debug_summary: 'delete_reminder',
    reminder_action: { title: 'Sună furnizorul' }, task_action: null, memory_action: null, memory_writes: []
  }, (ctx) => mergeDeleteReminderResult(deleteReminder(ctx), ctx));
  if (errs.length === 0) pass('T10', 'cancel_reminder — context intact through full pipeline');
  else errs.forEach(e => fail('T10', e));
}

// --- TEST 11: fallback_to_clarify ---
console.log('\n--- fallback (unknown intent) path ---');
{
  const errs = runPipeline('T11', 'xyzabc nonsense', {
    version: 'brain-decision-v1', intent: 'weird_unknown', domain: 'general',
    response: '', debug_summary: 'unknown',
    task_action: null, reminder_action: null, memory_action: null, memory_writes: []
  }, (ctx) => fallbackToClarify(ctx));
  if (errs.length === 0) pass('T11', 'fallback — context intact, intent rewritten to clarify');
  else errs.forEach(e => fail('T11', e));
}

// --- TEST 12: create_task with memory_writes ---
console.log('\n--- create_task + memory writes path ---');
{
  const errs = runPipeline('T12', 'Am 3 apartamente pe Airbnb, trebuie sa le curat', {
    version: 'brain-decision-v1', intent: 'create_task', domain: 'airbnb',
    response: 'Am creat task-ul.', debug_summary: 'task_with_memory',
    task_action: { title: 'Curăță apartamentele', priority: 'normal', due_type: 'flexible' },
    reminder_action: null, memory_action: null,
    memory_writes: [{ type: 'fact', category: 'business_profile', content: 'Are 3 apartamente Airbnb' }]
  }, (ctx) => mergeCreateTaskResult(createTask(ctx), ctx));
  if (errs.length === 0) pass('T12', 'create_task + memory — context intact');
  else errs.forEach(e => fail('T12', e));
}

// --- TEST 13: search_memory (placeholder) ---
console.log('\n--- search_memory (placeholder) path ---');
{
  const errs = runPipeline('T13', 'Ce știi despre clienții mei?', {
    version: 'brain-decision-v1', intent: 'search_memory', domain: 'general',
    response: 'Caut în memorie...', debug_summary: 'search_memory',
    task_action: null, reminder_action: null, memory_action: { query: 'clienți' }, memory_writes: []
  }, (ctx) => {
    // Search Memory Placeholder does same as None — reads from Parse ctx
    return { ...ctx, _branch: 'search_memory' };
  });
  if (errs.length === 0) pass('T13', 'search_memory — context intact');
  else errs.forEach(e => fail('T13', e));
}

// --- TEST 14: update_task (placeholder) ---
console.log('\n--- update_task (placeholder) path ---');
{
  const errs = runPipeline('T14', 'Schimbă prioritatea task-ului X la urgent', {
    version: 'brain-decision-v1', intent: 'update_task', domain: 'operations',
    response: 'Placeholder — update_task nu e implementat încă.', debug_summary: 'update_task_placeholder',
    task_action: { title: 'X', priority: 'urgent' }, reminder_action: null, memory_action: null, memory_writes: []
  }, (ctx) => {
    // Update Task Placeholder reads from Parse ctx
    return { ...ctx, _branch: 'update_task' };
  });
  if (errs.length === 0) pass('T14', 'update_task placeholder — context intact');
  else errs.forEach(e => fail('T14', e));
}

// --- TEST 15: list_tasks response contains actual task titles ---
console.log('\n--- list_tasks response quality ---');
{
  const errs = [];
  const telegramRaw = makeTelegramInput('Ce task-uri am?');
  const normalized1 = normalizeTelegramInput(telegramRaw);
  const normalized2 = normalizeInput(normalized1);
  const resolved = resolveOrgTenant(privacyGateInbound(normalized2));
  const withContext = loadMinimalContext(resolved);
  const parseCtx = parseAndValidateContract(withContext, {
    version: 'brain-decision-v1', intent: 'list_tasks', domain: 'operations',
    response: 'Iată task-urile.', debug_summary: 'list_all',
    task_action: { filter_scope: 'all' }, reminder_action: null, memory_action: null, memory_writes: []
  });
  const inboundResult = insertInboundMessage(parseCtx);
  const afterInbound = mergeInboundResult(inboundResult, parseCtx);
  const dbItems = listTasks(afterInbound);
  const afterBranch = formatTaskListFixed(dbItems, afterInbound);
  const afterPrivacyOut = privacyGateOutbound(afterBranch);
  const afterNormalize = normalizeClientResponse(afterPrivacyOut);
  const response = afterNormalize.decision?.response || '';

  if (!response.includes('Finalizează brain-ul')) errs.push('Response missing task title "Finalizează brain-ul"');
  if (!response.includes('Cumpără detergenți')) errs.push('Response missing task title "Cumpără detergenți"');
  if (response === 'Nu ai task-uri.') errs.push('Response says "Nu ai task-uri" but DB has 3 tasks');
  if (!response.includes('1.')) errs.push('Response not numbered');

  if (errs.length === 0) pass('T15', 'list_tasks response contains real task titles: ' + response.split('\n')[0] + '...');
  else errs.forEach(e => fail('T15', e));
}

// --- TEST 16: list_reminders response contains actual reminder titles ---
console.log('\n--- list_reminders response quality ---');
{
  const errs = [];
  const telegramRaw = makeTelegramInput('Ce remindere am?');
  const normalized1 = normalizeTelegramInput(telegramRaw);
  const normalized2 = normalizeInput(normalized1);
  const resolved = resolveOrgTenant(privacyGateInbound(normalized2));
  const withContext = loadMinimalContext(resolved);
  const parseCtx = parseAndValidateContract(withContext, {
    version: 'brain-decision-v1', intent: 'list_reminders', domain: 'operations',
    response: 'Iată reminderele.', debug_summary: 'list_all_reminders',
    task_action: null, reminder_action: { filter_scope: 'all' }, memory_action: null, memory_writes: []
  });
  const inboundResult = insertInboundMessage(parseCtx);
  const afterInbound = mergeInboundResult(inboundResult, parseCtx);
  const dbItems = listReminders(afterInbound);
  const afterBranch = formatReminderListFixed(dbItems, afterInbound);
  const afterPrivacyOut = privacyGateOutbound(afterBranch);
  const afterNormalize = normalizeClientResponse(afterPrivacyOut);
  const response = afterNormalize.decision?.response || '';

  if (!response.includes('Sună furnizorul')) errs.push('Response missing "Sună furnizorul"');
  if (!response.includes('Ana')) errs.push('Response missing "Ana"');
  if (response === 'Nu ai remindere.') errs.push('Response says "Nu ai remindere" but DB has 2 reminders');

  if (errs.length === 0) pass('T16', 'list_reminders response contains real titles: ' + response.split('\n')[0] + '...');
  else errs.forEach(e => fail('T16', e));
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`\n📋 TELEGRAM PATH TESTS: ${passed} passed, ${failed} failed\n`);

if (failures.length > 0) {
  console.log('❌ FAILURES (context lost = will crash in n8n):');
  failures.forEach(f => console.log(`   - ${f}`));
  console.log('');
}

if (failed === 0) {
  console.log('🟢 ALL TELEGRAM PATHS PASS — context propagates correctly.\n');
} else {
  console.log('🔴 CONTEXT PROPAGATION BUGS FOUND — fix before deploying.\n');
}

process.exit(failed > 0 ? 1 : 0);
