# WF-RA-01_NODE_MAP

| Node | Role |
|---|---|
| RA_Input | Execute Workflow entrypoint from WF-ME-01 fan-in layer |
| RA_Manual_Test_Trigger | Manual shell trigger for live debugging |
| RA_Validate_Module_Batch | Validates canonical module batch envelope and guard flags |
| RA_Route_Valid | Splits valid vs invalid aggregation input |
| RA_Load_Execution_Context | Reads execution context by execution_context_id + tenant_id |
| RA_Verify_Context_Match | Verifies context row exists and tenant/thread alignment holds |
| RA_Route_Context_Ready | Splits ready vs context-mismatch |
| RA_Build_Aggregation_Input | Normalizes verified context + module batch |
| RA_Aggregate_Module_Results | Computes canonical rollup, flattened artifacts, followups |
| RA_Build_Downstream_Envelope | Builds state-update-ready success envelope |
| RA_Return_Result | Emits canonical aggregated result |
| RA_Return_Error | Emits canonical invalid input error |
| RA_Return_Context_Error | Emits canonical context/aggregation error |
| RA_Status_Summary | Optional live-debug status summary emitter |
