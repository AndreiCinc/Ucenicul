// Pure simulator for ME_Memory_Promote_Prep + ME_Memory_Promote_DB accept/update + ME_Memory_Promote_Result.
// Body mirrors live-extracted jsCode (Promote_Prep, Promote_Result) + SQL (Promote_DB) verbatim, lifted to (env, step, rowBefore) params.
// Lock-free — the simulator is deterministic given a seed row. No DB required.
//
// Contract match:
//   Promote_Prep sets corroboration_threshold=2 always, and extracts caller user_confirmed, evidence_validated as strict === true.
//   Promote_DB accept = (cc >= $3::int) OR ($4::boolean IS TRUE) OR ($5::boolean IS TRUE) OR (row.user_confirmed IS TRUE) OR (row.evidence_validated IS TRUE)
//   Promote only fires if accept.ok AND rowBefore.tier === 'recent'.
//   Post-update: tier='long_term', user_confirmed = rowBefore.user_confirmed || $4, evidence_validated = rowBefore.evidence_validated || $5.
//   Denial_reason: 'not_in_recent_tier' when !accept.ok is a side-effect of tier!=recent... actually 'not_in_recent_tier' takes precedence over 'acceptance_criteria_not_met'.
//   Per SQL: CASE WHEN t.tier <> 'recent' THEN 'not_in_recent_tier' ELSE 'acceptance_criteria_not_met' END.
//
// Promote_Result pushes acceptance_signals only when accepted:
//   cc>=threshold → 'corroboration'
//   db.user_confirmed===true || row.user_confirmed===true → 'user_confirmed'
//   db.evidence_validated===true || row.evidence_validated===true → 'evidence_validated'

export function promotePrep(env, step) {
  const inputs = step.inputs || {};
  const missing = [];
  if (!inputs.memory_id) missing.push('memory_id');
  if (inputs.promotion_target !== 'long_term') missing.push('promotion_target');
  if (missing.length) {
    return { _error: true, error_code: 'INVALID_PROMOTION_TARGET', error_message: 'promote_memory requires memory_id and promotion_target=long_term.', missing_fields: missing };
  }
  return {
    __db: {
      memory_id: inputs.memory_id,
      tenant_id: env.tenant_id,
      corroboration_threshold: 2,
      user_confirmed: inputs.user_confirmed === true,
      evidence_validated: inputs.evidence_validated === true
    }
  };
}

export function promoteDb(prepOut, rowBefore) {
  if (!rowBefore) {
    return { rows: [] };
  }
  const db = prepOut.__db;
  const cc = typeof rowBefore.corroboration_count === 'number' ? rowBefore.corroboration_count : 0;
  const acceptOk = (
    cc >= db.corroboration_threshold
    || db.user_confirmed === true
    || db.evidence_validated === true
    || rowBefore.user_confirmed === true
    || rowBefore.evidence_validated === true
  );
  const tierIsRecent = rowBefore.tier === 'recent';
  if (acceptOk && tierIsRecent) {
    const rowAfter = {
      ...rowBefore,
      tier: 'long_term',
      last_reconfirmed_at: new Date().toISOString(),
      user_confirmed: rowBefore.user_confirmed || db.user_confirmed,
      evidence_validated: rowBefore.evidence_validated || db.evidence_validated,
      promoted: true,
      denial_reason: 'accepted'
    };
    return { rows: [rowAfter] };
  }
  const rowDenied = {
    ...rowBefore,
    promoted: false,
    denial_reason: (rowBefore.tier !== 'recent') ? 'not_in_recent_tier' : 'acceptance_criteria_not_met'
  };
  return { rows: [rowDenied] };
}

export function promoteResult(env, step, prepOut, dbOut) {
  if (prepOut && prepOut._error === true) {
    return { _error: true, error_code: prepOut.error_code, error_message: prepOut.error_message, missing_fields: prepOut.missing_fields || [] };
  }
  const rows = (dbOut.rows || []).filter(r => r && typeof r.id === 'string');
  if (rows.length === 0) {
    return { _error: true, error_code: 'INVALID_PROMOTION_TARGET', error_message: 'Target memory not found.', missing_fields: [] };
  }
  const row = rows[0];
  const accepted = row.promoted === true;
  const db = prepOut.__db || {};
  const corrThreshold = typeof db.corroboration_threshold === 'number' ? db.corroboration_threshold : 2;
  const corrCount = typeof row.corroboration_count === 'number' ? row.corroboration_count : 0;
  const acceptance_signals = [];
  if (accepted) {
    if (corrCount >= corrThreshold) acceptance_signals.push('corroboration');
    if (db.user_confirmed === true || row.user_confirmed === true) acceptance_signals.push('user_confirmed');
    if (db.evidence_validated === true || row.evidence_validated === true) acceptance_signals.push('evidence_validated');
  }
  return {
    status_kind: 'success',
    result_type: 'module_result',
    module_result: {
      module_name: 'memory_module',
      step_id: step.step_id,
      status: accepted ? 'success' : 'partial',
      summary: accepted ? 'Memory promoted to long_term.' : 'Promotion denied: ' + row.denial_reason,
      actions_executed: [{
        action: 'promote_memory',
        details: {
          memory_id: row.id,
          tier: row.tier,
          status: row.status,
          denial_reason: row.denial_reason,
          acceptance_signals
        }
      }],
      needs_followup: !accepted
    }
  };
}

export function promoteLaneEnd2End(env, step, rowBefore) {
  const prep = promotePrep(env, step);
  if (prep._error) return { error: prep };
  // Simulate DB: if memory_id mismatches seed row, return empty rows (INVALID_PROMOTION_TARGET at Result)
  const matched = rowBefore && rowBefore.id === prep.__db.memory_id ? rowBefore : null;
  const dbOut = promoteDb(prep, matched);
  const result = promoteResult(env, step, prep, dbOut);
  return result;
}

export default promoteLaneEnd2End;
