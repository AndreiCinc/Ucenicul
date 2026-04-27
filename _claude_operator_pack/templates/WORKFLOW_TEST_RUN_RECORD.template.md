# WORKFLOW TEST RUN RECORD — {{WORKFLOW_ID}}

## Scope
- workflow_id: {{WORKFLOW_ID}}
- local_json: {{LOCAL_JSON_PATH}}
- live_workflow_id: {{LIVE_WORKFLOW_ID}}
- compact_contract: {{COMPACT_CONTRACT_PATH}}
- contract_sources:
  - {{CONTRACT_SOURCE_1}}
  - {{CONTRACT_SOURCE_2}}

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
- runtime_selection_basis: {{RUNTIME_SELECTION_BASIS}}
- runtime_passes: {{RUNTIME_PASS_COUNT}}
- runtime_failures: {{RUNTIME_FAILURE_COUNT}}
- execution_refs:
  - {{EXECUTION_REF_1}}
  - {{EXECUTION_REF_2}}

## DB assertions
- required: {{DB_ASSERTIONS_REQUIRED}}
- assertions_file: {{DB_ASSERTIONS_FILE}}
- touched_tables:
  - {{TABLE_1}}
- result: {{DB_ASSERTION_RESULT}}
- cleanup_result: {{CLEANUP_RESULT}}

## Remediation
- needed: {{REMEDIATION_NEEDED}}
- summary: {{REMEDIATION_SUMMARY}}

## Final decision
- status: {{FINAL_STATUS}}
- done_gate: {{DONE_GATE_RESULT}}
