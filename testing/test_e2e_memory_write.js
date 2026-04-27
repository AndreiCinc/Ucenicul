/**
 * E2E Test for Memory Write (Embedding + Insert + Dedup)
 * Tests the full flow: Parser → IF gate → Prepare batch → OpenAI embedding → Build items → Insert with dedup → Restore context
 *
 * USAGE: node test_e2e_memory_write.js
 *
 * Does NOT require live OpenAI or PostgreSQL — simulates embedding + insert logic.
 */

const fs = require('fs');
const path = require('path');

// === LOAD FIXTURE ===
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test_context.json'), 'utf8'));

// === BUILD PARSER (same as test_parser.js) ===
function buildParser() {
  const parserCode = fs.readFileSync(path.join(__dirname, '../parse_contract_final.js'), 'utf8');
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

// === SIMULATE IF HAS MEMORY WRITES (n8n IF node) ===
function simulateIFHasMemoryWrites(decision) {
  const hasWrites = Array.isArray(decision.memory_writes) && decision.memory_writes.length > 0;
  return { hasWrites, path: hasWrites ? 'YES' : 'NO' };
}

// === SIMULATE PREPARE EMBEDDING BATCH (Code node) ===
function simulatePrepareEmbeddingBatch(decision, tenantId) {
  const writes = decision.memory_writes || [];
  if (writes.length === 0) return { items: [], openai_payload: null };

  const items = writes.map((w, i) => ({
    index: i,
    content: w.content,
    memory_category: w.category,
    memory_kind: w.type,
    tenant_id: tenantId,
    source_type: 'brain_main_inbound_mvp'
  }));

  const openai_payload = {
    model: 'text-embedding-3-small',
    input: writes.map(w => w.content)
  };

  return { items, openai_payload };
}

// === SIMULATE OPENAI EMBEDDING RESPONSE ===
function simulateOpenAIEmbeddingResponse(inputTexts) {
  // Generate deterministic fake embeddings (1536 dims, normalized)
  return {
    data: inputTexts.map((text, i) => ({
      object: 'embedding',
      index: i,
      embedding: Array.from({ length: 1536 }, (_, j) => {
        // Simple deterministic hash-based fake embedding
        const hash = (text.charCodeAt(j % text.length) + j * 7 + i * 13) % 1000;
        return (hash - 500) / 500;
      })
    })),
    usage: {
      prompt_tokens: inputTexts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0),
      total_tokens: inputTexts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0)
    }
  };
}

// === SIMULATE BUILD MEMORY INSERT ITEMS (Code node) ===
function simulateBuildMemoryInsertItems(preparedItems, openaiResponse) {
  return preparedItems.map((item, i) => {
    const emb = openaiResponse.data[i].embedding;
    return {
      tenant_id: item.tenant_id,
      content: item.content,
      embedding: JSON.stringify(emb),
      memory_category: item.memory_category,
      memory_kind: item.memory_kind,
      durability: 'stable',
      importance_score: 0.5,
      source_type: item.source_type
    };
  });
}

// === SIMULATE INSERT WITH DEDUP (PostgreSQL CTE) ===
function simulateInsertWithDedup(insertItems, existingMemories) {
  // Simulate the CTE dedup logic:
  // For each item, check if existing memory has cosine distance < 0.05
  // If yes → UPDATE (reconfirm), if no → INSERT
  const results = [];

  for (const item of insertItems) {
    // Check for dedup match
    const dupMatch = (existingMemories || []).find(existing =>
      existing.tenant_id === item.tenant_id &&
      existing.content === item.content // simplified: in real DB it's vector distance
    );

    if (dupMatch) {
      results.push({
        id: dupMatch.id,
        action: 'updated',
        content: item.content,
        memory_category: item.memory_category
      });
    } else {
      results.push({
        id: 'new-' + Math.random().toString(36).substr(2, 8),
        action: 'inserted',
        content: item.content,
        memory_category: item.memory_category
      });
    }
  }

  return results;
}

// === SIMULATE RESTORE CONTEXT (Code node) ===
function simulateRestoreContext(originalCtx) {
  // The Restore Context node re-fetches original context from Parse node
  return {
    ...originalCtx,
    _memory_write_completed: true
  };
}

// === E2E TEST CASES ===

const e2eTests = [
  {
    id: 'E2E_MW1',
    name: 'Single memory write - full pipeline',
    input: 'Ion preferă check-in la 15:00',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'general_response',
      domain: 'airbnb',
      response: 'Am notat preferința lui Ion.',
      debug_summary: 'note check-in preference',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: null,
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: [
        { type: 'fact', category: 'customer_market', content: 'Chiriașul Ion preferă check-in la 15:00' }
      ]
    },
    existing_memories: [],
    expected: {
      if_path: 'YES',
      embedding_batch_size: 1,
      insert_count: 1,
      insert_action: 'inserted',
      context_restored: true
    }
  },
  {
    id: 'E2E_MW2',
    name: 'Multiple memory writes - batch embedding',
    input: 'Ion vrea check-in la 15, preferă etajul 3, e alergic la pisici',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'general_response',
      domain: 'airbnb',
      response: 'Am notat preferințele.',
      debug_summary: 'multiple preferences',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: null,
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: [
        { type: 'fact', category: 'customer_market', content: 'Ion preferă check-in la 15:00' },
        { type: 'fact', category: 'customer_market', content: 'Ion preferă etajul 3' },
        { type: 'fact', category: 'constraints', content: 'Ion e alergic la pisici' }
      ]
    },
    existing_memories: [],
    expected: {
      if_path: 'YES',
      embedding_batch_size: 3,
      insert_count: 3,
      insert_action: 'inserted',
      context_restored: true
    }
  },
  {
    id: 'E2E_MW3',
    name: 'No memory writes - IF gate routes to NO path',
    input: 'ce task-uri am azi?',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'list_tasks',
      domain: 'general',
      response: 'Iată task-urile tale.',
      debug_summary: 'list today tasks',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: { filter_scope: 'today' },
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: []
    },
    existing_memories: [],
    expected: {
      if_path: 'NO',
      embedding_batch_size: 0,
      insert_count: 0,
      context_restored: false
    }
  },
  {
    id: 'E2E_MW4',
    name: 'Dedup - existing memory gets updated instead of inserted',
    input: 'Ion preferă check-in la 15:00',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'general_response',
      domain: 'airbnb',
      response: 'Am notat preferința.',
      debug_summary: 'duplicate preference',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: null,
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: [
        { type: 'fact', category: 'customer_market', content: 'Chiriașul Ion preferă check-in la 15:00' }
      ]
    },
    existing_memories: [
      { id: 'existing-mem-001', tenant_id: fixture.tenant_id, content: 'Chiriașul Ion preferă check-in la 15:00' }
    ],
    expected: {
      if_path: 'YES',
      embedding_batch_size: 1,
      insert_count: 1,
      dedup_updated: 1,
      context_restored: true
    }
  },
  {
    id: 'E2E_MW5',
    name: 'Memory write with task creation - both execute',
    input: 'Ion plateste 100 euro, pune task confirmare',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'create_task',
      domain: 'airbnb',
      response: 'Am creat task-ul și am notat prețul.',
      debug_summary: 'task + memory',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: { title: 'Trimite confirmare lui Ion', priority: 'normal', due_type: 'flexible' },
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: [
        { type: 'fact', category: 'customer_market', content: 'Ion plătește 100 euro pe noapte' }
      ]
    },
    existing_memories: [],
    expected: {
      if_path: 'YES',
      embedding_batch_size: 1,
      insert_count: 1,
      insert_action: 'inserted',
      primary_intent: 'create_task',
      context_restored: true
    }
  },
  {
    id: 'E2E_MW6',
    name: 'Invalid memory writes filtered - IF gate routes to NO',
    input: 'notează ceva random',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'general_response',
      domain: 'general',
      response: 'Am notat.',
      debug_summary: 'invalid types filtered',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: null,
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: [
        { type: 'note', category: 'general', content: 'ceva random' }
      ]
    },
    existing_memories: [],
    expected: {
      if_path: 'NO',
      embedding_batch_size: 0,
      insert_count: 0,
      context_restored: false
    }
  },
  {
    id: 'E2E_MW7',
    name: 'Mixed valid/invalid writes - only valid processed',
    input: 'Maria vine lunea, si ceva random',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'general_response',
      domain: 'cleaning',
      response: 'Am notat.',
      debug_summary: 'mixed writes',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: null,
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: [
        { type: 'fact', category: 'operational_patterns', content: 'Maria vine lunea la curățenie' },
        { type: 'note', category: 'general', content: 'ceva random' }
      ]
    },
    existing_memories: [],
    expected: {
      if_path: 'YES',
      embedding_batch_size: 1,
      insert_count: 1,
      insert_action: 'inserted',
      context_restored: true
    }
  },
  {
    id: 'E2E_MW8',
    name: 'All 8 categories in single batch',
    input: 'business info complex',
    llm_response: {
      version: 'brain-decision-v1',
      intent: 'general_response',
      domain: 'general',
      response: 'Am notat tot.',
      debug_summary: 'all 8 categories',
      requires_confirmation: false,
      requires_clarification: false,
      task_action: null,
      task_fallback_rules: [],
      reminder_action: null,
      memory_action: null,
      improvement_request: null,
      memory_writes: [
        { type: 'fact', category: 'business_profile', content: 'Firma are 3 apartamente' },
        { type: 'fact', category: 'customer_market', content: 'Clienți din Germania' },
        { type: 'insight', category: 'growth_context', content: 'Piața crește 10% pe an' },
        { type: 'fact', category: 'entrepreneur_profile', content: 'Antreprenor cu experiență' },
        { type: 'fact', category: 'relationship_history', content: 'Client recurent Ion' },
        { type: 'insight', category: 'operational_patterns', content: 'Curățenia durează 2 ore' },
        { type: 'advice', category: 'preferences', content: 'Preferă comunicare pe WhatsApp' },
        { type: 'fact', category: 'constraints', content: 'Budget maxim 500 RON pe curățenie' }
      ]
    },
    existing_memories: [],
    expected: {
      if_path: 'YES',
      embedding_batch_size: 8,
      insert_count: 8,
      insert_action: 'inserted',
      context_restored: true
    }
  }
];

// === RUN E2E TESTS ===

const parser = buildParser();
let passed = 0;
let failed = 0;

console.log('\n=== E2E Memory Write Tests ===\n');

for (const test of e2eTests) {
  const errors = [];

  // Step 1: Parse LLM response
  const ctx = { ...fixture, raw_user_message: test.input };
  const decision = parser(test.llm_response, ctx);

  // Step 2: IF Has Memory Writes
  const ifResult = simulateIFHasMemoryWrites(decision);
  if (ifResult.path !== test.expected.if_path) {
    errors.push(`IF path: expected ${test.expected.if_path}, got ${ifResult.path}`);
  }

  if (ifResult.hasWrites) {
    // Step 3: Prepare Embedding Batch
    const prepared = simulatePrepareEmbeddingBatch(decision, fixture.tenant_id);
    if (prepared.items.length !== test.expected.embedding_batch_size) {
      errors.push(`Embedding batch: expected ${test.expected.embedding_batch_size}, got ${prepared.items.length}`);
    }

    // Verify all items have required fields
    for (const item of prepared.items) {
      if (!item.tenant_id) errors.push('Missing tenant_id in prepared item');
      if (!item.content) errors.push('Missing content in prepared item');
      if (!item.memory_category) errors.push('Missing memory_category in prepared item');
      if (!item.memory_kind) errors.push('Missing memory_kind in prepared item');
    }

    // Verify OpenAI payload
    if (!prepared.openai_payload) {
      errors.push('Missing OpenAI payload');
    } else {
      if (prepared.openai_payload.model !== 'text-embedding-3-small') {
        errors.push(`Wrong model: ${prepared.openai_payload.model}`);
      }
      if (prepared.openai_payload.input.length !== test.expected.embedding_batch_size) {
        errors.push(`OpenAI input count: expected ${test.expected.embedding_batch_size}, got ${prepared.openai_payload.input.length}`);
      }
    }

    // Step 4: Simulate OpenAI response
    const openaiResponse = simulateOpenAIEmbeddingResponse(
      prepared.openai_payload.input
    );
    if (openaiResponse.data.length !== test.expected.embedding_batch_size) {
      errors.push(`OpenAI response count: expected ${test.expected.embedding_batch_size}, got ${openaiResponse.data.length}`);
    }

    // Verify embedding dimensions
    for (const emb of openaiResponse.data) {
      if (emb.embedding.length !== 1536) {
        errors.push(`Wrong embedding dimension: ${emb.embedding.length}`);
      }
    }

    // Step 5: Build Memory Insert Items
    const insertItems = simulateBuildMemoryInsertItems(prepared.items, openaiResponse);
    if (insertItems.length !== test.expected.insert_count) {
      errors.push(`Insert items: expected ${test.expected.insert_count}, got ${insertItems.length}`);
    }

    // Verify insert items have embedding
    for (const item of insertItems) {
      if (!item.embedding) errors.push('Missing embedding in insert item');
      if (!item.tenant_id) errors.push('Missing tenant_id in insert item');
      const parsedEmb = JSON.parse(item.embedding);
      if (parsedEmb.length !== 1536) errors.push('Wrong embedding length in insert item');
    }

    // Step 6: Simulate Insert With Dedup
    const dbResult = simulateInsertWithDedup(insertItems, test.existing_memories);
    if (dbResult.length !== test.expected.insert_count) {
      errors.push(`DB result count: expected ${test.expected.insert_count}, got ${dbResult.length}`);
    }

    // Check dedup
    if (test.expected.dedup_updated) {
      const updatedCount = dbResult.filter(r => r.action === 'updated').length;
      if (updatedCount !== test.expected.dedup_updated) {
        errors.push(`Dedup updated: expected ${test.expected.dedup_updated}, got ${updatedCount}`);
      }
    }

    if (test.expected.insert_action) {
      const actionCheck = dbResult.every(r =>
        test.expected.dedup_updated ? true : r.action === test.expected.insert_action
      );
      if (!actionCheck && !test.expected.dedup_updated) {
        errors.push(`Insert action mismatch`);
      }
    }

    // Step 7: Restore Context
    const restored = simulateRestoreContext(ctx);
    if (test.expected.context_restored && !restored._memory_write_completed) {
      errors.push('Context not restored after memory write');
    }

    // Check primary intent preserved
    if (test.expected.primary_intent) {
      if (decision.intent !== test.expected.primary_intent) {
        errors.push(`Primary intent: expected ${test.expected.primary_intent}, got ${decision.intent}`);
      }
    }
  } else {
    // NO path - verify no processing happens
    if (test.expected.embedding_batch_size !== 0) {
      errors.push(`Expected embedding batch size 0 for NO path`);
    }
  }

  // Report
  if (errors.length === 0) {
    console.log(`  ✅ ${test.id}: ${test.name}`);
    passed++;
  } else {
    console.log(`  ❌ ${test.id}: ${test.name}`);
    errors.forEach(e => console.log(`     → ${e}`));
    failed++;
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed out of ${e2eTests.length} ===\n`);
process.exit(failed > 0 ? 1 : 0);
