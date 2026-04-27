# WF-OR-01 Connection Map

## Canonical connections

### Trigger fan-in
- `When clicking 'Execute workflow'` -> `OR_Validate_EC_Result`
- `When chat message received` -> `OR_Validate_EC_Result`

### Validation routing
- `OR_Validate_EC_Result` -> `OR_Route_Valid`

### Valid branch
- `OR_Route_Valid` output `0` -> `OR_Extract_Handoff_Input`
- `OR_Extract_Handoff_Input` -> `OR_Load_Execution_Context`
- `OR_Load_Execution_Context` -> `OR_Verify_Context_Match`
- `OR_Verify_Context_Match` -> `OR_Build_Handoff_Payload`
- `OR_Build_Handoff_Payload` -> `OR_Return_Result`

### Invalid branch
- `OR_Route_Valid` output `1` -> `OR_Return_Error`

## Branch semantics
- output `0` = valid handoff input
- output `1` = invalid handoff input

## Required runtime proof
- prove the switch routes to output `0` on a valid `WF-EC-01` result
- prove the switch routes to output `1` on malformed or incomplete input

## Safety rules
- no hidden node-name grabs outside declared contract
- no post-branch merge is required in this stage
- no branch may emit final user-facing response text
