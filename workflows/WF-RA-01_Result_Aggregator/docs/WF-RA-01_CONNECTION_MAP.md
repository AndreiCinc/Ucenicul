# WF-RA-01_CONNECTION_MAP

1. RA_Input -> RA_Validate_Module_Batch
2. RA_Manual_Test_Trigger -> RA_Validate_Module_Batch
3. RA_Validate_Module_Batch -> RA_Route_Valid
4. RA_Route_Valid._valid -> RA_Load_Execution_Context
5. RA_Route_Valid.extra -> RA_Return_Error
6. RA_Load_Execution_Context -> RA_Verify_Context_Match
7. RA_Verify_Context_Match -> RA_Route_Context_Ready
8. RA_Route_Context_Ready._context_ready -> RA_Build_Aggregation_Input
9. RA_Route_Context_Ready.extra -> RA_Return_Context_Error
10. RA_Build_Aggregation_Input -> RA_Aggregate_Module_Results
11. RA_Aggregate_Module_Results -> RA_Build_Downstream_Envelope
12. RA_Aggregate_Module_Results -> RA_Status_Summary
13. RA_Build_Downstream_Envelope -> RA_Return_Result
14. RA_Status_Summary -> RA_Return_Result
