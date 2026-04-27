# WF-SU-01 Node Map

## Node inventory
1. `SU_Input` — executeWorkflowTrigger entry from WF-RA-01
2. `SU_Manual_Test_Trigger` — manual trigger for verifier pinData runs
3. `SU_Validate_Aggregated_Input` — validates RA downstream envelope
4. `SU_Route_Valid` — routes valid vs invalid input
5. `SU_Load_Execution_Context` — loads execution context by `execution_context_id + tenant_id`
6. `SU_Load_Aggregated_Result_Context` — bridge probe for mirrored aggregation context
7. `SU_Load_Write_Permissions` — loads write-policy allowlist
8. `SU_Verify_Lineage_And_Replay` — checks lineage, status legality, replay guard
9. `SU_Route_Context_Ready` — routes ready vs context error
10. `SU_Build_State_Update_Plan` — computes canonical state update plan
11. `SU_Apply_Execution_State_Update` — updates `execution_contexts`
12. `SU_Apply_Operational_Writes` — updates thread-state only
13. `SU_Persist_Memory_Candidates` — stores candidate payload into `execution_contexts.shared_artifacts`
14. `SU_Build_Downstream_Envelope` — emits canonical `state_update_result`
15. `SU_Return_Result` — terminal success boundary
16. `SU_Return_Error` — terminal invalid-input boundary
17. `SU_Return_Context_Error` — terminal lineage / replay boundary
