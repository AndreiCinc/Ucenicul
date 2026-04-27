# WF-ME-01_IMPORT_PATCH_PLAN

## Goal
Safely import WF-ME-01 as the next candidate active stage after Dispatcher.

## Import order
1. import `WF-ME-01_Module_Execution.json`
2. verify node count = 15
3. verify connection graph preserved
4. verify `ME_Load_Execution_Context.alwaysOutputData = true`
5. verify Postgres credential binding remains intentional
6. verify task action routing strings
7. run V1–V6

## Known follow-up expectations
- unsupported modules must fail closed
- task_module actions must remain stage-bounded
- no response composition in this stage
- write-scope verification is mandatory before closure

## Patch policy
Use the smallest patch possible if runtime defects appear.
Never redesign the stage during first live proof.
