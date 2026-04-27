# CHAIN E2E RUN RECORD — {{SOURCE_WORKFLOW_ID}} → {{TARGET_WORKFLOW_ID}}

## Edge
- source_workflow: {{SOURCE_WORKFLOW_ID}}
- target_workflow: {{TARGET_WORKFLOW_ID}}
- edge_type: {{EDGE_TYPE}}
- canonical_decision: {{EDGE_DECISION}}
- mapping_file: {{MAPPING_FILE}}

## Connector
- mechanism: {{CONNECTOR_MECHANISM}}
- target_callable: {{TARGET_CALLABLE}}
- patch_record: {{PATCH_RECORD}}
- pre_patch_snapshot: {{PRE_PATCH_SNAPSHOT}}
- post_patch_snapshot: {{POST_PATCH_SNAPSHOT}}
- connector_status: {{CONNECTOR_STATUS}}

## Synthetic chain cases
- total_cases_generated: 50
- runtime_cases_executed: 10
- runtime_selection_basis: {{RUNTIME_SELECTION_BASIS}}

## Static mapping validation
- pass_count: {{STATIC_PASS_COUNT}}
- failure_count: {{STATIC_FAILURE_COUNT}}

## Runtime E2E validation
- pass_count: {{RUNTIME_PASS_COUNT}}
- failure_count: {{RUNTIME_FAILURE_COUNT}}
- execution_refs:
  - {{EXECUTION_REF_1}}
  - {{EXECUTION_REF_2}}

## Target validation
- target_contract_result: {{TARGET_CONTRACT_RESULT}}
- db_assertions_file: {{DB_ASSERTIONS_FILE}}
- db_assertion_result: {{DB_ASSERTION_RESULT}}
- cleanup_result: {{CLEANUP_RESULT}}

## Remediation
- needed: {{REMEDIATION_NEEDED}}
- summary: {{REMEDIATION_SUMMARY}}

## Final decision
- status: {{FINAL_STATUS}}
- done_gate: {{DONE_GATE_RESULT}}
