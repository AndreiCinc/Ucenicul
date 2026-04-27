# WF-ME-01_NODE_MAP

| Node | Role |
|---|---|
| ME_Input | Execute Workflow entrypoint from WF-DI-01 |
| ME_Manual_Test_Trigger | Manual shell trigger for live debugging |
| ME_Validate_Dispatcher_Result | Validates canonical dispatch envelope and guard flags |
| ME_Route_Valid | Splits valid vs invalid dispatch input |
| ME_Load_Execution_Context | Reads execution context by execution_context_id + tenant_id |
| ME_Load_Task_Candidates | Loads task candidates for update/complete/delete actions |
| ME_Route_Module_Name | Routes task_module vs unsupported modules |
| ME_Route_Task_Action | Routes create/list/update/complete/delete task actions |
| ME_Task_Create_Result | Builds canonical create-task module_result envelope |
| ME_Task_List_Result | Builds canonical list-tasks module_result envelope |
| ME_Task_Update_Result | Builds canonical update-task module_result envelope |
| ME_Task_Complete_Result | Builds canonical complete-task module_result envelope |
| ME_Task_Delete_Result | Builds canonical delete-task module_result envelope |
| ME_Return_Error | Returns canonical module_error |
| ME_Return_Result | Returns canonical module_result success envelope |
