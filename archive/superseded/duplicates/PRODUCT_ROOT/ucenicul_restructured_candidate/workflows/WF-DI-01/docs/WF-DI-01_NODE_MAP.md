# WF-DI-01 Node Map

## Summary
- node_count: 13
- connection_count: 13
- triggers: manual + chat
- scope: validated plan -> dispatch envelope only

## Nodes
1. `When clicking 'Execute workflow'` — manual trigger for deterministic testing
2. `When chat message received` — chat trigger path
3. `DI_Validate_Plan_Result` — validates the canonical `WF-PL-01` plan envelope
4. `DI_Route_Valid` — routes `_valid === true|false`
5. `DI_Extract_Dispatch_Input` — extracts dispatcher input fields from the plan payload
6. `DI_Load_Execution_Context` — re-reads canonical `public.execution_contexts`
7. `DI_Verify_Context_Match` — fail-closed context verification
8. `DI_Load_Module_Registry` — emits static module capability registry for dispatcher resolution
9. `DI_Build_Ready_Steps` — validates module mapping, dependencies, and builds ready groups
10. `DI_Route_Context_Ready` — routes `_context_ready === true|false`
11. `DI_Build_Dispatch_Payload` — builds canonical dispatch envelope for `WF-ME-01`
12. `DI_Return_Result` — returns successful dispatch result unchanged
13. `DI_Return_Error` — returns canonical dispatcher error envelope

## Key implementation notes
- `DI_Load_Execution_Context` is `alwaysOutputData: true`
- dispatcher reads DB only
- module execution is not started here
- dispatcher emits `allowed_next_stage = WF-ME-01`
