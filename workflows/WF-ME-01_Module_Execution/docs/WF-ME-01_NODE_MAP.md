# WF-ME-01_NODE_MAP

- workflow version: `wf-me-01-source-pack-v1.3-cross-tenant-guard`
- node_count: 18

| Node | Role |
|---|---|
| ME_Input | Execute Workflow entrypoint from WF-DI-01 |
| ME_Manual_Test_Trigger | Manual shell trigger for debugging |
| ME_Validate_Dispatcher_Result | Validates canonical dispatch envelope and adapts chatInput payloads |
| ME_Route_Valid | Splits valid vs invalid dispatch input |
| ME_Load_Execution_Context | Loads execution context by execution_context_id + tenant_id |
| ME_Load_Task_Candidates | Loads task candidates for update/complete/delete paths |
| ME_Route_Module_Name | Routes task_module vs unsupported modules |
| ME_Route_Task_Action | Routes create/list/update/complete/delete task actions |
| ME_Task_Create_Result | Builds canonical create module_result envelope |
| ME_Task_List_Result | Builds canonical list module_result envelope |
| ME_Task_Update_Result | Builds canonical update module_result envelope |
| ME_Task_Complete_Result | Builds canonical complete module_result envelope |
| ME_Task_Delete_Result | Builds canonical delete module_result envelope |
| ME_Return_Error | Returns canonical module_error |
| ME_Return_Result | Returns canonical module_result success envelope |
| When chat message received | Chat-trigger harness for MCP/live runtime proof |
| ME_Check_Context_Match | Fail-closed assertion that loaded execution context matches tenant/thread/id |
| ME_Route_Context_OK | Routes context_ok vs context_mismatch |