/**
 * E2E Test for Delete Tasks & Delete Reminders
 * Tests the full flow: LLM response → Parser → Intent routing → SQL generation → Merge → Response
 *
 * USAGE: node test_e2e_delete.js
 *
 * Does NOT require a live database — validates SQL construction and merge logic.
 */

const fs = require('fs');
const path = require('path');

// === LOAD FIXTURE ===
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test_context.json'), 'utf8'));

// === BUILD PARSER (same as test_parser.js) ===
function buildParser() {
  const wrapped = `
(function(httpResponse, ctx) {
  const VALID_INTENTS = [
    'create_task', 'update_task', 'complete_task', 'cancel_task', 'list_tasks',
    'create_reminder', 'update_reminder', 'cancel_reminder', 'list_reminders',
    'search_memory', 'general_response', 'clarify', 'save_improvement_request', 'none'
  ];
  const VALID_TASK_PRIORITIES = ['urgent', 'high', 'normal', 'low'];
  const VALID_TASK_DUE_TYPES = ['flexible', 'date', 'datetime'];
  const VALID_FALLBACK_DUE_TYPES = ['date', 'datetime'];
  const VALID_FILTER_SCOPES = [
    'all', 'today', 'tomorrow', 'day_after_tomorrow',
    'overdue', 'urgent', 'high', 'this_week', 'this_month'
  ];
  const VALID_MEMORY_TYPES = ['fact', 'insight', 'advice'];
  const VALID_MEMORY_CATEGORIES = ['business_profile', 'customer_market', 'growth_context', 'entrepreneur_profile', 'relationship_history', 'operational_patterns', 'preferences', 'constraints'];

  function makeClarify(reason, responseText) {
    return {
      version: 'brain-decision-v1',
      intent: 'clarify',
      domain: 'general',
      response: responseText || 'Nu am înțeles exact ce dorești. Poți reformula?',
      debug_summary: reason,
      requires_confirmation: false,
      requires_clarification: true,
      task_action: null,
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    };
  }

  function normalizeTaskAction(value) {
    if (!value || typeof value !== 'object') return null;
    return {
      id: value.id || null,
      title: typeof value.title === 'string' && value.title.trim() !== '' ? value.title.trim() : null,
      description: typeof value.description === 'string' && value.description.trim() !== '' ? value.description.trim() : null,
      priority: VALID_TASK_PRIORITIES.includes(value.priority) ? value.priority : null,
      due_type: VALID_TASK_DUE_TYPES.includes(value.due_type) ? value.due_type : null,
      due_date: typeof value.due_date === 'string' && value.due_date.trim() !== '' ? value.due_date.trim() : null,
      due_at: typeof value.due_at === 'string' && value.due_at.trim() !== '' ? value.due_at.trim() : null,
      filter_scope: VALID_FILTER_SCOPES.includes(value.filter_scope) ? value.filter_scope : null
    };
  }

  function normalizeReminderAction(value) {
    if (!value || typeof value !== 'object') return null;
    return {
      id: value.id || null,
      title: typeof value.title === 'string' && value.title.trim() !== '' ? value.title.trim() : null,
      description: typeof value.description === 'string' && value.description.trim() !== '' ? value.description.trim() : null,
      remind_at: typeof value.remind_at === 'string' && value.remind_at.trim() !== '' ? value.remind_at.trim() : null,
      filter_scope: VALID_FILTER_SCOPES.includes(value.filter_scope) ? value.filter_scope : null
    };
  }

  function normalizeMemoryAction(value) {
    if (!value || typeof value !== 'object') return null;
    return {
      query: typeof value.query === 'string' ? value.query.trim() : '',
      category_filter: typeof value.category_filter === 'string' && value.category_filter.trim() !== '' ? value.category_filter.trim() : null
    };
  }

  function normalizeImprovementRequest(value) {
    if (!value || typeof value !== 'object') return null;
    return {
      requested_feature: typeof value.requested_feature === 'string' ? value.requested_feature.trim() : '',
      user_message: typeof value.user_message === 'string' && value.user_message.trim() !== '' ? value.user_message.trim() : null
    };
  }

  function inferFilterScopeFromMessage(msg) {
    const text = (msg || '').toLowerCase();
    if (text.includes('poimaine') || text.includes('poimâine')) return 'day_after_tomorrow';
    if (text.includes('maine') || text.includes('mâine') || text.includes('miine')) return 'tomorrow';
    if (text.includes('azi') || text.includes('astazi') || text.includes('astăzi')) return 'today';
    if (text.includes('restant') || text.includes('restante') || text.includes('întârzi') || text.includes('intarzi') || text.includes('intarziat')) return 'overdue';
    if (text.includes('urgent') || text.includes('urgente')) return 'urgent';
    if (text.includes('high') || text.includes('prioritate mare')) return 'high';
    if (text.includes('saptamana asta') || text.includes('săptămâna asta') || text.includes('saptamina asta') || text.includes('săptămîna asta')) return 'this_week';
    if (text.includes('luna asta')) return 'this_month';
    return 'all';
  }

  function messageImpliesTaskPreference(msg) {
    const text = (msg || '').toLowerCase();
    return (
      text.includes('trebuie sa') || text.includes('trebuie să') ||
      text.includes('trb sa') || text.includes('trb să') ||
      text.includes('am de') ||
      text.includes('pune-mi task') || text.includes('pune task') ||
      text.includes('creeaza task') || text.includes('creează task') ||
      text.includes('creeaza-mi task') || text.includes('creează-mi task') ||
      text.includes('fa task') || text.includes('fă task') ||
      text.includes('fa-mi task') || text.includes('fă-mi task') ||
      text.includes('adauga task') || text.includes('adaugă task')
    );
  }

  function messageImpliesReminderPreference(msg) {
    const text = (msg || '').toLowerCase();
    return (
      text.includes('adu-mi aminte') || text.includes('adumi aminte') ||
      text.includes('amintește-mi') || text.includes('aminteste-mi') || text.includes('amintestemi') ||
      text.includes('reamintește-mi') || text.includes('reaminteste-mi') || text.includes('reamintestemi') ||
      text.includes('nu uita sa-mi amintesti') || text.includes('nu uita să-mi amintești') ||
      text.includes('sa nu uit') || text.includes('să nu uit') || text.includes('sanuuit') ||
      text.includes('reminder')
    );
  }

  function buildTaskActionFromReminder(reminderAction) {
    if (!reminderAction || !reminderAction.title) return null;
    return normalizeTaskAction({
      title: reminderAction.title,
      description: reminderAction.description || null,
      priority: 'normal',
      due_type: reminderAction.remind_at ? 'datetime' : 'flexible',
      due_at: reminderAction.remind_at || null
    });
  }

  let decision;
  try {
    let text = '';
    if (httpResponse.choices && httpResponse.choices[0]) {
      text = httpResponse.choices[0].message.content || '';
    } else if (typeof httpResponse === 'string') {
      text = httpResponse;
    } else {
      text = JSON.stringify(httpResponse);
    }
    text = text.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, '').trim();
    decision = JSON.parse(text);

    if (decision.task !== undefined || decision.reminder !== undefined || decision.memory_candidate !== undefined || decision.response_text !== undefined || decision.confidence !== undefined) {
      decision = makeClarify('old_contract_fields_detected');
    } else if (decision.version !== 'brain-decision-v1') {
      decision = makeClarify('wrong_version_' + String(decision.version));
    } else if (!VALID_INTENTS.includes(decision.intent)) {
      decision = makeClarify('invalid_intent_' + String(decision.intent));
    } else {
      decision.domain = typeof decision.domain === 'string' && decision.domain.trim() !== '' ? decision.domain.trim() : 'general';
      decision.response = typeof decision.response === 'string' ? decision.response.trim() : '';
      decision.debug_summary = typeof decision.debug_summary === 'string' ? decision.debug_summary.trim() : '';
      decision.requires_confirmation = !!decision.requires_confirmation;
      decision.requires_clarification = !!decision.requires_clarification;
      decision.task_action = normalizeTaskAction(decision.task_action);
      decision.reminder_action = normalizeReminderAction(decision.reminder_action);
      decision.memory_action = normalizeMemoryAction(decision.memory_action);
      decision.improvement_request = normalizeImprovementRequest(decision.improvement_request);
      decision.task_fallback_rules = Array.isArray(decision.task_fallback_rules) ? decision.task_fallback_rules : [];
      decision.task_fallback_rules = decision.task_fallback_rules.filter(function(rule) {
        if (!rule || typeof rule !== 'object') return false;
        if (rule.condition !== 'not_completed') return false;
        if (typeof rule.title !== 'string' || rule.title.trim() === '') return false;
        if (!VALID_TASK_PRIORITIES.includes(rule.priority)) return false;
        if (!VALID_FALLBACK_DUE_TYPES.includes(rule.due_type)) return false;
        if (rule.due_type === 'date' && (typeof rule.due_date !== 'string' || rule.due_date.trim() === '')) return false;
        if (rule.due_type === 'datetime' && (typeof rule.due_at !== 'string' || rule.due_at.trim() === '')) return false;
        return true;
      });
      decision.memory_writes = Array.isArray(decision.memory_writes) ? decision.memory_writes : [];
      decision.memory_writes = decision.memory_writes.filter(function(item) {
        if (!item || typeof item !== 'object') return false;
        if (!VALID_MEMORY_TYPES.includes(item.type)) return false;
        if (!VALID_MEMORY_CATEGORIES.includes(item.category)) return false;
        if (typeof item.content !== 'string' || item.content.trim() === '') return false;
        return true;
      });

      if (decision.intent === 'list_tasks') {
        if (!decision.task_action) {
          decision.task_action = normalizeTaskAction({ filter_scope: inferFilterScopeFromMessage(ctx.raw_user_message) });
        } else if (!decision.task_action.filter_scope) {
          decision.task_action.filter_scope = inferFilterScopeFromMessage(ctx.raw_user_message);
        }
      }
      if (decision.intent === 'list_reminders') {
        if (!decision.reminder_action) {
          decision.reminder_action = normalizeReminderAction({ filter_scope: inferFilterScopeFromMessage(ctx.raw_user_message) });
        } else if (!decision.reminder_action.filter_scope) {
          decision.reminder_action.filter_scope = inferFilterScopeFromMessage(ctx.raw_user_message);
        }
      }

      const hasTaskLanguage = messageImpliesTaskPreference(ctx.raw_user_message);
      const hasReminderLanguage = messageImpliesReminderPreference(ctx.raw_user_message);
      if (hasTaskLanguage && hasReminderLanguage) {
        if (decision.intent === 'create_reminder') decision.intent = 'create_task';
        if (decision.intent === 'create_task' && (!decision.task_action || !decision.task_action.title) && decision.reminder_action && decision.reminder_action.title) {
          decision.task_action = buildTaskActionFromReminder(decision.reminder_action);
        }
        if (decision.intent === 'create_task') decision.reminder_action = null;
      }

      if (decision.intent === 'create_task') {
        if (!decision.task_action || !decision.task_action.title) {
          decision = makeClarify('missing_task_action_title_for_create_task');
        } else {
          if (!decision.task_action.priority) decision.task_action.priority = 'normal';
          if (!decision.task_action.due_type) {
            if (decision.task_action.due_at) decision.task_action.due_type = 'datetime';
            else if (decision.task_action.due_date) decision.task_action.due_type = 'date';
            else decision.task_action.due_type = 'flexible';
          }
          if (decision.task_action.due_type === 'date') decision.task_action.due_at = null;
          if (decision.task_action.due_type === 'datetime') decision.task_action.due_date = null;
          decision.reminder_action = null;
        }
      }
      if (decision.intent === 'update_task' || decision.intent === 'complete_task' || decision.intent === 'cancel_task') {
        if (!decision.task_action) decision = makeClarify('missing_task_action_for_' + decision.intent);
      }
      if (decision.intent === 'create_reminder') {
        if (!decision.reminder_action || !decision.reminder_action.title || !decision.reminder_action.remind_at) {
          decision = makeClarify('missing_reminder_action_for_create_reminder');
        } else {
          if (decision.task_action && !hasTaskLanguage) {
            decision = makeClarify('create_reminder_should_not_also_create_task', 'Vrei să creez un reminder sau un task pentru asta?');
          } else {
            decision.task_action = null;
            decision.task_fallback_rules = [];
          }
        }
      }
      if (decision.intent === 'update_reminder' || decision.intent === 'cancel_reminder') {
        if (!decision.reminder_action) decision = makeClarify('missing_reminder_action_for_' + decision.intent);
      }
      if (decision.intent === 'search_memory') {
        if (!decision.memory_action || !decision.memory_action.query || decision.memory_action.query.trim() === '') {
          decision = makeClarify('missing_memory_action_query_for_search_memory');
        }
      }
      if (decision.intent === 'save_improvement_request') {
        if (!decision.improvement_request || !decision.improvement_request.requested_feature || decision.improvement_request.requested_feature.trim() === '') {
          decision = makeClarify('missing_improvement_request_feature');
        }
      }
      if (decision.intent === 'none' || decision.intent === 'general_response') {
        decision.task_action = null;
        decision.task_fallback_rules = [];
        decision.reminder_action = null;
        decision.memory_action = null;
        decision.improvement_request = null;
      }
    }
  } catch (e) {
    decision = makeClarify('parse_error_' + e.message.substring(0, 100));
  }
  return decision;
})
`;
  return eval(wrapped);
}

// === SIMULATE SQL GENERATION (what the PostgreSQL node would receive) ===

function simulateDeleteTaskSQL(decision, tenantId) {
  const ta = decision.task_action || {};
  const params = [
    tenantId,
    ta.id || '',
    ta.title || '',
    ta.filter_scope || ''
  ];

  // Determine which match strategy
  let matchType = 'none';
  if (params[1] !== '') matchType = 'by_id';
  else if (params[2] !== '') matchType = 'by_title_ilike';
  else if (params[3] !== '') matchType = 'by_filter_scope_batch';

  return { params, matchType, query: 'DELETE FROM tasks WHERE ...' };
}

function simulateDeleteReminderSQL(decision, tenantId) {
  const ra = decision.reminder_action || {};
  const params = [
    tenantId,
    ra.id || '',
    ra.title || '',
    ra.filter_scope || ''
  ];

  let matchType = 'none';
  if (params[1] !== '') matchType = 'by_id';
  else if (params[2] !== '') matchType = 'by_title_ilike';
  else if (params[3] !== '') matchType = 'by_filter_scope_batch';

  return { params, matchType, query: 'DELETE FROM reminders WHERE ...' };
}

// === SIMULATE MERGE LOGIC ===

function simulateMergeDeleteResult(ctx, dbRows, entityType) {
  const deletedCount = dbRows.filter(r => r.id).length;
  const deletedTitles = dbRows.filter(r => r.title).map(r => r.title);

  let confirmMsg = '';
  if (deletedCount === 0) {
    confirmMsg = `Nu am gasit ${entityType === 'task' ? 'task-ul' : 'reminderul'} specificat pentru stergere.`;
  } else if (deletedCount === 1) {
    confirmMsg = `Am sters ${entityType === 'task' ? 'task-ul' : 'reminderul'}: ${deletedTitles[0] || 'fara titlu'}.`;
  } else {
    confirmMsg = `Am sters ${deletedCount} ${entityType === 'task' ? 'task-uri' : 'remindere'}.`;
  }

  return {
    ...ctx,
    decision: { ...ctx.decision, response: confirmMsg },
    _branch: entityType === 'task' ? 'cancel_task' : 'cancel_reminder',
    _deleted_count: deletedCount,
    _deleted_titles: deletedTitles
  };
}

// === E2E TEST CASES ===

const e2eTests = [
  // === DELETE TASK SINGLE ===
  {
    id: 'E2E_DT1',
    name: 'Delete single task by title - full flow',
    input: 'sterge task-ul cu furnizorul',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_task',
      domain: 'general',
      response: 'Am sters task-ul.',
      debug_summary: 'delete supplier task',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: { title: 'Sună furnizorul' },
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: [{ id: 'uuid-001', title: 'Sună furnizorul', priority: 'normal', status: 'open' }],
    expected: {
      intent: 'cancel_task',
      sql_match_type: 'by_title_ilike',
      sql_param_title: 'Sună furnizorul',
      merge_deleted_count: 1,
      merge_response_contains: 'Am sters task-ul: Sună furnizorul'
    }
  },
  {
    id: 'E2E_DT2',
    name: 'Delete single task by ID - full flow',
    input: 'sterge task-ul uuid-001',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_task',
      domain: 'general',
      response: 'Am sters task-ul.',
      debug_summary: 'delete task by id',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: { id: 'uuid-001' },
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: [{ id: 'uuid-001', title: 'Test Task', priority: 'normal', status: 'open' }],
    expected: {
      intent: 'cancel_task',
      sql_match_type: 'by_id',
      sql_param_id: 'uuid-001',
      merge_deleted_count: 1,
      merge_response_contains: 'Am sters task-ul: Test Task'
    }
  },
  {
    id: 'E2E_DT3',
    name: 'Delete task - no match returns 0',
    input: 'sterge task-ul cu ceva inexistent',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_task',
      domain: 'general',
      response: 'Am sters task-ul.',
      debug_summary: 'delete nonexistent task',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: { title: 'Ceva inexistent' },
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: [],
    expected: {
      intent: 'cancel_task',
      sql_match_type: 'by_title_ilike',
      merge_deleted_count: 0,
      merge_response_contains: 'Nu am gasit task-ul'
    }
  },
  // === DELETE TASK BATCH ===
  {
    id: 'E2E_DT4',
    name: 'Delete tasks batch by overdue filter',
    input: 'sterge toate task-urile restante',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_task',
      domain: 'general',
      response: 'Am sters task-urile restante.',
      debug_summary: 'batch delete overdue',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: { filter_scope: 'overdue' },
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: [
      { id: 'uuid-010', title: 'Task vechi 1', priority: 'normal', status: 'open' },
      { id: 'uuid-011', title: 'Task vechi 2', priority: 'high', status: 'open' },
      { id: 'uuid-012', title: 'Task vechi 3', priority: 'normal', status: 'open' }
    ],
    expected: {
      intent: 'cancel_task',
      sql_match_type: 'by_filter_scope_batch',
      sql_param_filter: 'overdue',
      merge_deleted_count: 3,
      merge_response_contains: 'Am sters 3 task-uri'
    }
  },
  // === DELETE TASK - CLARIFY CASE ===
  {
    id: 'E2E_DT5',
    name: 'Delete task - parser redirects to clarify when no task_action',
    input: 'sterge ceva',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_task',
      domain: 'general',
      response: 'Ce task?',
      debug_summary: 'no task_action',
      requires_confirmation: false,
      requires_clarification: true,
      task_action: null,
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: null,
    expected: {
      intent: 'clarify',
      skip_sql: true
    }
  },
  // === DELETE REMINDER SINGLE ===
  {
    id: 'E2E_DR1',
    name: 'Delete single reminder by title - full flow',
    input: 'sterge reminderul cu furnizorul',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_reminder',
      domain: 'general',
      response: 'Am sters reminderul.',
      debug_summary: 'delete supplier reminder',
      requires_confirmation: false,
      requires_clarification: false,
      reminder_action: { title: 'Sună furnizorul' },
      task_action: null,
      task_fallback_rules: [],
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: [{ id: 'rem-001', title: 'Sună furnizorul', remind_at: '2026-04-04T10:00:00', status: 'pending' }],
    expected: {
      intent: 'cancel_reminder',
      sql_match_type: 'by_title_ilike',
      sql_param_title: 'Sună furnizorul',
      merge_deleted_count: 1,
      merge_response_contains: 'Am sters reminderul: Sună furnizorul'
    }
  },
  {
    id: 'E2E_DR2',
    name: 'Delete single reminder by ID - full flow',
    input: 'sterge reminderul rem-001',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_reminder',
      domain: 'general',
      response: 'Am sters reminderul.',
      debug_summary: 'delete reminder by id',
      requires_confirmation: false,
      requires_clarification: false,
      reminder_action: { id: 'rem-001' },
      task_action: null,
      task_fallback_rules: [],
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: [{ id: 'rem-001', title: 'Test Reminder', remind_at: '2026-04-04T10:00:00', status: 'pending' }],
    expected: {
      intent: 'cancel_reminder',
      sql_match_type: 'by_id',
      sql_param_id: 'rem-001',
      merge_deleted_count: 1,
      merge_response_contains: 'Am sters reminderul: Test Reminder'
    }
  },
  // === DELETE REMINDER BATCH ===
  {
    id: 'E2E_DR3',
    name: 'Delete reminders batch by overdue filter',
    input: 'sterge toate reminderele expirate',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_reminder',
      domain: 'general',
      response: 'Am sters reminderele expirate.',
      debug_summary: 'batch delete expired reminders',
      requires_confirmation: false,
      requires_clarification: false,
      reminder_action: { filter_scope: 'overdue' },
      task_action: null,
      task_fallback_rules: [],
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: [
      { id: 'rem-010', title: 'Reminder vechi 1', remind_at: '2026-03-01T10:00:00', status: 'pending' },
      { id: 'rem-011', title: 'Reminder vechi 2', remind_at: '2026-03-02T10:00:00', status: 'pending' }
    ],
    expected: {
      intent: 'cancel_reminder',
      sql_match_type: 'by_filter_scope_batch',
      sql_param_filter: 'overdue',
      merge_deleted_count: 2,
      merge_response_contains: 'Am sters 2 remindere'
    }
  },
  // === DELETE REMINDER - CLARIFY ===
  {
    id: 'E2E_DR4',
    name: 'Delete reminder - parser redirects to clarify when no reminder_action',
    input: 'sterge reminderul',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_reminder',
      domain: 'general',
      response: 'Care reminder?',
      debug_summary: 'no reminder_action',
      requires_confirmation: false,
      requires_clarification: true,
      reminder_action: null,
      task_action: null,
      task_fallback_rules: [],
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: null,
    expected: {
      intent: 'clarify',
      skip_sql: true
    }
  },
  // === DELETE REMINDER - NO MATCH ===
  {
    id: 'E2E_DR5',
    name: 'Delete reminder - no match returns 0',
    input: 'sterge reminderul cu ceva inexistent',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'cancel_reminder',
      domain: 'general',
      response: 'Am sters reminderul.',
      debug_summary: 'delete nonexistent reminder',
      requires_confirmation: false,
      requires_clarification: false,
      reminder_action: { title: 'Ceva inexistent' },
      task_action: null,
      task_fallback_rules: [],
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    mock_db_result: [],
    expected: {
      intent: 'cancel_reminder',
      sql_match_type: 'by_title_ilike',
      merge_deleted_count: 0,
      merge_response_contains: 'Nu am gasit reminderul'
    }
  }
];

// === RUN E2E TESTS ===

const parser = buildParser();
let passed = 0, failed = 0;

console.log('E2E Delete Tests — Full Flow Simulation');
console.log('='.repeat(60));

for (const tc of e2eTests) {
  const ctx = { ...fixture, raw_user_message: tc.input };
  const httpResponse = { choices: [{ message: { content: JSON.stringify(tc.llm_response) } }] };

  const decision = parser(httpResponse, ctx);
  const checks = [];

  // Check 1: Intent
  checks.push({
    name: 'intent',
    pass: decision.intent === tc.expected.intent,
    expected: tc.expected.intent,
    actual: decision.intent
  });

  // If clarify, skip SQL/merge checks
  if (tc.expected.skip_sql) {
    const allPass = checks.every(c => c.pass);
    const icon = allPass ? '✅' : '❌';
    console.log(`${icon} ${tc.id}: ${tc.name}`);
    if (!allPass) checks.filter(c => !c.pass).forEach(c => console.log(`   ${c.name}: expected=${c.expected} actual=${c.actual}`));
    if (allPass) passed++; else failed++;
    continue;
  }

  // Check 2: SQL match type
  const entityType = decision.intent === 'cancel_task' ? 'task' : 'reminder';
  const sqlResult = entityType === 'task'
    ? simulateDeleteTaskSQL(decision, fixture.tenant_id)
    : simulateDeleteReminderSQL(decision, fixture.tenant_id);

  if (tc.expected.sql_match_type) {
    checks.push({
      name: 'sql_match_type',
      pass: sqlResult.matchType === tc.expected.sql_match_type,
      expected: tc.expected.sql_match_type,
      actual: sqlResult.matchType
    });
  }

  // Check 3: SQL params
  if (tc.expected.sql_param_id) {
    checks.push({
      name: 'sql_param_id',
      pass: sqlResult.params[1] === tc.expected.sql_param_id,
      expected: tc.expected.sql_param_id,
      actual: sqlResult.params[1]
    });
  }
  if (tc.expected.sql_param_title) {
    checks.push({
      name: 'sql_param_title',
      pass: sqlResult.params[2] === tc.expected.sql_param_title,
      expected: tc.expected.sql_param_title,
      actual: sqlResult.params[2]
    });
  }
  if (tc.expected.sql_param_filter) {
    checks.push({
      name: 'sql_param_filter',
      pass: sqlResult.params[3] === tc.expected.sql_param_filter,
      expected: tc.expected.sql_param_filter,
      actual: sqlResult.params[3]
    });
  }

  // Check 4: Merge logic
  const ctxForMerge = { ...fixture, decision };
  const mergeResult = simulateMergeDeleteResult(ctxForMerge, tc.mock_db_result || [], entityType);

  if (tc.expected.merge_deleted_count !== undefined) {
    checks.push({
      name: 'merge_deleted_count',
      pass: mergeResult._deleted_count === tc.expected.merge_deleted_count,
      expected: tc.expected.merge_deleted_count,
      actual: mergeResult._deleted_count
    });
  }

  if (tc.expected.merge_response_contains) {
    const contains = mergeResult.decision.response.includes(tc.expected.merge_response_contains);
    checks.push({
      name: 'merge_response_contains',
      pass: contains,
      expected: tc.expected.merge_response_contains,
      actual: mergeResult.decision.response
    });
  }

  // Summary
  const allPass = checks.every(c => c.pass);
  const icon = allPass ? '✅' : '❌';
  console.log(`${icon} ${tc.id}: ${tc.name}`);
  if (!allPass) {
    checks.filter(c => !c.pass).forEach(c => console.log(`   ${c.name}: expected=${JSON.stringify(c.expected)} actual=${JSON.stringify(c.actual)}`));
  }
  if (allPass) passed++; else failed++;
}

console.log('\n' + '='.repeat(60));
console.log(`E2E TOTAL: ${e2eTests.length} | ✅ ${passed} PASS | ❌ ${failed} FAIL`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
