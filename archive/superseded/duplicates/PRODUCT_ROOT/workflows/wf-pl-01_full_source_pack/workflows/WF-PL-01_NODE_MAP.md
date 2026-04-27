# WF-PL-01 Node Map

## Purpose
Map the minimum node graph required for the `WF-PL-01` stage.

## Workflow class
- stage workflow
- internal plan generator
- not a dispatcher
- not a module executor
- not a response composer

## Canonical node inventory

1. `When clicking 'Execute workflow'`
   - type: manual trigger
   - purpose: shell-safe manual execution path

2. `When chat message received`
   - type: chat trigger / webhook-registered trigger
   - purpose: parity with the carry-forward testing pattern from previous stages
   - note: requires adapter-safe payload handling

3. `PL_Validate_OR_Handoff`
   - type: Code
   - purpose: parse direct input or `chatInput`, validate upstream OR handoff, classify missing fields, emit `_valid`

4. `PL_Route_Valid`
   - type: Switch
   - purpose: route valid vs invalid handoff input
   - required field: `_valid`
   - required runtime proof: both branches

5. `PL_Extract_Planning_Input`
   - type: Code
   - purpose: normalize execution-context lookup keys and planner context

6. `PL_Load_Execution_Context`
   - type: Postgres
   - purpose: read canonical execution-context row by execution id + tenant + thread
   - required property: `alwaysOutputData: true`

7. `PL_Verify_Context_Match`
   - type: Code
   - purpose: verify tenant/thread/execution alignment and reject leakage

8. `PL_Load_Module_Registry`
   - type: Code
   - purpose: emit the bounded module capability registry for plan generation

9. `PL_Build_Planner_Input`
   - type: Code
   - purpose: assemble validated planner input, derive goal/intent, and mark `_context_ready`

10. `PL_Route_Context_Ready`
    - type: Switch
    - purpose: route planner-ready vs insufficient-context paths

11. `PL_Generate_Plan`
    - type: Code
    - purpose: generate the bounded deterministic execution plan envelope

12. `PL_Return_Result`
    - type: Code
    - purpose: produce canonical stage-success result

13. `PL_Return_Error`
    - type: Code
    - purpose: produce canonical stage-error result

## Graph intent
- valid path: trigger -> validate -> route[valid] -> extract -> load -> verify -> registry -> build -> route[ready] -> generate -> return_result
- invalid path: trigger -> validate -> route[invalid] -> return_error
- insufficient-context path: build -> route[not_ready] -> return_error

## Explicit exclusions
This workflow must not:
- dispatch modules
- execute modules
- persist domain writes
- generate final user-facing response text
