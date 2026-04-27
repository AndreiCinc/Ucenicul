# WF-RC-01 Connection Map

1. RC_Input -> RC_Validate_State_Update_Input
2. RC_Manual_Test_Trigger -> RC_Validate_State_Update_Input
3. RC_Validate_State_Update_Input -> RC_Route_Valid
4. RC_Route_Valid(valid) -> RC_Load_Execution_Context
5. RC_Route_Valid(invalid) -> RC_Return_Error
6. RC_Load_Execution_Context -> RC_Load_Thread_Context
7. RC_Load_Thread_Context -> RC_Verify_Lineage
8. RC_Verify_Lineage -> RC_Route_Context_Ready
9. RC_Route_Context_Ready(ready) -> RC_Build_Composition_Input
10. RC_Route_Context_Ready(context_error) -> RC_Return_Context_Error
11. RC_Build_Composition_Input -> RC_Compose_Response
12. RC_Compose_Response -> RC_Build_Output_Envelope
13. RC_Build_Output_Envelope -> RC_Return_Result
