# WF-ME-01_IMPORT_PATCH_PLAN

## Goal
Safely import or re-import the current canonical WF-ME-01 shell without redesigning the stage.

## Canonical target shell
- versionId: `wf-me-01-source-pack-v1.3-cross-tenant-guard`
- node count: 18
- connection count: 24
- supported live-capable module family: `task_module`
- required next stage: `WF-RA-01`

## Import order
1. import `WF-ME-01_Module_Execution.json`
2. verify node count = 18
3. verify connection graph preserved (24 edges)
4. verify `ME_Load_Execution_Context.alwaysOutputData = true`
5. verify `ME_Load_Task_Candidates.alwaysOutputData = true`
6. verify the three switch nodes are `typeVersion: 3.2` with rules intact
7. verify `ME_Check_Context_Match` and `ME_Route_Context_OK` are present
8. verify task action routing strings
9. verify `allowed_next_stage = WF-RA-01`
10. run live V1–V6

## Known expectations
- unsupported modules must fail closed
- unsupported actions must fail closed
- task_module actions must remain stage-bounded
- no response composition in this stage
- DB write-scope verification is mandatory before closure claims
- cross-tenant mismatch must fail closed before any task-action node

## Patch policy
Use the smallest patch possible if runtime defects appear.
Never redesign the stage during first proof or re-proof.
Preserve the cross-tenant guard inserted after `ME_Load_Execution_Context`.
