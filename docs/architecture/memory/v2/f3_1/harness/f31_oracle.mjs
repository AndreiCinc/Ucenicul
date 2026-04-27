// f31_oracle.mjs — pure oracle functions for the 4 F3.1 families.
//
// Contract:
//   oracle(case_spec, raw_artifact) -> {
//     verdict: 'PASS' | 'FAIL' | 'BLOCKED',
//     bucket:  'BAD_TEST_DEFINITION' | 'BAD_HARNESS' | 'RUNTIME_WORKFLOW_BUG' | 'EXTERNAL_BLOCKER' | null,
//     reason:  string,
//     observed: { ... selected fields ... },
//   }
//
// raw_artifact shape (written by the session into artifacts/runtime/):
//   {
//     case_id,
//     execution_id,
//     execution_status,            // raw n8n status: success|error|waiting
//     response_envelope,           // the action's result payload as returned
//     db_pre,                      // SQL rows from pre-execution checks
//     db_post,                     // SQL rows from post-execution checks
//     error,                       // optional: tool/transport error
//   }

function arraysEqualUnordered(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const bs = new Set(b);
  for (const x of a) if (!bs.has(x)) return false;
  return true;
}

function oracleSearch(c, raw) {
  const exp = c.expected_result_envelope;
  const env = raw.response_envelope || {};
  const obs = {
    status: env.status,
    used_embedding: env.used_embedding,
    embedding_attempted: env.embedding_attempted,
    embedding_error: env.embedding_error,
    recall: Array.isArray(env.recall_results) ? env.recall_results.length : (env.recall ?? null),
    pre_max: (raw.db_pre?.[0] || {}).pre_max,
    post_max: (raw.db_post?.[0] || {}).post_max,
  };
  if (raw.execution_status === 'error' && raw.error) {
    return { verdict: 'BLOCKED', bucket: 'EXTERNAL_BLOCKER', reason: `execute_workflow error: ${raw.error}`, observed: obs };
  }
  if (env.status !== 'success') {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `expected status=success, got ${env.status}`, observed: obs };
  }
  if (env.used_embedding !== exp.used_embedding) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `used_embedding=${env.used_embedding} expected ${exp.used_embedding}`, observed: obs };
  }
  if (env.embedding_attempted !== exp.embedding_attempted) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `embedding_attempted=${env.embedding_attempted} expected ${exp.embedding_attempted}`, observed: obs };
  }
  if (env.embedding_error !== exp.embedding_error) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `embedding_error=${JSON.stringify(env.embedding_error)} expected null`, observed: obs };
  }
  if ('recall' in exp) {
    if (obs.recall !== exp.recall) {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `recall_count=${obs.recall} expected ${exp.recall}`, observed: obs };
    }
  } else if ('recall_min' in exp) {
    if (obs.recall == null || obs.recall < exp.recall_min) {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `recall_count=${obs.recall} expected >= ${exp.recall_min}`, observed: obs };
    }
  }
  if (obs.pre_max && obs.post_max && obs.pre_max !== obs.post_max) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `DB mutated on read-only case: pre=${obs.pre_max} post=${obs.post_max}`, observed: obs };
  }
  return { verdict: 'PASS', bucket: null, reason: 'search oracle all checks pass', observed: obs };
}

function oracleRecall(c, raw) {
  const exp = c.expected_result_envelope;
  const env = raw.response_envelope || {};
  const obs = {
    status: env.status,
    applied_filters: env.applied_filters,
    row_count: Array.isArray(env.recall_results) ? env.recall_results.length : null,
    pre_max: (raw.db_pre?.[0] || {}).pre_max,
    post_max: (raw.db_post?.[0] || {}).post_max,
  };
  if (raw.execution_status === 'error' && raw.error) {
    return { verdict: 'BLOCKED', bucket: 'EXTERNAL_BLOCKER', reason: `execute_workflow error: ${raw.error}`, observed: obs };
  }
  if (env.status !== 'success') {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `expected status=success, got ${env.status}`, observed: obs };
  }
  if (!arraysEqualUnordered(env.applied_filters || [], exp.applied_filters_match)) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `applied_filters ${JSON.stringify(env.applied_filters)} ≠ ${JSON.stringify(exp.applied_filters_match)}`, observed: obs };
  }
  if (Array.isArray(env.recall_results) && env.recall_results.length > 1) {
    // Ordering check: created_at DESC.
    const ts = env.recall_results.map(r => r.created_at).filter(Boolean);
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] > ts[i - 1]) {
        return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `order violation at index ${i}: ${ts[i]} > ${ts[i - 1]}`, observed: obs };
      }
    }
  }
  if (obs.pre_max && obs.post_max && obs.pre_max !== obs.post_max) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `DB mutated on read-only case`, observed: obs };
  }
  return { verdict: 'PASS', bucket: null, reason: 'recall oracle all checks pass', observed: obs };
}

function oraclePromote(c, raw) {
  const exp = c.expected_result_envelope;
  const env = raw.response_envelope || {};
  const obs = {
    status: env.status,
    denial_reason: env.denial_reason,
    acceptance_signals: env.acceptance_signals,
    tier_pre: (raw.db_pre?.[0] || {}).tier,
    tier_post: (raw.db_post?.[0] || {}).tier,
    last_reconfirmed_at_post: (raw.db_post?.[0] || {}).last_reconfirmed_at,
  };
  if (raw.execution_status === 'error' && raw.error) {
    return { verdict: 'BLOCKED', bucket: 'EXTERNAL_BLOCKER', reason: `execute_workflow error: ${raw.error}`, observed: obs };
  }
  if (raw.execution_status !== 'success') {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `expected n8n status=success, got ${raw.execution_status}`, observed: obs };
  }
  // V2-014 dependency: acceptance via row-persisted user_confirmed/evidence_validated is DEFERRED.
  // Matrix cases that expect acc via rpuc alone (caller flags false, row flags true) are BAD_TEST_DEFINITION
  // until V2-014 is implemented. Detect by notes tag.
  const notes = c.notes || '';
  const inputs = c.inputs || {};
  const v2014DeferredAccept =
    notes.includes('acc-cuc-row-true') &&
    inputs.user_confirmed === false &&
    inputs.evidence_validated === false &&
    (c.preconditions?.seed_params?.user_confirmed === true) &&
    exp.denial_reason === 'accepted';
  if (v2014DeferredAccept) {
    return { verdict: 'FAIL', bucket: 'BAD_TEST_DEFINITION', reason: `V2-014 (row-persisted user_confirmed OR caller) is DEFERRED; runtime correctly denies per current SQL. Matrix expectation premature.`, observed: obs };
  }
  // Promote module_result.status is "success" for accepted, "partial" for denials — both normal.
  // Denial vs acceptance is verified via denial_reason + acceptance_signals + tier transition below.
  const expectedInternalStatus = exp.denial_reason === 'accepted' ? 'success' : 'partial';
  if (env.status !== expectedInternalStatus) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `module_result.status=${env.status} expected ${expectedInternalStatus} for denial_reason=${exp.denial_reason}`, observed: obs };
  }
  if (env.denial_reason !== exp.denial_reason) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `denial_reason=${env.denial_reason} expected ${exp.denial_reason}`, observed: obs };
  }
  if (!arraysEqualUnordered(env.acceptance_signals || [], exp.acceptance_signals)) {
    return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `acceptance_signals ${JSON.stringify(env.acceptance_signals)} ≠ ${JSON.stringify(exp.acceptance_signals)}`, observed: obs };
  }
  if (c.expected_db_effect.mutates) {
    if (obs.tier_pre !== 'recent' || obs.tier_post !== 'long_term') {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `tier transition pre=${obs.tier_pre} post=${obs.tier_post} expected recent→long_term`, observed: obs };
    }
    if (!obs.last_reconfirmed_at_post) {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `last_reconfirmed_at not set on accept`, observed: obs };
    }
  } else {
    if (obs.tier_pre !== obs.tier_post) {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `tier changed on deny: pre=${obs.tier_pre} post=${obs.tier_post}`, observed: obs };
    }
  }
  return { verdict: 'PASS', bucket: null, reason: 'promote oracle all checks pass', observed: obs };
}

function oracleSupersede(c, raw) {
  const exp = c.expected_result_envelope;
  const env = raw.response_envelope || {};
  const obs = {
    status: env.status,
    error_code: env.error_code,
    idempotency_reused: env.idempotency_reused,
    new_insert: env.new_insert,
    db_post_rows: raw.db_post?.length ?? 0,
  };
  if (raw.execution_status === 'error' && raw.error) {
    return { verdict: 'BLOCKED', bucket: 'EXTERNAL_BLOCKER', reason: `execute_workflow error: ${raw.error}`, observed: obs };
  }
  if (c.expected_runtime_status === 'failure') {
    if (env.status === 'success') {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `expected failure, got success`, observed: obs };
    }
    if (env.error_code !== exp.error_code) {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `error_code=${env.error_code} expected ${exp.error_code}`, observed: obs };
    }
  } else {
    if (env.status !== 'success') {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `expected success, got ${env.status}`, observed: obs };
    }
    if (env.idempotency_reused !== exp.idempotency_reused) {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `idempotency_reused=${env.idempotency_reused} expected ${exp.idempotency_reused}`, observed: obs };
    }
    if (env.new_insert !== exp.new_insert) {
      return { verdict: 'FAIL', bucket: 'RUNTIME_WORKFLOW_BUG', reason: `new_insert=${env.new_insert} expected ${exp.new_insert}`, observed: obs };
    }
  }
  return { verdict: 'PASS', bucket: null, reason: 'supersede oracle all checks pass', observed: obs };
}

export function oracle(c, raw) {
  switch (c.family) {
    case 'search_lexical_fallback': return oracleSearch(c, raw);
    case 'recall_intersection':     return oracleRecall(c, raw);
    case 'promote_denial_vocabulary': return oraclePromote(c, raw);
    case 'supersede_idempotency':   return oracleSupersede(c, raw);
    default: return { verdict: 'FAIL', bucket: 'BAD_TEST_DEFINITION', reason: `unknown family ${c.family}`, observed: {} };
  }
}

export { oracleSearch, oracleRecall, oraclePromote, oracleSupersede };
