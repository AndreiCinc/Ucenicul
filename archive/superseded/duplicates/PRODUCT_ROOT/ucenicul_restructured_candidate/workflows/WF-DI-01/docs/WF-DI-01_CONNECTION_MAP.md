# WF-DI-01 Connection Map

## Main graph
- `Manual Trigger` -> `DI_Validate_Plan_Result`
- `Chat Trigger` -> `DI_Validate_Plan_Result`
- `DI_Validate_Plan_Result` -> `DI_Route_Valid`
- `DI_Route_Valid.valid` -> `DI_Extract_Dispatch_Input`
- `DI_Route_Valid.invalid` -> `DI_Return_Error`
- `DI_Extract_Dispatch_Input` -> `DI_Load_Execution_Context`
- `DI_Load_Execution_Context` -> `DI_Verify_Context_Match`
- `DI_Verify_Context_Match` -> `DI_Load_Module_Registry`
- `DI_Load_Module_Registry` -> `DI_Build_Ready_Steps`
- `DI_Build_Ready_Steps` -> `DI_Route_Context_Ready`
- `DI_Route_Context_Ready.ready` -> `DI_Build_Dispatch_Payload`
- `DI_Route_Context_Ready.blocked` -> `DI_Return_Error`
- `DI_Build_Dispatch_Payload` -> `DI_Return_Result`

## Routing keys
- `_valid`
- `_context_ready`
