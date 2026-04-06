// Parse and Validate Brain Contract — final audited version
// Contract: brain-decision-v1 (14 intents)
// Fixes applied: B1 (conversion data transfer), B2 (create_reminder cleanup),
//   N1 (priority default), N2 (due_type inference), date field mutual exclusion,
//   __intent_hint removed, trim() on all strings

const httpResponse = $input.first().json;
const ctx = $('Build Brain Input').first().json;

const VALID_INTENTS = [
  'create_task', 'update_task', 'complete_task', 'cancel_task', 'list_tasks',
  'create_reminder', 'update_reminder', 'cancel_reminder', 'list_reminders',
  'search_memory', 'general_response', 'clarify', 'save_improvement_request', 'none'
];
const VALID_TASK_PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const VALID_TASK_DUE_TYPES = ['flexible', 'date', 'datetime'];
const VALID_FALLBACK_DUE_TYPES = ['date', 'datetime'];
const VALID_FILTER_SCOPES = [
  'all',
  'today',
  'tomorrow',
  'day_after_tomorrow',
  'overdue',
  'urgent',
  'high',
  'this_week',
  'this_month'
, 'until_today'];
const VALID_MEMORY_TYPES = ['fact', 'insight', 'advice'];
const VALID_MEMORY_CATEGORIES = ['business_profile', 'customer_market', 'growth_context', 'entrepreneur_profile', 'relationship_history', 'operational_patterns', 'preferences', 'constraints'];

// === HELPER FUNCTIONS ===

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

// Strict structural normalization only — no business logic, no defaults
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
  if (text.includes('pana azi') || text.includes('până azi') || text.includes('pana astazi') || text.includes('până astăzi') || text.includes('pana acum') || text.includes('până acum')) return 'until_today';
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

// Builds a task_action from reminder_action data (for task+reminder disambiguation)
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

// === MAIN PARSING ===

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

  // === PHASE 1: Reject old contract / wrong version / invalid intent ===

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

    // === PHASE 2: Normalize all fields (structural only) ===

    decision.domain = typeof decision.domain === 'string' && decision.domain.trim() !== '' ? decision.domain.trim() : 'general';
    decision.response = typeof decision.response === 'string' ? decision.response.trim() : '';
    decision.debug_summary = typeof decision.debug_summary === 'string' ? decision.debug_summary.trim() : '';
    decision.requires_confirmation = !!decision.requires_confirmation;
    decision.requires_clarification = !!decision.requires_clarification;

    // Structural normalization — returns null when input is null
    decision.task_action = normalizeTaskAction(decision.task_action);
    decision.reminder_action = normalizeReminderAction(decision.reminder_action);
    decision.memory_action = normalizeMemoryAction(decision.memory_action);
    decision.improvement_request = normalizeImprovementRequest(decision.improvement_request);

    // task_fallback_rules validation
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

    // memory_writes validation (filter strategy — invalid items removed, valid preserved)
    decision.memory_writes = Array.isArray(decision.memory_writes) ? decision.memory_writes : [];
    decision.memory_writes = decision.memory_writes.filter(function(item) {
      if (!item || typeof item !== 'object') return false;
      if (!VALID_MEMORY_TYPES.includes(item.type)) return false;
      if (!VALID_MEMORY_CATEGORIES.includes(item.category)) return false;
      if (typeof item.content !== 'string' || item.content.trim() === '') return false;
      return true;
    });

    // === PHASE 3: List filter inference ===

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

    // === PHASE 3b: Cancel/delete filter inference (same logic as list) ===

    if (decision.intent === 'cancel_task') {
      const ta = decision.task_action || {};
      if (!ta.id && !ta.title && !ta.filter_scope) {
        if (!decision.task_action) decision.task_action = normalizeTaskAction({});
        decision.task_action.filter_scope = inferFilterScopeFromMessage(ctx.raw_user_message);
      }
    }

    if (decision.intent === 'cancel_reminder') {
      const ra = decision.reminder_action || {};
      if (!ra.id && !ra.title && !ra.filter_scope) {
        if (!decision.reminder_action) decision.reminder_action = normalizeReminderAction({});
        decision.reminder_action.filter_scope = inferFilterScopeFromMessage(ctx.raw_user_message);
      }
    }

    // === PHASE 4: Task vs Reminder disambiguation ===
    // Product rule 4: if both task and reminder language present, prefer TASK.
    // Do not ask clarify. Transfer data from reminder_action if task_action is missing.

    const hasTaskLanguage = messageImpliesTaskPreference(ctx.raw_user_message);
    const hasReminderLanguage = messageImpliesReminderPreference(ctx.raw_user_message);

    if (hasTaskLanguage && hasReminderLanguage) {
      // Step 1: flip intent
      if (decision.intent === 'create_reminder') {
        decision.intent = 'create_task';
      }

      // Step 2: if task_action is missing/empty, build from reminder data
      if (
        decision.intent === 'create_task' &&
        (!decision.task_action || !decision.task_action.title) &&
        decision.reminder_action &&
        decision.reminder_action.title
      ) {
        decision.task_action = buildTaskActionFromReminder(decision.reminder_action);
      }

      // Step 3: clean reminder for create_task
      if (decision.intent === 'create_task') {
        decision.reminder_action = null;
      }
    }

    // === PHASE 5: Intent-specific validation ===

    if (decision.intent === 'create_task') {
      if (!decision.task_action || !decision.task_action.title) {
        decision = makeClarify('missing_task_action_title_for_create_task');
      } else {
        // Business defaults for create_task only
        if (!decision.task_action.priority) {
          decision.task_action.priority = 'normal';
        }

        // Infer due_type from available date fields
        if (!decision.task_action.due_type) {
          if (decision.task_action.due_at) decision.task_action.due_type = 'datetime';
          else if (decision.task_action.due_date) decision.task_action.due_type = 'date';
          else decision.task_action.due_type = 'flexible';
        }

        // Clear contradictory date fields
        if (decision.task_action.due_type === 'date') {
          decision.task_action.due_at = null;
        }
        if (decision.task_action.due_type === 'datetime') {
          decision.task_action.due_date = null;
        }

        // create_task must not carry reminder data
        decision.reminder_action = null;
      }
    }

    if (decision.intent === 'update_task' || decision.intent === 'complete_task' || decision.intent === 'cancel_task') {
      if (!decision.task_action) {
        decision = makeClarify('missing_task_action_for_' + decision.intent);
      }
      // semantic matching without id is allowed downstream
    }

    if (decision.intent === 'create_reminder') {
      if (!decision.reminder_action || !decision.reminder_action.title || !decision.reminder_action.remind_at) {
        decision = makeClarify('missing_reminder_action_for_create_reminder');
      } else {
        if (decision.task_action && !hasTaskLanguage) {
          decision = makeClarify(
            'create_reminder_should_not_also_create_task',
            'Vrei să creez un reminder sau un task pentru asta?'
          );
        } else {
          // create_reminder must not carry task data
          decision.task_action = null;
          decision.task_fallback_rules = [];
        }
      }
    }

    if (decision.intent === 'update_reminder' || decision.intent === 'cancel_reminder') {
      if (!decision.reminder_action) {
        decision = makeClarify('missing_reminder_action_for_' + decision.intent);
      }
      // semantic matching without id is allowed downstream
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

    // === PHASE 6: Clean operational payloads for non-action intents ===

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

return [{
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
}];
