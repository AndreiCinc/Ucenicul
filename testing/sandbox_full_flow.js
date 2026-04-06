#!/usr/bin/env node

/**
 * COMPREHENSIVE N8N SANDBOX SIMULATOR
 * brain_main_inbound_mvp_v3_memory_write.json
 *
 * Simulates the FULL message flow WITHOUT requiring:
 * - Live n8n instance
 * - PostgreSQL database
 * - OpenAI API
 * - Telegram API
 *
 * USAGE:
 *   node sandbox_full_flow.js [message_number]
 *
 * EXAMPLES:
 *   node sandbox_full_flow.js          # Run all 18 test messages
 *   node sandbox_full_flow.js 1        # Run test message 1 only
 *   node sandbox_full_flow.js 5        # Run test message 5 only
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// LOAD DEPENDENCIES
// ============================================================================

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/test_context.json'), 'utf8')
);

// Load the real parse_contract_final.js parser
const parserCode = fs.readFileSync(
  path.join(__dirname, '../parse_contract_final.js'),
  'utf8'
);

// ============================================================================
// PARSE CONTRACT PARSER (simplified version from parse_contract_final.js)
// ============================================================================

function parseContractDecision(httpResponse, ctx) {
  const VALID_INTENTS = [
    'create_task', 'update_task', 'complete_task', 'cancel_task', 'list_tasks',
    'create_reminder', 'update_reminder', 'cancel_reminder', 'list_reminders',
    'search_memory', 'general_response', 'clarify', 'save_improvement_request', 'none'
  ];
  const VALID_TASK_PRIORITIES = ['urgent', 'high', 'normal', 'low'];
  const VALID_TASK_DUE_TYPES = ['flexible', 'date', 'datetime'];
  const VALID_FALLBACK_DUE_TYPES = ['date', 'datetime'];
  const VALID_FILTER_SCOPES = ['all', 'today', 'tomorrow', 'day_after_tomorrow', 'overdue', 'urgent', 'high', 'this_week', 'this_month'];
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
    text = text.replace(/```json\n?|\n?```/g, '').trim();
    decision = JSON.parse(text);

    // PHASE 1: Reject old contract / wrong version / invalid intent
    if (
      decision.task !== undefined ||
      decision.reminder !== undefined ||
      decision.memory_candidate !== undefined ||
      decision.response_text !== undefined ||
      decision.confidence !== undefined
    ) {
      decision = makeClarify('old_contract_fields_detected');
    } else if (decision.version !== 'brain-decision-v1') {
      decision = makeClarify('wrong_version_' + String(decision.version));
    } else if (!VALID_INTENTS.includes(decision.intent)) {
      decision = makeClarify('invalid_intent_' + String(decision.intent));
    } else {
      // PHASE 2: Normalize all fields
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

      decision.memory_writes = Array.isArray(decision.memory_writes) ? decision.memory_writes : [];
      decision.memory_writes = decision.memory_writes.filter(function(item) {
        if (!item || typeof item !== 'object') return false;
        if (!VALID_MEMORY_TYPES.includes(item.type)) return false;
        if (!VALID_MEMORY_CATEGORIES.includes(item.category)) return false;
        if (typeof item.content !== 'string' || item.content.trim() === '') return false;
        return true;
      });

      // PHASE 3: List filter inference
      if (decision.intent === 'list_tasks') {
        if (!decision.task_action) {
          decision.task_action = normalizeTaskAction({
            filter_scope: inferFilterScopeFromMessage(ctx.raw_user_message)
          });
        } else if (!decision.task_action.filter_scope) {
          decision.task_action.filter_scope = inferFilterScopeFromMessage(ctx.raw_user_message);
        }
      }

      if (decision.intent === 'list_reminders') {
        if (!decision.reminder_action) {
          decision.reminder_action = normalizeReminderAction({
            filter_scope: inferFilterScopeFromMessage(ctx.raw_user_message)
          });
        } else if (!decision.reminder_action.filter_scope) {
          decision.reminder_action.filter_scope = inferFilterScopeFromMessage(ctx.raw_user_message);
        }
      }

      // PHASE 4: Task vs Reminder disambiguation
      const hasTaskLanguage = messageImpliesTaskPreference(ctx.raw_user_message);
      const hasReminderLanguage = messageImpliesReminderPreference(ctx.raw_user_message);

      if (hasTaskLanguage && hasReminderLanguage) {
        if (decision.intent === 'create_reminder') {
          decision.intent = 'create_task';
        }

        if (
          decision.intent === 'create_task' &&
          (!decision.task_action || !decision.task_action.title) &&
          decision.reminder_action &&
          decision.reminder_action.title
        ) {
          decision.task_action = buildTaskActionFromReminder(decision.reminder_action);
        }

        if (decision.intent === 'create_task') {
          decision.reminder_action = null;
        }
      }

      // PHASE 5: Intent-specific validation
      if (decision.intent === 'create_task') {
        if (!decision.task_action || !decision.task_action.title) {
          decision = makeClarify('missing_task_action_title_for_create_task');
        } else {
          if (!decision.task_action.priority) {
            decision.task_action.priority = 'normal';
          }
          if (!decision.task_action.due_type) {
            if (decision.task_action.due_at) decision.task_action.due_type = 'datetime';
            else if (decision.task_action.due_date) decision.task_action.due_type = 'date';
            else decision.task_action.due_type = 'flexible';
          }
          if (decision.task_action.due_type === 'date') {
            decision.task_action.due_at = null;
          }
          if (decision.task_action.due_type === 'datetime') {
            decision.task_action.due_date = null;
          }
          decision.reminder_action = null;
        }
      }

      if (decision.intent === 'update_task' || decision.intent === 'complete_task' || decision.intent === 'cancel_task') {
        if (!decision.task_action) {
          decision = makeClarify('missing_task_action_for_' + decision.intent);
        }
      }

      if (decision.intent === 'create_reminder') {
        if (!decision.reminder_action || !decision.reminder_action.title || !decision.reminder_action.remind_at) {
          decision = makeClarify('missing_reminder_action_for_create_reminder');
        } else {
          decision.task_action = null;
          decision.task_fallback_rules = [];
        }
      }

      if (decision.intent === 'update_reminder' || decision.intent === 'cancel_reminder') {
        if (!decision.reminder_action) {
          decision = makeClarify('missing_reminder_action_for_' + decision.intent);
        }
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

      // PHASE 6: Clean operational payloads for non-action intents
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

  return {
    json: {
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
    }
  };
}

function buildParserFunction() {
  return parseContractDecision;
}

// ============================================================================
// MOCK LLM BRAIN DECISION (deterministic for testing)
// ============================================================================

const MOCK_LLM_RESPONSES = {
  // === TASK CREATION ===
  'Creează un task "Finalizează brain-ul"': {
    version: 'brain-decision-v1',
    intent: 'create_task',
    domain: 'general',
    response: 'Am creat task-ul "Finalizează brain-ul".',
    debug_summary: 'create_task_from_message',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: {
      id: null,
      title: 'Finalizează brain-ul',
      description: null,
      priority: 'normal',
      due_type: 'flexible',
      due_date: null,
      due_at: null,
      filter_scope: null
    },
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  'Pune-mi un task urgent "Sună-l pe Ion mâine"': {
    version: 'brain-decision-v1',
    intent: 'create_task',
    domain: 'general',
    response: 'Am creat task-ul urgent "Sună-l pe Ion".',
    debug_summary: 'create_task_urgent_from_message',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: {
      id: null,
      title: 'Sună-l pe Ion',
      description: null,
      priority: 'urgent',
      due_type: 'date',
      due_date: '2026-04-04',
      due_at: null,
      filter_scope: null
    },
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  'Trebuie să cumpăr hârtie igienică pentru că se termină.': {
    version: 'brain-decision-v1',
    intent: 'create_task',
    domain: 'general',
    response: 'Am creat task-ul "Cumpără hârtie igienică".',
    debug_summary: 'create_task_with_fallback',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: {
      id: null,
      title: 'Cumpără hârtie igienică',
      description: null,
      priority: 'normal',
      due_type: 'flexible',
      due_date: null,
      due_at: null,
      filter_scope: null
    },
    task_fallback_rules: [
      {
        condition: 'not_completed',
        title: 'Cumpără urgent hârtie igienică',
        description: 'Rischia de a rămâne fără',
        priority: 'high',
        due_type: 'date',
        due_date: '2026-04-04',
        due_at: null,
        reason: 'Stock depletion risk'
      }
    ],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  // === REMINDER CREATION ===
  'Adu-mi aminte mâine la 10 să sun furnizorul': {
    version: 'brain-decision-v1',
    intent: 'create_reminder',
    domain: 'general',
    response: 'Am programat reminder-ul pentru mâine la 10:00.',
    debug_summary: 'create_reminder_with_time',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: {
      id: null,
      title: 'Sună furnizorul',
      description: null,
      remind_at: '2026-04-04T10:00:00+03:00',
      filter_scope: null
    },
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  'Amintește-mi poimâine la 14 să verific apartamentul': {
    version: 'brain-decision-v1',
    intent: 'create_reminder',
    domain: 'general',
    response: 'Am programat reminder-ul pentru poimâine la 14:00.',
    debug_summary: 'create_reminder_day_after_tomorrow',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: {
      id: null,
      title: 'Verifica apartamentul',
      description: null,
      remind_at: '2026-04-05T14:00:00+03:00',
      filter_scope: null
    },
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  // === LISTING ===
  'Ce task-uri am azi?': {
    version: 'brain-decision-v1',
    intent: 'list_tasks',
    domain: 'general',
    response: 'Iată task-urile tale de azi:',
    debug_summary: 'list_tasks_today',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: {
      id: null,
      title: null,
      description: null,
      priority: null,
      due_type: null,
      due_date: null,
      due_at: null,
      filter_scope: 'today'
    },
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  'Ce remindere am mâine?': {
    version: 'brain-decision-v1',
    intent: 'list_reminders',
    domain: 'general',
    response: 'Iată remindere-le tale pentru mâine:',
    debug_summary: 'list_reminders_tomorrow',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: {
      id: null,
      title: null,
      description: null,
      remind_at: null,
      filter_scope: 'tomorrow'
    },
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  // === DELETION ===
  'Șterge task-ul "Finalizează brain-ul"': {
    version: 'brain-decision-v1',
    intent: 'cancel_task',
    domain: 'general',
    response: 'Șterg task-ul.',
    debug_summary: 'cancel_task_by_title',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: {
      id: null,
      title: 'Finalizează brain-ul',
      description: null,
      priority: null,
      due_type: null,
      due_date: null,
      due_at: null,
      filter_scope: null
    },
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  'Șterge reminderul "Sună furnizorul"': {
    version: 'brain-decision-v1',
    intent: 'cancel_reminder',
    domain: 'general',
    response: 'Șterg reminderul.',
    debug_summary: 'cancel_reminder_by_title',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: {
      id: null,
      title: 'Sună furnizorul',
      description: null,
      remind_at: null,
      filter_scope: null
    },
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  // === MEMORY WRITE ===
  'Notează că Mihai vrea oferta până vineri': {
    version: 'brain-decision-v1',
    intent: 'save_improvement_request',
    domain: 'general',
    response: 'Am notat feedback-ul.',
    debug_summary: 'save_improvement_request',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: {
      requested_feature: 'Improve task creation UX',
      user_message: 'Notează că Mihai vrea oferta până vineri'
    },
    memory_writes: [
      {
        type: 'fact',
        category: 'growth_context',
        content: 'Mihai dorește oferta finală până vineri.'
      },
      {
        type: 'fact',
        category: 'customer_market',
        content: 'Deadline pentru Mihai: vineri'
      }
    ]
  },

  // === GENERAL RESPONSE ===
  'Bună! Cum merg lucrurile?': {
    version: 'brain-decision-v1',
    intent: 'general_response',
    domain: 'general',
    response: 'Bună! Sunt gata să te ajut cu task-urile, remindere-le și notițe. Ce dorești?',
    debug_summary: 'general_response_greeting',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  // === CLARIFY ===
  'Vreau să cresc afacerea': {
    version: 'brain-decision-v1',
    intent: 'clarify',
    domain: 'general',
    response: 'Poți fi mai specific? Vreau să-ți cresc vânzările, să găsesc clienți noi, sau altceva?',
    debug_summary: 'clarify_ambiguous_intent',
    requires_confirmation: false,
    requires_clarification: true,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  // === NONE ===
  'OK': {
    version: 'brain-decision-v1',
    intent: 'none',
    domain: 'general',
    response: 'Bine!',
    debug_summary: 'none_light_ack',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  'Mulțumesc': {
    version: 'brain-decision-v1',
    intent: 'none',
    domain: 'general',
    response: 'Cu plăcere!',
    debug_summary: 'none_thanks',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  // === SEARCH MEMORY ===
  'Ce-mi amintești tu de clienți?': {
    version: 'brain-decision-v1',
    intent: 'search_memory',
    domain: 'general',
    response: 'Caut în memorie...',
    debug_summary: 'search_memory_clients',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: {
      query: 'clienți',
      category_filter: 'customer_market'
    },
    improvement_request: null,
    memory_writes: []
  },

  // === EDGE CASES ===
  'trbuie s sun pe Ion': {
    version: 'brain-decision-v1',
    intent: 'create_task',
    domain: 'general',
    response: 'Am creat task-ul "Sună pe Ion".',
    debug_summary: 'create_task_informal_romanian',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: {
      id: null,
      title: 'Sună pe Ion',
      description: null,
      priority: 'normal',
      due_type: 'flexible',
      due_date: null,
      due_at: null,
      filter_scope: null
    },
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  'Create task and reminder at same time': {
    version: 'brain-decision-v1',
    intent: 'clarify',
    domain: 'general',
    response: 'Vrei un task sau un reminder? Pot crea doar unul dintre acestea.',
    debug_summary: 'clarify_task_vs_reminder_ambiguity',
    requires_confirmation: false,
    requires_clarification: true,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  },

  'Îți place cum funcționez?': {
    version: 'brain-decision-v1',
    intent: 'general_response',
    domain: 'general',
    response: 'Sunt aici ca să te ajut! Dacă ai sugestii, sunt deschis.',
    debug_summary: 'general_response_feedback_request',
    requires_confirmation: false,
    requires_clarification: false,
    task_action: null,
    task_fallback_rules: [],
    reminder_action: null,
    memory_action: null,
    improvement_request: null,
    memory_writes: []
  }
};

// ============================================================================
// 18 DIVERSE TEST MESSAGES (covering all intents and edge cases)
// ============================================================================

const TEST_MESSAGES = [
  {
    id: 1,
    message: 'Creează un task "Finalizează brain-ul"',
    expectedIntent: 'create_task',
    description: 'Simple task creation'
  },
  {
    id: 2,
    message: 'Pune-mi un task urgent "Sună-l pe Ion mâine"',
    expectedIntent: 'create_task',
    description: 'Task with priority and deadline'
  },
  {
    id: 3,
    message: 'Trebuie să cumpăr hârtie igienică pentru că se termină.',
    expectedIntent: 'create_task',
    description: 'Task with fallback rule (supply risk)'
  },
  {
    id: 4,
    message: 'Adu-mi aminte mâine la 10 să sun furnizorul',
    expectedIntent: 'create_reminder',
    description: 'Reminder with explicit time'
  },
  {
    id: 5,
    message: 'Amintește-mi poimâine la 14 să verific apartamentul',
    expectedIntent: 'create_reminder',
    description: 'Reminder for day after tomorrow'
  },
  {
    id: 6,
    message: 'Ce task-uri am azi?',
    expectedIntent: 'list_tasks',
    description: 'List tasks filtered by today'
  },
  {
    id: 7,
    message: 'Ce remindere am mâine?',
    expectedIntent: 'list_reminders',
    description: 'List reminders filtered by tomorrow'
  },
  {
    id: 8,
    message: 'Șterge task-ul "Finalizează brain-ul"',
    expectedIntent: 'cancel_task',
    description: 'Delete task by title (semantic matching)'
  },
  {
    id: 9,
    message: 'Șterge reminderul "Sună furnizorul"',
    expectedIntent: 'cancel_reminder',
    description: 'Delete reminder by title'
  },
  {
    id: 10,
    message: 'Notează că Mihai vrea oferta până vineri',
    expectedIntent: 'save_improvement_request',
    description: 'Save improvement request with memory writes'
  },
  {
    id: 11,
    message: 'Bună! Cum merg lucrurile?',
    expectedIntent: 'general_response',
    description: 'General conversation (no operational action)'
  },
  {
    id: 12,
    message: 'Vreau să cresc afacerea',
    expectedIntent: 'clarify',
    description: 'Ambiguous intent (needs clarification)'
  },
  {
    id: 13,
    message: 'OK',
    expectedIntent: 'none',
    description: 'Light acknowledgment (no action)'
  },
  {
    id: 14,
    message: 'Mulțumesc',
    expectedIntent: 'none',
    description: 'Thanks (no action)'
  },
  {
    id: 15,
    message: 'Ce-mi amintești tu de clienți?',
    expectedIntent: 'search_memory',
    description: 'Search memory explicitly'
  },
  {
    id: 16,
    message: 'trbuie s sun pe Ion',
    expectedIntent: 'create_task',
    description: 'Informal Romanian with diacritics omitted'
  },
  {
    id: 17,
    message: 'Create task and reminder at same time',
    expectedIntent: 'clarify',
    description: 'Ambiguous task vs reminder'
  },
  {
    id: 18,
    message: 'Îți place cum funcționez?',
    expectedIntent: 'general_response',
    description: 'Conversational feedback request'
  }
];

// ============================================================================
// MOCK DATABASE CONTEXT
// ============================================================================

function getMockDatabaseContext(tenantId) {
  return {
    business: fixture.context.business,
    tasks: fixture.context.tasks,
    reminders: fixture.context.reminders,
    memories: fixture.context.memories
  };
}

// ============================================================================
// MOCK OPENAI EMBEDDING (returns random vectors for testing)
// ============================================================================

function mockOpenAIEmbedding(texts) {
  // Return mock embeddings (1536 dims like real OpenAI)
  return {
    object: 'list',
    data: texts.map((text, idx) => ({
      object: 'embedding',
      index: idx,
      embedding: Array(1536)
        .fill(0)
        .map(() => Math.random())
    })),
    model: 'text-embedding-3-small',
    usage: {
      prompt_tokens: texts.length,
      total_tokens: texts.length
    }
  };
}

// ============================================================================
// MOCK DATABASE INSERT FUNCTIONS
// ============================================================================

function mockInsertInboundMessage(data) {
  return {
    id: 'msg-inbound-' + Math.random().toString(36).substr(2, 9),
    tenant_id: data.tenant_id,
    telegram_chat_id: data.telegram_chat_id,
    raw_message: data.raw_message,
    created_at: new Date().toISOString()
  };
}

function mockInsertOutboundMessage(data) {
  return {
    id: 'msg-outbound-' + Math.random().toString(36).substr(2, 9),
    tenant_id: data.tenant_id,
    telegram_chat_id: data.telegram_chat_id,
    response_text: data.response_text,
    intent: data.intent,
    created_at: new Date().toISOString()
  };
}

function mockInsertTask(data) {
  return {
    id: 'task-' + Math.random().toString(36).substr(2, 9),
    tenant_id: data.tenant_id,
    title: data.title,
    description: data.description,
    priority: data.priority,
    due_date: data.due_date,
    due_at: data.due_at,
    due_type: data.due_type,
    status: 'open',
    created_at: new Date().toISOString()
  };
}

function mockInsertReminder(data) {
  return {
    id: 'reminder-' + Math.random().toString(36).substr(2, 9),
    tenant_id: data.tenant_id,
    title: data.title,
    description: data.description,
    remind_at: data.remind_at,
    status: 'pending',
    created_at: new Date().toISOString()
  };
}

function mockInsertMemory(data) {
  return {
    id: 'memory-' + Math.random().toString(36).substr(2, 9),
    tenant_id: data.tenant_id,
    content: data.content,
    embedding: data.embedding_str,
    memory_category: data.memory_category,
    memory_kind: data.memory_kind,
    importance_score: 0.7,
    created_at: new Date().toISOString()
  };
}

function mockDeleteTask(tenantId, titleOrId) {
  // Semantic matching: find in fixture
  const tasks = fixture.context.tasks || [];
  const matched = tasks.filter(
    t =>
      t.title.toLowerCase().includes(titleOrId.toLowerCase()) ||
      t.id === titleOrId
  );
  return matched.map(t => ({ id: t.id, title: t.title }));
}

function mockDeleteReminder(tenantId, titleOrId) {
  const reminders = fixture.context.reminders || [];
  const matched = reminders.filter(
    r =>
      r.title.toLowerCase().includes(titleOrId.toLowerCase()) ||
      r.id === titleOrId
  );
  return matched.map(r => ({ id: r.id, title: r.title }));
}

// ============================================================================
// MAIN SANDBOX SIMULATOR
// ============================================================================

class SandboxSimulator {
  constructor() {
    this.results = [];
    this.branchesExercised = new Set();
    this.log = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      byIntent: {}
    };
    this.parserFunc = buildParserFunction();
  }

  addLog(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    this.log.push(entry);
  }

  // Step 1: Normalize Input
  stepNormalizeInput(rawMessage) {
    this.addLog('INFO', '1. Normalize Input');
    return {
      source: 'manual_test',
      organization_id: fixture.organization_id,
      tenant_id: fixture.tenant_id,
      telegram_chat_id: fixture.telegram_chat_id,
      telegram_message_id: fixture.telegram_message_id,
      raw_user_message: rawMessage.trim(),
      received_at: new Date().toISOString(),
      test_mode: true
    };
  }

  // Step 2: Privacy Gate Inbound (NO-OP MVP)
  stepPrivacyGateInbound(normalized) {
    this.addLog('INFO', '2. Privacy Gate Inbound (NO-OP MVP)');
    return normalized;
  }

  // Step 3: Resolve Org + Tenant
  stepResolveOrgTenant(gated) {
    this.addLog('INFO', '3. Resolve Organization and Tenant');
    return {
      organization_id: fixture.organization_id,
      organization_name: fixture.organization_name,
      tenant_id: fixture.tenant_id,
      tenant_name: fixture.tenant_name,
      tenant_slug: fixture.tenant_slug,
      tenant_vertical: fixture.tenant_vertical,
      tenant_timezone: fixture.tenant_timezone,
      tenant_currency_code: fixture.tenant_currency_code,
      found: true
    };
  }

  // Step 4: Load Minimal Context
  stepLoadMinimalContext(org) {
    this.addLog('INFO', '4. Load Minimal Context');
    return {
      context: getMockDatabaseContext(org.tenant_id)
    };
  }

  // Step 5: Build Brain Input
  stepBuildBrainInput(org, context, rawMessage) {
    this.addLog('INFO', '5. Build Brain Input');
    // Return simplified brain input (combines org + context + prompts)
    return {
      organization_id: org.organization_id,
      organization_name: org.organization_name,
      tenant_id: org.tenant_id,
      tenant_name: org.tenant_name,
      tenant_slug: org.tenant_slug,
      tenant_vertical: org.tenant_vertical,
      tenant_timezone: org.tenant_timezone,
      tenant_currency_code: org.tenant_currency_code,
      telegram_chat_id: fixture.telegram_chat_id,
      telegram_message_id: fixture.telegram_message_id,
      raw_user_message: rawMessage,
      received_at: new Date().toISOString(),
      test_mode: true,
      source: 'manual_test',
      context: context.context
    };
  }

  // Step 6: Brain Decision (mock LLM)
  stepBrainDecision(brainInput) {
    this.addLog('INFO', '6. Brain Decision (Mock LLM)');

    const msg = brainInput.raw_user_message;

    // Try exact match first
    if (MOCK_LLM_RESPONSES[msg]) {
      this.addLog('DEBUG', 'Found exact match in mock responses', { message: msg });
      return {
        choices: [
          {
            message: {
              content: JSON.stringify(MOCK_LLM_RESPONSES[msg])
            }
          }
        ]
      };
    }

    // Fall back to clarify
    this.addLog(
      'DEBUG',
      'No exact match; returning clarify response',
      { message: msg }
    );
    return {
      choices: [
        {
          message: {
            content: JSON.stringify({
              version: 'brain-decision-v1',
              intent: 'clarify',
              domain: 'general',
              response:
                'Poți reformula mesajul? Nu sunt sigur ce dorești.',
              debug_summary: 'mock_no_match_fallback',
              requires_confirmation: false,
              requires_clarification: true,
              task_action: null,
              task_fallback_rules: [],
              reminder_action: null,
              memory_action: null,
              improvement_request: null,
              memory_writes: []
            })
          }
        }
      ]
    };
  }

  // Step 7: Parse and Validate Brain Contract
  stepParseContract(httpResponse, brainInput) {
    this.addLog('INFO', '7. Parse and Validate Brain Contract');
    try {
      const result = this.parserFunc(httpResponse, brainInput);
      // The parser returns an object with a .json property
      const parsed = result.json || result;
      this.addLog('DEBUG', 'Contract parsed successfully', {
        intent: parsed.decision.intent,
        version: parsed.decision.version
      });
      return parsed;
    } catch (err) {
      this.addLog('ERROR', 'Parse error', { error: err.message });
      return {
        decision: {
          version: 'brain-decision-v1',
          intent: 'clarify',
          response: 'Eroare la parsing.',
          debug_summary: 'parse_error_' + err.message.substring(0, 50)
        }
      };
    }
  }

  // Step 8: Insert Inbound Message
  stepInsertInboundMessage(parsed) {
    this.addLog('INFO', '8. Insert Inbound Message');
    const msg = mockInsertInboundMessage({
      tenant_id: parsed.tenant_id,
      telegram_chat_id: parsed.telegram_chat_id,
      raw_message: parsed.raw_user_message
    });
    this.addLog('DEBUG', 'Inbound message inserted', { id: msg.id });
    return msg;
  }

  // Step 9: Route by Intent (execute intent branch)
  stepRouteByIntent(parsed, inboundMsg) {
    const intent = parsed.decision.intent;
    this.addLog('INFO', '9. Route by Intent: ' + intent);

    this.branchesExercised.add(intent);

    const result = {
      _branch: intent,
      _db_results: []
    };

    // Execute the relevant branch
    switch (intent) {
      case 'create_task': {
        this.addLog('DEBUG', 'Executing Create Task branch');
        const ta = parsed.decision.task_action;
        if (ta && ta.title) {
          const task = mockInsertTask({
            tenant_id: parsed.tenant_id,
            title: ta.title,
            description: ta.description,
            priority: ta.priority || 'normal',
            due_date: ta.due_date,
            due_at: ta.due_at,
            due_type: ta.due_type || 'flexible'
          });
          result._db_results.push(task);
          this.addLog('DEBUG', 'Task created', { id: task.id, title: task.title });
        }
        break;
      }

      case 'create_reminder': {
        this.addLog('DEBUG', 'Executing Create Reminder branch');
        const ra = parsed.decision.reminder_action;
        if (ra && ra.title) {
          const reminder = mockInsertReminder({
            tenant_id: parsed.tenant_id,
            title: ra.title,
            description: ra.description,
            remind_at: ra.remind_at
          });
          result._db_results.push(reminder);
          this.addLog('DEBUG', 'Reminder created', {
            id: reminder.id,
            title: reminder.title
          });
        }
        break;
      }

      case 'cancel_task': {
        this.addLog('DEBUG', 'Executing Delete Task branch');
        const ta = parsed.decision.task_action;
        if (ta && ta.title) {
          const deleted = mockDeleteTask(parsed.tenant_id, ta.title);
          result._db_results = deleted;
          result._deleted_count = deleted.length;
          this.addLog('DEBUG', 'Tasks deleted', { count: deleted.length });
        }
        break;
      }

      case 'cancel_reminder': {
        this.addLog('DEBUG', 'Executing Delete Reminder branch');
        const ra = parsed.decision.reminder_action;
        if (ra && ra.title) {
          const deleted = mockDeleteReminder(parsed.tenant_id, ra.title);
          result._db_results = deleted;
          result._deleted_count = deleted.length;
          this.addLog('DEBUG', 'Reminders deleted', { count: deleted.length });
        }
        break;
      }

      case 'list_tasks': {
        this.addLog('DEBUG', 'Executing List Tasks branch');
        const scope = parsed.decision.task_action?.filter_scope || 'all';
        result._task_list = fixture.context.tasks || [];
        result._filter_scope = scope;
        this.addLog('DEBUG', 'Tasks listed', { scope, count: result._task_list.length });
        break;
      }

      case 'list_reminders': {
        this.addLog('DEBUG', 'Executing List Reminders branch');
        const scope = parsed.decision.reminder_action?.filter_scope || 'all';
        result._reminder_list = fixture.context.reminders || [];
        result._filter_scope = scope;
        this.addLog('DEBUG', 'Reminders listed', { scope, count: result._reminder_list.length });
        break;
      }

      case 'save_improvement_request': {
        this.addLog('DEBUG', 'Executing Save Improvement Request branch');
        const ir = parsed.decision.improvement_request;
        if (ir) {
          result._improvement = {
            id: 'imp-' + Math.random().toString(36).substr(2, 9),
            feature: ir.requested_feature,
            user_message: ir.user_message
          };
          this.addLog('DEBUG', 'Improvement request saved', {
            id: result._improvement.id
          });
        }
        break;
      }

      case 'search_memory': {
        this.addLog('DEBUG', 'Executing Search Memory branch');
        result._memory_search = fixture.context.memories || [];
        this.addLog('DEBUG', 'Memory searched', { count: result._memory_search.length });
        break;
      }

      case 'general_response': {
        this.addLog('DEBUG', 'Executing General Response branch');
        result._is_response = true;
        break;
      }

      case 'clarify': {
        this.addLog('DEBUG', 'Executing Clarify branch');
        result._is_clarification = true;
        break;
      }

      case 'none': {
        this.addLog('DEBUG', 'Executing None branch (skip outbound)');
        result._outbound_skipped = true;
        break;
      }

      default:
        this.addLog('WARN', 'Unknown intent; using clarify fallback', { intent });
    }

    return {
      ...parsed,
      ...result
    };
  }

  // Step 10: Memory Writes (IF Has Memory Writes gate)
  stepMemoryWrites(routed) {
    const writes = routed.decision.memory_writes || [];

    if (writes.length === 0) {
      this.addLog('INFO', '10. Memory Writes: SKIPPED (empty)');
      return routed;
    }

    this.addLog('INFO', '10. Memory Writes: Processing ' + writes.length + ' items');

    // Step 10a: Prepare Embedding Batch
    this.addLog('DEBUG', '10a. Prepare Embedding Batch');
    const contents = writes.map(m => m.content);

    // Step 10b: Mock OpenAI Embedding
    this.addLog('DEBUG', '10b. Mock OpenAI Embedding');
    const embeddingResponse = mockOpenAIEmbedding(contents);
    this.addLog('DEBUG', 'Embeddings received', {
      count: embeddingResponse.data.length
    });

    // Step 10c: Build Memory Insert Items
    this.addLog('DEBUG', '10c. Build Memory Insert Items');
    const items = writes.map((mw, idx) => {
      const emb = embeddingResponse.data[idx];
      const embStr = emb ? '[' + emb.embedding.slice(0, 5).join(',') + ',...(1536)]' : '[]';
      return {
        tenant_id: routed.tenant_id,
        content: mw.content,
        embedding_str: embStr,
        memory_category: mw.category,
        memory_kind: mw.type
      };
    });

    // Step 10d: Insert with Dedup (mock)
    this.addLog('DEBUG', '10d. Insert with Dedup');
    const insertedMemories = items.map(item => mockInsertMemory(item));
    this.addLog('DEBUG', 'Memories inserted', { count: insertedMemories.length });

    // Step 10e: Restore Context After Memory Write
    this.addLog('DEBUG', '10e. Restore Context After Memory Write');

    return {
      ...routed,
      _memory_write_status: 'completed',
      _memory_write_count: insertedMemories.length,
      _memory_inserted: insertedMemories
    };
  }

  // Step 11: Privacy Gate Outbound
  stepPrivacyGateOutbound(withMemory) {
    this.addLog('INFO', '11. Privacy Gate Outbound (NO-OP MVP)');
    return withMemory;
  }

  // Step 12: Insert Outbound Message (or skip if intent=none)
  stepInsertOutboundMessage(gated) {
    if (gated.decision.intent === 'none') {
      this.addLog('INFO', '12. Insert Outbound Message: SKIPPED (intent=none)');
      return gated;
    }

    this.addLog('INFO', '12. Insert Outbound Message');
    const msg = mockInsertOutboundMessage({
      tenant_id: gated.tenant_id,
      telegram_chat_id: gated.telegram_chat_id,
      response_text: gated.decision.response,
      intent: gated.decision.intent
    });
    this.addLog('DEBUG', 'Outbound message inserted', { id: msg.id });

    return {
      ...gated,
      _outbound_message_id: msg.id
    };
  }

  // Step 13: Telegram Send (mock)
  stepTelegramSend(outbound) {
    if (outbound.test_mode === true) {
      this.addLog('INFO', '13. Telegram Send: SKIPPED (test_mode=true)');
      return outbound;
    }

    this.addLog('INFO', '13. Telegram Send');
    const result = {
      ok: true,
      result: {
        message_id: Math.floor(Math.random() * 100000) + 1000,
        chat: {
          id: outbound.telegram_chat_id
        },
        text: outbound.decision.response
      }
    };
    this.addLog('DEBUG', 'Telegram message sent', {
      message_id: result.result.message_id
    });

    return {
      ...outbound,
      _telegram_sent: result.ok,
      _telegram_message_id: result.result.message_id
    };
  }

  // Final Output
  stepFinalOutput(final) {
    this.addLog('INFO', '14. Final Output');

    return {
      ok: true,
      workflow: 'brain_main_inbound_mvp',
      contract_version: final.decision.version,
      resolved: {
        organization_id: final.organization_id,
        tenant_id: final.tenant_id
      },
      decision: {
        intent: final.decision.intent,
        domain: final.decision.domain,
        debug_summary: final.decision.debug_summary
      },
      branch_exercised: final._branch,
      response: final.decision.response,
      memory_writes_count: (final.decision.memory_writes || []).length,
      telegram: {
        sent: final._telegram_sent || false,
        chat_id: final.telegram_chat_id,
        message_id_sent: final._telegram_message_id || null,
        skip_reason: final.decision.intent === 'none' ? 'intent_none' : null
      }
    };
  }

  // Run one test message through the full pipeline
  runTest(testMsg) {
    this.stats.total++;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST #${testMsg.id}: ${testMsg.description}`);
    console.log(`Message: "${testMsg.message}"`);
    console.log(`Expected Intent: ${testMsg.expectedIntent}`);
    console.log(`${'='.repeat(80)}`);

    try {
      // 1. Normalize Input
      const normalized = this.stepNormalizeInput(testMsg.message);

      // 2. Privacy Gate Inbound
      const gated = this.stepPrivacyGateInbound(normalized);

      // 3. Resolve Org + Tenant
      const org = this.stepResolveOrgTenant(gated);

      // 4. Load Minimal Context
      const ctx = this.stepLoadMinimalContext(org);

      // 5. Build Brain Input
      const brainInput = this.stepBuildBrainInput(
        org,
        ctx,
        testMsg.message
      );

      // 6. Brain Decision (mock LLM)
      const httpResponse = this.stepBrainDecision(brainInput);

      // 7. Parse and Validate
      const parsed = this.stepParseContract(httpResponse, brainInput);

      // 8. Insert Inbound Message
      const inboundMsg = this.stepInsertInboundMessage(parsed);

      // 9. Route by Intent
      const routed = this.stepRouteByIntent(parsed, inboundMsg);

      // 10. Memory Writes
      const withMemory = this.stepMemoryWrites(routed);

      // 11. Privacy Gate Outbound
      const gatedOut = this.stepPrivacyGateOutbound(withMemory);

      // 12. Insert Outbound Message
      const withOutbound = this.stepInsertOutboundMessage(gatedOut);

      // 13. Telegram Send
      const withTelegram = this.stepTelegramSend(withOutbound);

      // 14. Final Output
      const finalOutput = this.stepFinalOutput(withTelegram);

      // Check result
      const actualIntent = parsed.decision.intent;
      const passed = actualIntent === testMsg.expectedIntent;

      if (passed) {
        this.stats.passed++;
        console.log(`\n✓ PASS`);
      } else {
        this.stats.failed++;
        console.log(`\n✗ FAIL`);
        console.log(
          `  Expected intent: ${testMsg.expectedIntent}`
        );
        console.log(`  Actual intent: ${actualIntent}`);
      }

      console.log(`\nFinal Response: "${finalOutput.response}"`);
      console.log(`Decision Branch: ${finalOutput.branch_exercised}`);
      console.log(`Memory Writes: ${finalOutput.memory_writes_count}`);

      if (!this.stats.byIntent[actualIntent]) {
        this.stats.byIntent[actualIntent] = { passed: 0, failed: 0 };
      }
      if (passed) {
        this.stats.byIntent[actualIntent].passed++;
      } else {
        this.stats.byIntent[actualIntent].failed++;
      }

      this.results.push({
        testId: testMsg.id,
        message: testMsg.message,
        expectedIntent: testMsg.expectedIntent,
        actualIntent: actualIntent,
        passed: passed,
        finalOutput: finalOutput,
        log: this.log
      });

      return { passed, finalOutput };
    } catch (err) {
      console.log(`\n✗ EXCEPTION: ${err.message}`);
      this.stats.failed++;
      if (!this.stats.byIntent['ERROR']) {
        this.stats.byIntent['ERROR'] = { passed: 0, failed: 0 };
      }
      this.stats.byIntent['ERROR'].failed++;

      this.results.push({
        testId: testMsg.id,
        message: testMsg.message,
        expectedIntent: testMsg.expectedIntent,
        actualIntent: 'ERROR',
        passed: false,
        error: err.message,
        log: this.log
      });

      return { passed: false, error: err.message };
    }
  }

  // Print coverage summary
  printCoverageSummary() {
    console.log(`\n${'='.repeat(80)}`);
    console.log('COVERAGE SUMMARY');
    console.log(`${'='.repeat(80)}`);

    const intentNames = [
      'create_task',
      'create_reminder',
      'cancel_task',
      'cancel_reminder',
      'list_tasks',
      'list_reminders',
      'save_improvement_request',
      'search_memory',
      'general_response',
      'clarify',
      'none',
      'update_task',
      'complete_task',
      'update_reminder'
    ];

    console.log('\nIntents Exercised:');
    intentNames.forEach(intent => {
      if (this.branchesExercised.has(intent)) {
        console.log(`  ✓ ${intent}`);
      } else {
        console.log(`  ✗ ${intent}`);
      }
    });

    console.log(`\nTotal Exercised: ${this.branchesExercised.size} / ${intentNames.length}`);
  }

  // Print statistics
  printStats() {
    console.log(`\n${'='.repeat(80)}`);
    console.log('TEST STATISTICS');
    console.log(`${'='.repeat(80)}`);

    console.log(
      `\nOverall: ${this.stats.passed}/${this.stats.total} PASSED (${Math.round(
        (this.stats.passed / this.stats.total) * 100
      )}%)`
    );

    console.log('\nBy Intent:');
    Object.entries(this.stats.byIntent).forEach(([intent, counts]) => {
      const total = counts.passed + counts.failed;
      const pct = Math.round((counts.passed / total) * 100);
      console.log(
        `  ${intent}: ${counts.passed}/${total} (${pct}%)`
      );
    });
  }

  // Run all tests
  runAll() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  COMPREHENSIVE N8N SANDBOX SIMULATOR                                       ║');
    console.log('║  brain_main_inbound_mvp_v3_memory_write.json                               ║');
    console.log('║  Full message flow: Input → Parser → Intent → Action → Memory → Output    ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    TEST_MESSAGES.forEach(testMsg => {
      const log_backup = this.log;
      this.log = [];
      this.runTest(testMsg);
      this.log = log_backup;
    });

    this.printCoverageSummary();
    this.printStats();

    console.log(`\n${'='.repeat(80)}`);
    console.log('FINAL OUTPUT SAMPLES');
    console.log(`${'='.repeat(80)}`);

    // Show a few sample final outputs
    [0, 3, 11].forEach(idx => {
      if (this.results[idx]) {
        const r = this.results[idx];
        console.log(
          `\nTest #${r.testId}: "${r.message.substring(0, 50)}..."`
        );
        console.log(`  Intent: ${r.actualIntent}`);
        console.log(
          `  Response: "${(r.finalOutput.response || 'N/A').substring(
            0,
            60
          )}..."`
        );
        if (r.finalOutput.memory_writes_count > 0) {
          console.log(`  Memory Writes: ${r.finalOutput.memory_writes_count}`);
        }
      }
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log('SANDBOX COMPLETE');
    console.log(`${'='.repeat(80)}`);
  }

  // Run a single test by ID
  runSingle(testId) {
    const testMsg = TEST_MESSAGES.find(t => t.id === testId);
    if (!testMsg) {
      console.error(`Test #${testId} not found`);
      process.exit(1);
    }

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  COMPREHENSIVE N8N SANDBOX SIMULATOR — SINGLE TEST                         ║');
    console.log('║  brain_main_inbound_mvp_v3_memory_write.json                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    const { passed, finalOutput, error } = this.runTest(testMsg);

    if (passed) {
      console.log(`\n✓ TEST PASSED`);
    } else {
      console.log(`\n✗ TEST FAILED`);
      if (error) console.log(`  Error: ${error}`);
    }

    console.log(`\n${'='.repeat(80)}`);
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

function main() {
  const simulator = new SandboxSimulator();

  const arg = process.argv[2];
  if (arg && !isNaN(arg)) {
    const testId = parseInt(arg, 10);
    simulator.runSingle(testId);
  } else {
    simulator.runAll();
  }
}

main();
