# COMPACT WORKFLOW CONTRACT — {{WORKFLOW_ID}}

## Identity
- workflow_id: {{WORKFLOW_ID}}
- workflow_label: {{WORKFLOW_LABEL}}
- local_json: {{LOCAL_JSON_PATH}}
- live_workflow_id: {{LIVE_WORKFLOW_ID}}

## Contract sources
- {{CONTRACT_SOURCE_1}}
- {{CONTRACT_SOURCE_2}}

## Inputs
- required_inputs:
  - {{REQUIRED_INPUT_1}}
- optional_inputs:
  - {{OPTIONAL_INPUT_1}}

## Core behavior
- route_rules:
  - {{ROUTE_RULE_1}}
- output_contract:
  - {{OUTPUT_ASSERTION_1}}

## Persistence
- db_touchpoints:
  - {{DB_TOUCHPOINT_1}}
- required_db_assertions:
  - {{DB_ASSERTION_1}}

## Notes
- inferred_fields_present: {{INFERRED_FIELDS_PRESENT}}
- unresolved_items: {{UNRESOLVED_ITEMS}}
