# WF-RA-01_IMPORT_PATCH_PLAN

## Goal
Import the canonical WF-RA-01 shell and preserve stage-bounded aggregation behavior.

## Import order
1. import `WF-RA-01_Result_Aggregator.json`
2. verify node count = 14
3. verify connection graph preserved
4. verify `RA_Load_Execution_Context.alwaysOutputData = true`
5. verify Postgres credential binding remains intentional
6. verify switch routing strings `_valid` / `_context_ready`
7. run V1–V6

## Known follow-up expectations
- invalid batches must fail closed
- context mismatch must fail closed
- aggregation must remain read-only
- no response composition in this stage
- DB drift verification is mandatory before closure

## Patch policy
Use the smallest patch possible if runtime defects appear.
Never redesign the stage during first live proof.
