# WORKFLOW TEST RUN RECORD — WF-TR-01

## Scope
- workflow_id: WF-TR-01
- local_json: workflows/WF-TR-01_Thread_Resolver/...
- live_workflow_id: {{LIVE_TR_ID}}
- compact_contract: tests/generated/contracts/WF-TR-01_COMPACT_CONTRACT.md
- contract_sources:
  - prompts/18_RUNTIME_CANONICAL_TARGET.md
  - workflows/WF-TR-01_Thread_Resolver/docs/contracts/ThreadResolutionContracts.md

## Synthetic case generation
- total_cases_generated: 50
- family_breakdown:
  - happy_path: 5
  - boundary: 5
  - missing_optional: 5
  - missing_required: 5
  - malformed: 5
  - route_divergence: 5
  - duplicate_idempotency: 5
  - persistence: 5
  - contract_drift: 5
  - recovery_fallback: 5

## Static validation
- total_validated: 50
- passes: {{STATIC_PASS_COUNT}}
- expected_negative_passes: {{STATIC_EXPECTED_NEGATIVE_COUNT}}
- failures: {{STATIC_FAILURE_COUNT}}

## Runtime validation
- runtime_cases_executed: 10
- runtime_selection_basis: risk-weighted family coverage with one negative gate and one persistence probe
- runtime_passes: {{RUNTIME_PASS_COUNT}}
- runtime_failures: {{RUNTIME_FAILURE_COUNT}}

## Notes
WF-TR-01 is a strong early anchor because:
- it is upstream in the primary chain,
- it shapes downstream context,
- its route behavior influences many later workflows.

## Final decision
- status: {{FINAL_STATUS}}
- done_gate: {{DONE_GATE_RESULT}}
