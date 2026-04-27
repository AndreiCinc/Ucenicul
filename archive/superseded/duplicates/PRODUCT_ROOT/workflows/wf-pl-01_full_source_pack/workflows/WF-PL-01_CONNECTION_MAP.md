# WF-PL-01 Connection Map

## Valid path
1. Trigger
2. `PL_Validate_OR_Handoff`
3. `PL_Route_Valid` output: `valid`
4. `PL_Extract_Planning_Input`
5. `PL_Load_Execution_Context`
6. `PL_Verify_Context_Match`
7. `PL_Load_Module_Registry`
8. `PL_Build_Planner_Input`
9. `PL_Route_Context_Ready` output: `ready`
10. `PL_Generate_Plan`
11. `PL_Return_Result`

## Invalid path
1. Trigger
2. `PL_Validate_OR_Handoff`
3. `PL_Route_Valid` output: `invalid`
4. `PL_Return_Error`

## Insufficient-context path
1. `PL_Build_Planner_Input`
2. `PL_Route_Context_Ready` output: `not_ready`
3. `PL_Return_Error`

## Connection safety notes
- `PL_Load_Execution_Context` must keep `alwaysOutputData: true`
- `PL_Verify_Context_Match` must fail closed on tenant/thread mismatch
- `PL_Generate_Plan` must not run if planner context is missing
