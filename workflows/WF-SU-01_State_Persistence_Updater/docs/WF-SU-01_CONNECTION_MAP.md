# WF-SU-01 Connection Map

```text
SU_Input ------------------------------> SU_Validate_Aggregated_Input
SU_Manual_Test_Trigger ----------------> SU_Validate_Aggregated_Input
SU_Validate_Aggregated_Input ----------> SU_Route_Valid
SU_Route_Valid(valid) -----------------> SU_Load_Execution_Context
SU_Route_Valid(fallback) --------------> SU_Return_Error
SU_Load_Execution_Context -------------> SU_Load_Aggregated_Result_Context
SU_Load_Aggregated_Result_Context -----> SU_Load_Write_Permissions
SU_Load_Write_Permissions -------------> SU_Verify_Lineage_And_Replay
SU_Verify_Lineage_And_Replay ----------> SU_Route_Context_Ready
SU_Route_Context_Ready(ready) ---------> SU_Build_State_Update_Plan
SU_Route_Context_Ready(fallback) ------> SU_Return_Context_Error
SU_Build_State_Update_Plan ------------> SU_Apply_Execution_State_Update
SU_Build_State_Update_Plan ------------> SU_Apply_Operational_Writes
SU_Build_State_Update_Plan ------------> SU_Persist_Memory_Candidates
SU_Apply_Execution_State_Update -------> SU_Build_Downstream_Envelope
SU_Apply_Operational_Writes -----------> SU_Build_Downstream_Envelope
SU_Persist_Memory_Candidates ----------> SU_Build_Downstream_Envelope
SU_Build_Downstream_Envelope ----------> SU_Return_Result
```

## Shell notes
- Expected node count: 17
- Expected main-edge count: 18
- Hardening requirement: keep `alwaysOutputData: true` on read nodes that must fail closed on 0-row reads.
- Hardening requirement: do not remove `options.queryReplacement` where `$1/$2` are used.
