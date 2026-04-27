// intent_mapping.mjs — map matrix semantic intent → system intent vocabulary.
// Restored 2026-04-26 by FULL_240_VARIANT_SWEEP. File was truncated on disk.

const CORRIDOR_DEFAULT = {
  C1: 'briefing',
  C2: 'store_memory',
  C3: 'search_memory',
  C4: 'supersede_memory',
  C5: 'briefing',
  C6: 'create_task',
  C7: 'briefing',
  C8: 'briefing',
  C9: 'search_memory',
  C10: 'store_memory',
  C11: 'store_memory',
  C12: 'create_task',
};

function variantOverride(matrixCase) {
  const cor = matrixCase.corridor_id;
  const v = matrixCase.variant || '';
  if (cor === 'C9') {
    if (v === 'thread_A_seed') return 'store_memory';
    if (v === 'thread_B_durable_recall') return 'search_memory';
    if (v === 'thread_B_operational_continue_negative') return 'briefing';
    if (v === 'thread_C_ambiguous_reference') return 'briefing';
  }
  if (cor === 'C10') {
    if (v === 'tenant_A_seed' || v === 'tenant_B_seed') return 'store_memory';
    if (v === 'tenant_A_recall') return 'search_memory';
    if (v === 'tenant_B_cross_leak_probe') return 'search_memory';
  }
  if (cor === 'C11') return 'store_memory';
  if (cor === 'C8') {
    if (v === 'message_1_seed_thread') return 'create_task';
    if (v === 'message_2_followup_same_thread') return 'update_task';
    if (v === 'reply_to_existing_message') return 'create_task';
    if (v === 'new_thread_negative_control') return 'briefing';
  }
  if (cor === 'C12') {
    if (v === 'baseline_ro' || v === 'locale_en') return 'create_task';
    if (v === 'negative_or_boundary') return 'briefing';
    if (v === 'retry_or_isolation') return 'create_task';
  }
  return null;
}

export function getSystemIntent(matrixCase) {
  const o = variantOverride(matrixCase);
  if (o) return o;
  return CORRIDOR_DEFAULT[matrixCase.corridor_id] || 'briefing';
}

export function expectsDomainWrite(matrixCase) {
  const intent = getSystemIntent(matrixCase);
  return intent === 'create_task' || intent === 'create_reminder' || intent === 'update_task'
      || intent === 'store_memory' || intent === 'supersede_memory'
      || intent === 'save_suggestion';
}

export const SYSTEM_INTENTS = ['create_task', 'create_reminder', 'search_memory', 'save_suggestion', 'update_task', 'briefing', 'store_memory', 'supersede_memory'];
