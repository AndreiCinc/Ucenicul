# WF-ME-01_CONNECTION_MAP

1. ME_Input -> ME_Validate_Dispatcher_Result
2. ME_Manual_Test_Trigger -> ME_Validate_Dispatcher_Result
3. ME_Validate_Dispatcher_Result -> ME_Route_Valid
4. ME_Route_Valid(valid) -> ME_Load_Execution_Context
5. ME_Route_Valid(invalid) -> ME_Return_Error
6. ME_Load_Execution_Context -> ME_Load_Task_Candidates
7. ME_Load_Task_Candidates -> ME_Route_Module_Name
8. ME_Route_Module_Name(task_module) -> ME_Route_Task_Action
9. ME_Route_Module_Name(other) -> ME_Return_Error
10. ME_Route_Task_Action(create_task) -> ME_Task_Create_Result -> ME_Return_Result
11. ME_Route_Task_Action(list_tasks) -> ME_Task_List_Result -> ME_Return_Result
12. ME_Route_Task_Action(update_task) -> ME_Task_Update_Result -> ME_Return_Result
13. ME_Route_Task_Action(complete_task) -> ME_Task_Complete_Result -> ME_Return_Result
14. ME_Route_Task_Action(delete_task) -> ME_Task_Delete_Result -> ME_Return_Result
15. ME_Route_Task_Action(default) -> ME_Return_Error
