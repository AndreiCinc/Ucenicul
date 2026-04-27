# CHAIN MAPPING — {{SOURCE_WORKFLOW_ID}} → {{TARGET_WORKFLOW_ID}}

## Edge classification
- source_workflow: {{SOURCE_WORKFLOW_ID}}
- target_workflow: {{TARGET_WORKFLOW_ID}}
- edge_type: {{EDGE_TYPE}}
- decision: {{EDGE_DECISION}}
- evidence_source: {{EVIDENCE_SOURCE}}

## Connector mechanism
- mechanism: Execute Workflow
- synchronous_wait: true
- blocking_failure: {{BLOCKING_FAILURE}}

## Mapping
| source_field | target_field | transform | default | required | notes |
|---|---|---|---|---|---|
| {{SOURCE_FIELD_1}} | {{TARGET_FIELD_1}} | {{TRANSFORM_1}} | {{DEFAULT_1}} | {{REQUIRED_1}} | {{NOTES_1}} |

## Assertions
- target_contract_assertions:
  - {{TARGET_ASSERTION_1}}
- route_assertions:
  - {{ROUTE_ASSERTION_1}}
- db_assertions:
  - {{DB_ASSERTION_1}}
