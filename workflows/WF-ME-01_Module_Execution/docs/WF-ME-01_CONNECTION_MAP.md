# WF-ME-01_CONNECTION_MAP

- workflow version: `wf-me-01-source-pack-v1.3-cross-tenant-guard`
- node_count: 18
- edge_count: 24

1. ME_Input -> ME_Validate_Dispatcher_Result
2. ME_Manual_Test_Trigger -> ME_Validate_Dispatcher_Result
3. ME_Validate_Dispatcher_Result -> ME_Route_Valid
4. ME_Route_Valid -> ME_Load_Execution_Context
5. ME_Route_Valid -> ME_Return_Error (output 1)
6. ME_Load_Execution_Context -> ME_Check_Context_Match
7. ME_Load_Task_Candidates -> ME_Route_Module_Name
8. ME_Route_Module_Name -> ME_Route_Task_Action
9. ME_Route_Module_Name -> ME_Return_Error (output 1)
10. ME_Route_Task_Action -> ME_Task_Create_Result
11. ME_Route_Task_Action -> ME_Task_List_Result (output 1)
12. ME_Route_Task_Action -> ME_Task_Update_Result (output 2)
13. ME_Route_Task_Action -> ME_Task_Complete_Result (output 3)
14. ME_Route_Task_Action -> ME_Task_Delete_Result (output 4)
15. ME_Route_Task_Action -> ME_Return_Error (output 5)
16. ME_Task_Create_Result -> ME_Return_Result
17. ME_Task_List_Result -> ME_Return_Result
18. ME_Task_Update_Result -> ME_Return_Result
19. ME_Task_Complete_Result -> ME_Return_Result
20. ME_Task_Delete_Result -> ME_Return_Result
21. When chat message received -> ME_Validate_Dispatcher_Result
22. ME_Check_Context_Match -> ME_Route_Context_OK
23. ME_Route_Context_OK -> ME_Load_Task_Candidates
24. ME_Route_Context_OK -> ME_Return_Error (output 1)