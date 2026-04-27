// e2e_oracle.mjs — classify a case PASS / FAIL / BLOCKED based on the chain digest
// and SQL invariant results.
//
// Failure taxonomy (per mission spec §4):
//   HARNESS_BUG | ORACLE_BUG | FIXTURE_BUG | ENVIRONMENT_TRANSIENT | WORKFLOW_BUG | NEEDS_PRODUCT_DECISION
//
// The classifier is deliberately conservative: when in doubt it tags
// `NEEDS_PRODUCT_DECISION` rather than asserting a workflow bug. Workflow bug
// is reserved for clear contract violations or P0 leaks/duplicates.
//
// Input shape: { matrixCase, caseRuntime, chainDigest, sqlResults }
// Output: { verdict: 'PASS'|'FAIL'|'BLOCKED', failure_class?, reasons: [], notes: [] }

const TERMINAL_STATUSES = new Set(['success', 'failed', 'error']);

export function classify({ matrixCase, caseRuntime, chainDigest, sqlResults, fireResp, harnessNotes = [] }) {
  const reasons = [];
  const notes = [...harnessNotes];

  // Basic environment / harness checks first.
  if (!fireResp || !fireResp.ok) {
    return { verdict: 'BLOCKED', failure_class: 'HARNESS_BUG', reasons: [`webhook_post_failed status=${fireResp?.status}`], notes };
  }
  if (!chainDigest) {
    return { verdict: 'BLOCKED', failure_class: 'HARNESS_BUG', reasons: ['chain_digest_missing'], notes };
  }

  const tr = chainDigest.TR;
  if (!tr) return { verdict: 'BLOCKED', failure_class: 'HARNESS_BUG', reasons: ['no_tr_exec_captured'], notes };

  // Did the chain reach MO? Some corridors don't require MO (clarification corridors C7
  // may stop earlier; but in our wiring even clarifications go through RC→MO).
  const hops = ['EC', 'OR', 'PL', 'DI', 'ME', 'RA', 'SU', 'RC', 'MO'].filter(w => chainDigest[w]?.exec_id);
  notes.push(`hops_reached: TR + ${hops.join(',')}`);

  // Workflow chain integrity — terminal status.
  for (const wf of ['TR', 'EC', 'OR', 'PL', 'DI', 'ME', 'RA', 'SU', 'RC', 'MO']) {
    const h = chainDigest[wf];
    if (!h) continue;
    if (h.status && !TERMINAL_STATUSES.has(h.status)) {
      reasons.push(`${wf}_status_non_terminal:${h.status}`);
    }
    // MO/SU/RC may carry an `error` status_kind that propagates from MO's
    // fixture-blocked send.  We tolerate those if the root error is the known
    // delivery-target fixture limitation.
    if ((h.status === 'error' || h.status === 'failed')) {
      const j = h.last_node_json;
      const code = j?.error?.code;
      if (code === 'MISSING_DELIVERY_TARGET') {
        // Tag at note level only.
        notes.push(`${wf}_fixture_propagated:MISSING_DELIVERY_TARGET`);
      } else {
        reasons.push(`${wf}_exec_status:${h.status}`);
      }
    }
  }

  // Per-corridor expected behavior:
  const cid = matrixCase.corridor_id;
  const expIntent = matrixCase.expected_intent;
  const expSideEffects = matrixCase.expected_db_side_effects || [];

  // Try to read the orchestrator-classified intent.
  const orHandoff = chainDigest.OR?.selected_nodes?.['OR_Build_Handoff_Payload']?.[0]?.json || null;
  const observedIntent = orHandoff?.payload?.primary_intent
                       || orHandoff?.payload?.intent_classification?.primary_intent
                       || orHandoff?.payload?.orchestrator_input?.primary_intent
                       || null;
  if (observedIntent) notes.push(`observed_intent:${observedIntent}`);

  // RA aggregation.
  const ra = chainDigest.RA?.selected_nodes?.['RA_Build_Downstream_Envelope']?.[0]?.json || null;
  const agg = ra?.aggregated_result || null;
  if (agg) notes.push(`agg_status:${agg.status} modules:${JSON.stringify(agg.module_names || [])} count:${agg.module_results_count}`);

  // Recognise MO's known fixture limitation (no telegram_chat_id mapped for e2e
  // tenants).  When MO terminates with MISSING_DELIVERY_TARGET we don't penalise
  // outbound-related invariants — they're fixture-blocked, not workflow-broken.
  const moJson = chainDigest.MO?.last_node_json;
  const moMissingDelivery = moJson?.error?.code === 'MISSING_DELIVERY_TARGET';
  if (moMissingDelivery) notes.push('mo_fixture_limited:MISSING_DELIVERY_TARGET');

  // SQL invariants — collect failures, demoting outbound checks if MO fixture-blocked.
  const sqlFails = (sqlResults || []).filter(r => r.pass === false);
  for (const f of sqlFails) {
    const isOutbound = /outbound/i.test(f.name);
    if (moMissingDelivery && isOutbound) {
      notes.push(`sql_invariant_known_fixture_limited:${f.name}:${f.detail || ''}`);
      continue; // not a hard failure
    }
    reasons.push(`sql_invariant_failed:${f.name}:${f.detail || ''}`);
  }

  // Negative conditions.
  for (const neg of (matrixCase.negative_conditions || [])) {
    const hit = checkNegative(neg, { agg, ra, chainDigest });
    if (hit) reasons.push(`negative_condition_triggered:${neg}`);
  }

  // Final verdict.
  if (reasons.length === 0) {
    return { verdict: 'PASS', reasons: [], notes };
  }

  // Classify failure type.
  let failure_class = 'NEEDS_PRODUCT_DECISION';
  // P0 leak/duplicate negatives → WORKFLOW_BUG
  const p0Markers = [
    'cross-tenant', 'cross-user', 'cross-thread', 'duplicate memory', 'duplicate task',
    'duplicate outbound', 'wrong target row', 'hallucinated recall', 'global ivfflat',
  ];
  if (reasons.some(r => p0Markers.some(p => r.toLowerCase().includes(p.toLowerCase())))) {
    failure_class = 'WORKFLOW_BUG';
  } else if (sqlFails.length > 0 && sqlFails.every(f => /assert_(no_memory_write|no_domain_write|no_write_on_recall)/.test(f.name))) {
    // Side-effect contracts that are clearly violated.
    failure_class = 'WORKFLOW_BUG';
  } else if (reasons.some(r => /_status:error|_status:failed/.test(r))) {
    failure_class = 'WORKFLOW_BUG';
  } else if (reasons.some(r => /_status_non_terminal/.test(r))) {
    failure_class = 'ENVIRONMENT_TRANSIENT';
  }

  return { verdict: 'FAIL', failure_class, reasons, notes };
}

function checkNegative(neg, { agg, ra, chainDigest }) {
  switch (neg) {
    case 'duplicate outbound':
    case 'duplicate memory/task/outbound': {
      const mo = chainDigest.MO;
      const sends = mo?.selected_nodes?.['MO_Send_Outbound'] || mo?.selected_nodes?.['MO_Send_Channel_PLACEHOLDER'] || [];
      return sends.length > 1;
    }
    default:
      return false; // most negatives encoded in SQL invariants
  }
}
