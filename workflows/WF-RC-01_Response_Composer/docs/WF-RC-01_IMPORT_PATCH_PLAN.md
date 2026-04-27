# WF-RC-01 Import Patch Plan

## Safe import posture
- Import `WF-RC-01_Response_Composer.json` as a new workflow.
- Rebind Postgres credentials after import.
- Re-read node count, edge count, trigger count, switch names, and SQL queryReplacement bindings.
- Do not use full-body PUT on an existing live workflow unless unavoidable.

## Required post-import checks
1. Workflow imports with 14 nodes / 13 main edges.
2. Both triggers exist: `RC_Input`, `RC_Manual_Test_Trigger`.
3. Both switches exist and keep fallback error branches.
4. `RC_Load_Execution_Context` keeps `alwaysOutputData: true`.
5. `RC_Load_Thread_Context` keeps `alwaysOutputData: true`.
6. `options.queryReplacement` remains configured on both Postgres nodes.
7. Terminal Code v2 nodes keep `{ json: ... }` wrapping.

## Manual smoke tests
- V2 invalid input
- V3 happy path success
- V3 partial path
- V5 lineage mismatch
- V6 drift probe (read-only expected)
