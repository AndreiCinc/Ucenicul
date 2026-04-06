/**
 * Test Harness for parse_contract_final.js — Phase 1 (parser only)
 *
 * USAGE: node test_parser.js [suite_name_or_test_id]
 *   node test_parser.js              → runs all suites
 *   node test_parser.js suite_a      → runs only Suite A
 *   node test_parser.js A1           → runs only test A1
 */

const fs = require('fs');
const path = require('path');

// === LOAD FIXTURE ===
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test_context.json'), 'utf8'));

// === BUILD PARSER FUNCTION ===
// The parser depends on n8n's $input and $() — we create a self-contained version

function buildParser() {
  let code = fs.readFileSync(path.join(__dirname, '../parse_contract_final.js'), 'utf8');

  // We wrap the entire parser in a function that receives httpResponse and ctx as params
  // and returns the decision object

  const wrapped = `
(function(httpResponse, ctx) {
  // === CONSTANTS (extracted from parser) ===

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
    text = text.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, '').trim();

    decision = JSON.parse(text);

    if (
      decision.task !== undefined || decision.reminder !== undefined ||
      decision.memory_candidate !== undefined || decision.response_text !== undefined ||
      decision.confidence !== undefined
    ) {
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

      // PHASE 3: List filter inference
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

      // PHASE 4: Task vs Reminder disambiguation
      const hasTaskLanguage = messageImpliesTaskPreference(ctx.raw_user_message);
      const hasReminderLanguage = messageImpliesReminderPreference(ctx.raw_user_message);

      if (hasTaskLanguage && hasReminderLanguage) {
        if (decision.intent === 'create_reminder') {
          decision.intent = 'create_task';
        }
        if (decision.intent === 'create_task' && (!decision.task_action || !decision.task_action.title) && decision.reminder_action && decision.reminder_action.title) {
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
        if (!decision.task_action) {
          decision = makeClarify('missing_task_action_for_' + decision.intent);
        }
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

  return decision;
})
`;

  return eval(wrapped);
}

// === LOAD PARSER ===
let parser;
try {
  parser = buildParser();
} catch (e) {
  console.error('FATAL: Cannot build parser:', e.message);
  process.exit(1);
}

// === TEST RUNNER ===

function runTest(testCase) {
  const ctx = { ...fixture, raw_user_message: testCase.input };

  // Support llm_response_raw (raw string) or llm_response (JSON object)
  let httpResponse;
  if (testCase.llm_response_raw !== undefined) {
    httpResponse = testCase.llm_response_raw; // Pass raw string directly
  } else {
    httpResponse = {
      choices: [{ message: { content: JSON.stringify(testCase.llm_response) } }]
    };
  }

  try {
    const decision = parser(httpResponse, ctx);
    const checks = [];

    if (testCase.expected.intent) {
      checks.push({ field: 'intent', expected: testCase.expected.intent, actual: decision.intent, pass: decision.intent === testCase.expected.intent });
    }
    if (testCase.expected.domain) {
      checks.push({ field: 'domain', expected: testCase.expected.domain, actual: decision.domain, pass: decision.domain === testCase.expected.domain });
    }
    if (testCase.expected.filter_scope) {
      const scope = decision.task_action?.filter_scope || decision.reminder_action?.filter_scope || null;
      checks.push({ field: 'filter_scope', expected: testCase.expected.filter_scope, actual: scope, pass: scope === testCase.expected.filter_scope });
    }
    if (testCase.expected.has_task_action !== undefined) {
      const has = decision.task_action !== null;
      checks.push({ field: 'has_task_action', expected: testCase.expected.has_task_action, actual: has, pass: has === testCase.expected.has_task_action });
    }
    if (testCase.expected.has_reminder_action !== undefined) {
      const has = decision.reminder_action !== null;
      checks.push({ field: 'has_reminder_action', expected: testCase.expected.has_reminder_action, actual: has, pass: has === testCase.expected.has_reminder_action });
    }
    if (testCase.expected.has_improvement_request !== undefined) {
      const has = decision.improvement_request !== null;
      checks.push({ field: 'has_improvement_request', expected: testCase.expected.has_improvement_request, actual: has, pass: has === testCase.expected.has_improvement_request });
    }
    if (testCase.expected.has_memory_action !== undefined) {
      const has = decision.memory_action !== null && decision.memory_action.query !== '';
      checks.push({ field: 'has_memory_action', expected: testCase.expected.has_memory_action, actual: has, pass: has === testCase.expected.has_memory_action });
    }
    if (testCase.expected.no_forbidden_fields) {
      const bad = decision.task !== undefined || decision.reminder !== undefined || decision.memory_candidate !== undefined || decision.response_text !== undefined || decision.confidence !== undefined;
      checks.push({ field: 'no_forbidden_fields', expected: true, actual: !bad, pass: !bad });
    }
    if (testCase.expected.requires_clarification !== undefined) {
      checks.push({ field: 'requires_clarification', expected: testCase.expected.requires_clarification, actual: decision.requires_clarification, pass: decision.requires_clarification === testCase.expected.requires_clarification });
    }
    if (testCase.expected.debug_contains) {
      const has = (decision.debug_summary || '').includes(testCase.expected.debug_contains);
      checks.push({ field: 'debug_contains', expected: testCase.expected.debug_contains, actual: decision.debug_summary, pass: has });
    }
    if (testCase.expected.task_has_title !== undefined) {
      const has = decision.task_action?.title != null && decision.task_action.title !== '';
      checks.push({ field: 'task_has_title', expected: testCase.expected.task_has_title, actual: has, pass: has === testCase.expected.task_has_title });
    }
    if (testCase.expected.task_title) {
      const t = decision.task_action?.title || null;
      checks.push({ field: 'task_title', expected: testCase.expected.task_title, actual: t, pass: t === testCase.expected.task_title });
    }
    if (testCase.expected.task_priority) {
      const p = decision.task_action?.priority || null;
      checks.push({ field: 'task_priority', expected: testCase.expected.task_priority, actual: p, pass: p === testCase.expected.task_priority });
    }
    if (testCase.expected.task_due_type) {
      const d = decision.task_action?.due_type || null;
      checks.push({ field: 'task_due_type', expected: testCase.expected.task_due_type, actual: d, pass: d === testCase.expected.task_due_type });
    }
    if (testCase.expected.task_due_at_null !== undefined) {
      const isNull = decision.task_action?.due_at === null;
      checks.push({ field: 'task_due_at_null', expected: testCase.expected.task_due_at_null, actual: isNull, pass: isNull === testCase.expected.task_due_at_null });
    }
    if (testCase.expected.reminder_has_title !== undefined) {
      const has = decision.reminder_action?.title != null && decision.reminder_action.title !== '';
      checks.push({ field: 'reminder_has_title', expected: testCase.expected.reminder_has_title, actual: has, pass: has === testCase.expected.reminder_has_title });
    }
    if (testCase.expected.reminder_has_remind_at !== undefined) {
      const has = decision.reminder_action?.remind_at != null;
      checks.push({ field: 'reminder_has_remind_at', expected: testCase.expected.reminder_has_remind_at, actual: has, pass: has === testCase.expected.reminder_has_remind_at });
    }
    if (testCase.expected.has_memory_writes !== undefined) {
      const has = Array.isArray(decision.memory_writes) && decision.memory_writes.length > 0;
      checks.push({ field: 'has_memory_writes', expected: testCase.expected.has_memory_writes, actual: has, pass: has === testCase.expected.has_memory_writes });
    }
    if (testCase.expected.memory_writes_empty !== undefined) {
      const empty = !Array.isArray(decision.memory_writes) || decision.memory_writes.length === 0;
      checks.push({ field: 'memory_writes_empty', expected: testCase.expected.memory_writes_empty, actual: empty, pass: empty === testCase.expected.memory_writes_empty });
    }
    if (testCase.expected.has_fallback_rules !== undefined) {
      const has = Array.isArray(decision.task_fallback_rules) && decision.task_fallback_rules.length > 0;
      checks.push({ field: 'has_fallback_rules', expected: testCase.expected.has_fallback_rules, actual: has, pass: has === testCase.expected.has_fallback_rules });
    }
    if (testCase.expected.fallback_rules_empty !== undefined) {
      const empty = !Array.isArray(decision.task_fallback_rules) || decision.task_fallback_rules.length === 0;
      checks.push({ field: 'fallback_rules_empty', expected: testCase.expected.fallback_rules_empty, actual: empty, pass: empty === testCase.expected.fallback_rules_empty });
    }

    const allPass = checks.every(c => c.pass);
    const status = allPass ? 'PASS' : checks.some(c => c.pass) ? 'PARTIAL' : 'FAIL';

    return { id: testCase.id, status, checks, decision };
  } catch (e) {
    return { id: testCase.id, status: 'ERROR', error: e.message, checks: [] };
  }
}

function runSuite(filter) {
  const suiteDir = path.join(__dirname, 'test_cases');
  const files = fs.readdirSync(suiteDir).filter(f => f.endsWith('.json')).sort();

  let totalPass = 0, totalPartial = 0, totalFail = 0, totalError = 0;
  const results = [];

  for (const file of files) {
    if (filter && !(/^[A-Z]+\d+$/i.test(filter)) && !file.includes(filter.toLowerCase())) continue;

    const suite = JSON.parse(fs.readFileSync(path.join(suiteDir, file), 'utf8'));
    for (const tc of suite.tests) {
      if (filter && /^[A-Z]+\d+$/i.test(filter) && tc.id !== filter.toUpperCase()) continue;

      const result = runTest(tc);
      results.push(result);

      const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : result.status === 'ERROR' ? '💥' : '❌';
      console.log(`${icon} ${result.id}: ${result.status}`);
      if (result.status !== 'PASS') {
        for (const c of (result.checks || []).filter(c => !c.pass)) {
          console.log(`   ${c.field}: expected=${JSON.stringify(c.expected)} actual=${JSON.stringify(c.actual)}`);
        }
        if (result.error) console.log(`   ERROR: ${result.error}`);
      }

      if (result.status === 'PASS') totalPass++;
      else if (result.status === 'PARTIAL') totalPartial++;
      else if (result.status === 'ERROR') totalError++;
      else totalFail++;
    }
  }

  console.log('\\n' + '='.repeat(60));
  console.log(`TOTAL: ${results.length} | ✅ ${totalPass} PASS | ⚠️ ${totalPartial} PARTIAL | ❌ ${totalFail} FAIL | 💥 ${totalError} ERROR`);
  console.log('='.repeat(60));

  fs.writeFileSync(path.join(__dirname, 'last_run.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    filter,
    summary: { total: results.length, pass: totalPass, partial: totalPartial, fail: totalFail, error: totalError },
    results: results.map(r => ({ id: r.id, status: r.status, checks: r.checks, error: r.error }))
  }, null, 2));

  return results;
}

const arg = process.argv[2] || null;
runSuite(arg);
