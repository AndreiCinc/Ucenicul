# Local Test Matrix — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

50 cases, 10 families × 5. Runs off-node against the patched `ME_Build_RA_Envelope` jsCode plus a JavaScript port of the RA guard clauses (`artifacts/ra_logic_js.mjs`).

Every case has: id, purpose, preconditions, input shape (`src` passed to `$json`, plus any `$('ME_Validate_Dispatcher_Result')` context), expected emitted envelope (shape match), expected RA gate verdict (accept | reject-with-code), regression constraint.

Base idempotency key prefix for module_results in tests: `v2obs-ra-local-{case_id}`.

Context stub used unless a case overrides it:
```
ctx = {
  execution_context_id: '00000000-0000-0000-0000-00000000ec01',
  thread_id:           '00000000-0000-0000-0000-00000000ed01',
  tenant_id:           'aaaaaaaa-0000-0000-0000-000000000001',
  step: { step_id: 'step-stub', module_name: 'memory_module' }
}
```

Base `src` skeleton used unless a case overrides it:
```
src = {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: ctx.execution_context_id,
  thread_id: ctx.thread_id,
  tenant_id: ctx.tenant_id,
  domain_writes_performed: <per case>,
  module_result: {
    module_name: 'memory_module',
    step_id: '<per case>',
    result_type: 'module_result',
    status: '<per case>',
    summary: '<per case>',
    actions_executed: <per case>,
    artifacts: [],
    observations: [],
    proposals: [],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  }
}
```

Oracle rule for "envelope OK under RA gate": run `ra_logic_js.validate_aggregation_envelope(emitted)` and assert `[true, <normalized>]` is returned (no INVALID_AGGREGATION_INPUT). Oracle rule for controls that must continue to fail at RA (e.g. duplicate step_ids, missing expected step): assert `[false, { error: { code: <expected> } }]`.

---

## Family L1 — input shape preservation (5)

Purpose: confirm the post-patch envelope shape matches the v1.1 contract for all branches except the one-field normalization.

| id | preconditions | src overrides | expected envelope | expected RA gate | regression constraint |
|---|---|---|---|---|---|
| L1-01 | base | status=success, dwp=true | top-level keys exactly `{status_kind, result_type, execution_context_id, thread_id, tenant_id, aggregation_input}`; aggregation_input keys exactly `{aggregation_allowed, response_generation_allowed, module_execution_completed, domain_writes_performed, module_results, expected_step_ids}` | accept | key set identical pre/post fix |
| L1-02 | base | status=failed, dwp=false (non-writeful success-envelope carrying failed module_result) | envelope emitted via success branch; module_results[0].status=='failed' | accept | module_results payload preserved byte-for-byte |
| L1-03 | base | status=success, dwp=false (read-only) | aggregation_input.domain_writes_performed===false | accept | pre-fix already emitted false; post-fix unchanged behaviour |
| L1-04 | base | status=success, dwp=true (writeful) | aggregation_input.domain_writes_performed===false (normalized by fix) | accept | pre-fix emitted true → rejected; post-fix emits false → accepted |
| L1-05 | base | expected_step_ids override via mr.step_id='s-xyz' | aggregation_input.expected_step_ids==['s-xyz']; module_results[0].step_id==='s-xyz' | accept | step_id passthrough preserved |

## Family L2 — aggregation guard semantics (5)

Purpose: verify RA gate behavior after the fix — only the targeted guard flips; other guards unchanged.

| id | preconditions | src overrides | expected envelope | expected RA gate | regression constraint |
|---|---|---|---|---|---|
| L2-01 | base | status=success, dwp=true | normalized envelope | accept (happy-path writeful success) | canonical domain-write writeful path now green |
| L2-02 | base | status=success, dwp=true, mutate emitted aggregation_input.aggregation_allowed to false via post-emit override | emitted envelope before override has aggregation_allowed=true; post-override forces false | reject with INVALID_AGGREGATION_INPUT ("Aggregation is not allowed by upstream guard flags.") | other guards still fail-closed |
| L2-03 | base | status=success, dwp=true, post-emit override response_generation_allowed=true | emitted envelope before override has response_generation_allowed=false; post-override forces true | reject with INVALID_AGGREGATION_INPUT ("Response generation must remain disabled in aggregation stage.") | other guards still fail-closed |
| L2-04 | base | status=success, dwp=true, post-emit override module_execution_completed=false | emitted envelope has module_execution_completed=true; post-override forces false | reject with INVALID_AGGREGATION_INPUT ("Module execution must be completed before aggregation.") | other guards still fail-closed |
| L2-05 | base | status=success, dwp=false | normalized envelope — domain_writes_performed still false | accept | confirms the normalized value is literally `false`, not truthy |

## Family L3 — promote happy-path batch behavior (5)

Purpose: exercise the canonical writeful `promote_memory` success-path.

| id | step_id | summary | actions_executed | dwp | expected envelope | RA gate |
|---|---|---|---|---|---|---|
| L3-01 | mem-promote-L3-01 | "Memory promoted to long_term." | [{action:'promote_memory', details:{promoted:true, denial_reason:'accepted', acceptance_signals:['user_confirmed'], memory_id:'…L3-01'}}] | true | single-result module_batch, dwp=false | accept |
| L3-02 | mem-promote-L3-02 | same + promotion_target=long_term | [{action:'promote_memory', details:{promoted:true, denial_reason:'accepted', acceptance_signals:['evidence_validated']}}] | true | dwp=false | accept |
| L3-03 | mem-promote-L3-03 | accepted via corroboration | [{action:'promote_memory', details:{promoted:true, denial_reason:'accepted', acceptance_signals:['corroboration']}}] | true | dwp=false | accept |
| L3-04 | mem-promote-L3-04 | accepted via caller user_confirmed=true | [{action:'promote_memory', details:{promoted:true, denial_reason:'accepted', acceptance_signals:['caller_user_confirmed']}}] | true | dwp=false | accept |
| L3-05 | mem-promote-L3-05 | accepted via caller evidence_validated=true | [{action:'promote_memory', details:{promoted:true, denial_reason:'accepted', acceptance_signals:['caller_evidence_validated']}}] | true | dwp=false | accept |

## Family L4 — supersede happy-path batch behavior (5)

Purpose: exercise the canonical writeful `supersede_memory` success-path.

| id | step_id | summary | actions_executed | dwp | expected envelope | RA gate |
|---|---|---|---|---|---|---|
| L4-01 | mem-supersede-L4-01 | "Memory superseded successfully." | [{action:'supersede_memory', details:{superseded_memory_id:'…old-01', new_memory_id:'…new-01'}}] | true | single-result module_batch, dwp=false | accept |
| L4-02 | mem-supersede-L4-02 | replay idempotent | [{action:'supersede_memory', details:{idempotency_reused:true}}] | true | dwp=false | accept |
| L4-03 | mem-supersede-L4-03 | new content carries category | [{action:'supersede_memory', details:{superseded_memory_id:'…old-03', new_memory_id:'…new-03', category:'fact'}}] | true | dwp=false | accept |
| L4-04 | mem-supersede-L4-04 | replacement with evidence_refs | [{action:'supersede_memory', details:{superseded_memory_id:'…old-04', new_memory_id:'…new-04', evidence_refs_count:2}}] | true | dwp=false | accept |
| L4-05 | mem-supersede-L4-05 | replacement with long_term tier | [{action:'supersede_memory', details:{superseded_memory_id:'…old-05', new_memory_id:'…new-05', replacement_tier:'long_term'}}] | true | dwp=false | accept |

## Family L5 — deny-path preservation (5)

Purpose: verify that module-level denial (acceptance_criteria_not_met, SUPERSEDE_TARGET_INVALID, INVALID_PROMOTION_TARGET, SUBJECTIVE_JUDGMENT_FORBIDDEN, PROMOTION_DENIED via caller) continues to produce a valid envelope and the RA gate does not change its verdict.

| id | step_id | module_result.status | summary | dwp | expected envelope | RA gate |
|---|---|---|---|---|---|---|
| L5-01 | mem-promote-L5-01-deny | success | "Memory promotion denied: acceptance_criteria_not_met." (module-level denial still uses status=success per memory contract but actions_executed reflects denial) | false | dwp=false | accept |
| L5-02 | mem-supersede-L5-02-deny | success | "Supersede denied: SUPERSEDE_TARGET_INVALID." | false | dwp=false | accept |
| L5-03 | mem-supersede-L5-03-deny | success | "Supersede denied: old memory missing." | false | dwp=false | accept |
| L5-04 | mem-store-L5-04-refuse | success | "Store refused: SUBJECTIVE_JUDGMENT_FORBIDDEN." | false | dwp=false | accept |
| L5-05 | mem-promote-L5-05-deny | success | "Promote denied: INVALID_PROMOTION_TARGET." | false | dwp=false | accept |

## Family L6 — read-only path preservation (5)

Purpose: verify read-only actions still flow through the success branch with dwp=false and unchanged envelope shape.

| id | step_id | module_result.status | actions_executed | dwp | expected envelope | RA gate |
|---|---|---|---|---|---|---|
| L6-01 | mem-search-L6-01 | success | [{action:'search_memory', details:{row_count:3}}] | false | dwp=false | accept |
| L6-02 | mem-recall-L6-02 | success | [{action:'recall_memory', details:{row_count:0}}] | false | dwp=false | accept |
| L6-03 | mem-search-L6-03 | success | [{action:'search_memory', details:{row_count:1}}] | false | dwp=false | accept |
| L6-04 | mem-recall-L6-04 | success | [{action:'recall_memory', details:{row_count:5}}] | false | dwp=false | accept |
| L6-05 | mem-search-L6-05 | success | [{action:'search_memory', details:{row_count:0, empty_corpus:true}}] | false | dwp=false | accept |

## Family L7 — module_error / failed-result path preservation (5)

Purpose: verify that the B11-RA v1.1 module_error branch still normalizes dwp=false and wraps into `status=failed` synthetic module_result.

For L7 cases, src.status_kind='error' and src.result_type='module_error'. Oracle asserts the module_error branch is taken and emits synthetic failed module_result with dwp=false (independent of this mission's fix — behaviour inherited from v1.1 — but covered here as a regression check).

| id | src.error.code | ctx.step overrides | expected envelope | RA gate |
|---|---|---|---|---|
| L7-01 | MODULE_ERROR | step_id='step-L7-01', module_name='memory_module' | module_batch carrying module_result.status='failed'; dwp=false; observations[0].code='MODULE_ERROR' | accept (aggregates as failed batch) |
| L7-02 | MISSING_REQUIRED_FIELDS (missing_fields=['content']) | step_id='step-L7-02' | dwp=false; observations[0].missing_fields=['content'] | accept |
| L7-03 | SUPERSEDE_TARGET_INVALID | step_id='step-L7-03' | dwp=false | accept |
| L7-04 | SUBJECTIVE_JUDGMENT_FORBIDDEN | step_id='step-L7-04' | dwp=false; observations[0].code='SUBJECTIVE_JUDGMENT_FORBIDDEN' | accept |
| L7-05 | INVALID_PROMOTION_TARGET | step_id='step-L7-05' | dwp=false | accept |

## Family L8 — downstream envelope invariants (5)

Purpose: verify the emitted envelope preserves required fields and flags.

| id | check | expected |
|---|---|---|
| L8-01 | envelope top-level `status_kind` | 'success' |
| L8-02 | envelope top-level `result_type` | 'module_batch' |
| L8-03 | envelope echoes `execution_context_id`, `thread_id`, `tenant_id` from src | byte-identical |
| L8-04 | envelope `aggregation_input.module_results[0]` is a deep copy of src.module_result — arrays intact, field order respected | byte-for-byte |
| L8-05 | envelope `aggregation_input.expected_step_ids` equals [module_result.step_id] | length 1, value matches |

## Family L9 — replay / idempotent consistency (5)

Purpose: verify determinism — identical inputs produce identical envelopes.

| id | procedure | expected |
|---|---|---|
| L9-01 | run L3-01 twice; compare envelopes via JSON.stringify | byte-identical |
| L9-02 | run L4-01 twice; compare envelopes | byte-identical |
| L9-03 | run L3-01 with permuted object key order in src; compare envelopes | byte-identical (key order in emission is fixed by node code) |
| L9-04 | run L5-01 twice; compare envelopes | byte-identical |
| L9-05 | run L7-01 twice; compare envelopes | byte-identical |

## Family L10 — mixed-status / partial rollup behavior (5)

Purpose: verify envelope handling for cases that would end up in mixed/partial rollups at RA. `ME_Build_RA_Envelope` per current design emits single-result batches (one module_result per ME invocation); mixed batches in n8n today come from fan-in by DI-01 which is upstream. We simulate mixed envelopes post-build by directly injecting into the oracle's RA validator to confirm no regression.

| id | procedure | expected |
|---|---|---|
| L10-01 | build envelope from writeful success (L3-01 shape); inject a second module_result with status=failed into aggregation_input.module_results and add second step_id to expected_step_ids | RA gate accept; rollup = 'partial' |
| L10-02 | build envelope from writeful success (L4-01); inject a second module_result with status=no_action | RA gate accept; rollup = 'partial' |
| L10-03 | build two writeful successes into a batch (manual merge outside ME_Build_RA_Envelope) | RA gate accept; rollup='success' |
| L10-04 | build envelope with all failed module_results (via module_error branch) and add extra failed step | RA gate accept; rollup='failed' |
| L10-05 | build envelope with read-only success + writeful success merged | RA gate accept; rollup='success' (both statuses=success); dwp=false (from fix) |
