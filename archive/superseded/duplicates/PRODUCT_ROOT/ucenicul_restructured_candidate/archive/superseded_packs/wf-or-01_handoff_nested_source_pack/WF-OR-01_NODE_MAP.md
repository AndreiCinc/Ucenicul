# WF-OR-01 Node Map

## Purpose
Map the minimum node graph required for the `WF-OR-01` stage.

## Workflow class
- stage workflow
- internal handoff adapter
- not a planner
- not a dispatcher
- not a response composer

## Canonical node inventory

1. `When clicking 'Execute workflow'`
   - type: manual trigger
   - purpose: shell-safe manual execution path

2. `When chat message received`
   - type: chat trigger / webhook-registered trigger
   - purpose: parity with the carry-forward testing pattern from `WF-EC-01`
   - note: requires adapter-safe payload handling

3. `OR_Validate_EC_Result`
   - type: Code
   - purpose: parse direct input or `chatInput`, validate upstream EC result, classify missing fields, emit `_valid`

4. `OR_Route_Valid`
   - type: Switch
   - purpose: route valid vs invalid handoff input
   - required field: `_valid`
   - required runtime proof: both branches

5. `OR_Extract_Handoff_Input`
   - type: Code
   - purpose: normalize execution-context lookup keys and expected state

6. `OR_Load_Execution_Context`
   - type: Postgres
   - purpose: read canonical execution-context row by execution id + tenant + thread
   - required property: `alwaysOutputData: true`

7. `OR_Verify_Context_Match`
   - type: Code
   - purpose: verify tenant/thread/execution alignment and reject leakage

8. `OR_Build_Handoff_Payload`
   - type: Code
   - purpose: emit the bounded orchestrator-ready handoff envelope

9. `OR_Return_Result`
   - type: Code
   - purpose: produce canonical stage-success result

10. `OR_Return_Error`
    - type: Code
    - purpose: produce canonical stage-error result

## Graph intent
- valid path: trigger -> validate -> route[valid] -> extract -> load -> verify -> build -> return_result
- invalid path: trigger -> validate -> route[invalid] -> return_error

## Explicit exclusions
This workflow must not:
- build a plan
- call modules
- persist domain writes
- generate final user-facing response text
