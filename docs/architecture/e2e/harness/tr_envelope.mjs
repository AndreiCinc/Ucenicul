// tr_envelope.mjs — build a ThreadResolutionRequest (flat shape) from a matrix case.
//
// The flat shape is canonical (per workflows/WF-TR-01_Thread_Resolver/docs/contracts/
// ThreadResolutionContracts.md §1).
//
// Idempotency key prefix per case is what binds invariants to rows in DB.

import { createHash } from 'node:crypto';

// E2E tenant lanes — never overlap with real tenants.
export const E2E = {
  RUN_TAG: process.env.E2E_RUN_TAG || `r${new Date().toISOString().replace(/[:.TZ-]/g, '').slice(0, 14)}`,
  TENANT_DEFAULT: 'eee0e2e0-0000-0000-0000-000000000001',
  TENANT_A:       'eee0e2e0-0000-0000-0000-00000000000a',
  TENANT_B:       'eee0e2e0-0000-0000-0000-00000000000b',
  CHANNEL: 'e2e-rich-matrix',
};

// Deterministic UUID-like string from a seed.
export function detUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}

// Pick the test tenant for a case based on its variant.
export function pickTenant(matrixCase) {
  const v = matrixCase.variant || '';
  if (v.startsWith('tenant_A_')) return E2E.TENANT_A;
  if (v.startsWith('tenant_B_')) return E2E.TENANT_B;
  return E2E.TENANT_DEFAULT;
}

// Logical thread label for seeding.  Cases sharing a label share a thread.
export function pickThreadLabel(matrixCase) {
  const v = matrixCase.variant || '';
  const cor = matrixCase.corridor_id;
  if (cor === 'C9') {
    if (v === 'thread_A_seed') return `${cor}:A`;
    if (v === 'thread_B_durable_recall' || v === 'thread_B_operational_continue_negative' || v === 'thread_C_ambiguous_reference') return `${cor}:B`;
  }
  if (cor === 'C8') {
    if (v === 'message_1_seed_thread' || v === 'message_2_followup_same_thread') return `${cor}:cont`;
    if (v === 'new_thread_negative_control') return `${cor}:neg`;
    if (v === 'reply_to_existing_message') return `${cor}:reply`;
  }
  if (cor === 'C11' && /first_delivery|duplicate_delivery_|late_retry_/.test(v)) {
    return `${cor}:replay-L${matrixCase.level}`;
  }
  if (cor === 'C10') {
    if (v.startsWith('tenant_A_')) return `${cor}:A`;
    if (v.startsWith('tenant_B_')) return `${cor}:B`;
  }
  return `${cor}:${matrixCase.case_id}`;
}

export function deriveThreadId(matrixCase, runTag) {
  const label = pickThreadLabel(matrixCase);
  return detUuid(`${runTag}|thread|${label}`);
}

// Idempotency key — replay variants share the key with the first delivery.
export function deriveIdempotencyKey(matrixCase, runTag) {
  const v = matrixCase.variant || '';
  const cor = matrixCase.corridor_id;
  if (cor === 'C11' && /duplicate_delivery_|late_retry_/.test(v)) {
    return `e2e:${runTag}:${cor}-L${matrixCase.level}-replay`;
  }
  return `e2e:${runTag}:${matrixCase.case_id}`;
}

// Pick a thread-context kind for tracking.
export function pickThreadContext(matrixCase) {
  const v = matrixCase.variant || '';
  if (v === 'message_2_followup_same_thread') return { kind: 'continue' };
  if (v === 'reply_to_existing_message') return { kind: 'reply' };
  if (v === 'duplicate_delivery_1' || v === 'duplicate_delivery_2' || v === 'late_retry_after_state_change') return { kind: 'replay' };
  if (v === 'new_thread_negative_control') return { kind: 'fresh-no-seed' };
  return { kind: 'seeded-fresh' };
}

// Build the canonical TR ThreadResolutionRequest (flat shape).
export function buildTrEnvelope(matrixCase, caseRuntime) {
  const env = {
    message_id: caseRuntime.message_id,
    tenant_id: caseRuntime.tenant_id,
    channel: E2E.CHANNEL,
    direction: 'inbound',
    author_type: 'user',
    normalized_content: matrixCase.user_input,
    timestamp: caseRuntime.ts_iso,
    source_message_ref: `e2e:${matrixCase.case_id}:${caseRuntime.idempotency_key}`,
    author_entity_id: null,
    related_entity_ids: [],
    metadata: {
      e2e_case_id: matrixCase.case_id,
      e2e_corridor: matrixCase.corridor_id,
      e2e_variant: matrixCase.variant,
      e2e_phase: matrixCase.phase,
      e2e_priority: matrixCase.priority,
      e2e_locale: matrixCase.locale,
      e2e_run_tag: caseRuntime.run_tag,
    },
    idempotency_key: caseRuntime.idempotency_key,
  };
  if (caseRuntime.thread_id) env.thread_id = caseRuntime.thread_id;
  if (caseRuntime.reply_to_thread_id) env.reply_to_thread_id = caseRuntime.reply_to_thread_id;
  return env;
}

// Build the case-runtime context (tenant, thread, idempotency).
export function buildCaseRuntime(matrixCase, runTag, replayHint) {
  const tenant_id = pickTenant(matrixCase);
  const ctx = pickThreadContext(matrixCase);
  const baseSeed = `${runTag}|${matrixCase.case_id}|${matrixCase.corridor_id}`;
  const idempotency_key = (ctx.kind === 'replay' && replayHint?.idempotency_key)
    ? replayHint.idempotency_key
    : deriveIdempotencyKey(matrixCase, runTag);
  const message_id = (ctx.kind === 'replay' && replayHint?.message_id)
    ? replayHint.message_id
    : detUuid(`${baseSeed}|msg`);
  const wantsFresh = (matrixCase.variant === 'new_thread_negative_control');
  const thread_id = replayHint?.thread_id || (wantsFresh ? null : deriveThreadId(matrixCase, runTag));
  const reply_to_thread_id = replayHint?.reply_to_thread_id || null;
  return {
    tenant_id,
    message_id,
    thread_id,
    reply_to_thread_id,
    idempotency_key,
    thread_label: pickThreadLabel(matrixCase),
    ts_iso: new Date().toISOString(),
    run_tag: runTag,
    thread_context_kind: ctx.kind,
  };
}
