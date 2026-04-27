# WF-RC-01 Node Map

| Node | Type | Responsibility |
|---|---|---|
| RC_Input | executeWorkflowTrigger | Upstream stage entry from WF-SU-01 |
| RC_Manual_Test_Trigger | manualTrigger | Manual verifier path |
| RC_Validate_State_Update_Input | code | Envelope validation |
| RC_Route_Valid | switch | Valid vs invalid input |
| RC_Load_Execution_Context | postgres | Read-only execution context load |
| RC_Load_Thread_Context | postgres | Read-only thread context load |
| RC_Verify_Lineage | code | Tenant / thread / execution-context lineage checks |
| RC_Route_Context_Ready | switch | Context-ready vs context-error branch |
| RC_Build_Composition_Input | code | Normalize composition inputs |
| RC_Compose_Response | code | Compose the single final user-facing response |
| RC_Build_Output_Envelope | code | Build canonical output envelope |
| RC_Return_Result | code | Success terminal node |
| RC_Return_Error | code | Invalid-input terminal node |
| RC_Return_Context_Error | code | Lineage/context terminal node |
