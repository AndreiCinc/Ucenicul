# F6A Diff Summary

Generated deterministically from `build_patch_f6a.mjs`. Re-running the
builder on the same pre snapshot produces byte-identical output.

## Inputs
- Pre snapshot: `WF-ME-01_pre_f6a.json` (sha256 71a8c903584a1f0fac170a8ebce8daf1227f7a62c4f2ce0e47f2536216107c57)
- Pre versionId: `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`

## Outputs
- Post payload: `WF-ME-01_post_f6a.json` (sha256 8e775d5a5a982cd5b069b604a877dc52498f4e5224f0218d71eebab33c67624f)

## Node changes
- Added: `ME_Memory_Store_Embed` (`n8n-nodes-base.httpRequest` typeVersion 4.2, onError=continueRegularOutput, credential=openAiApi `svM62oyFwPbaIeX4`).
- Added: `ME_Memory_Store_Embed_Merge` (`n8n-nodes-base.code` typeVersion 2).
- Modified: `ME_Memory_Store_DB.parameters.query` — column list +embedding; VALUES +`$14` with CASE null-guard casting to `vector(1536)`.
- Modified: `ME_Memory_Store_DB.parameters.options.queryReplacement` — 13→14 elements; new 14th = `$json.__db.embedding_text`; error branch has 14 nulls.
- Moved: `ME_Memory_Store_DB.position` `[3008,1040]` → `[3128,1040]` (visual layout only; makes room for new Merge at `[3008,1040]`).

## Connection changes
- Removed: `ME_Memory_Store_Prep → ME_Memory_Store_DB`.
- Added: `ME_Memory_Store_Prep → ME_Memory_Store_Embed`.
- Added: `ME_Memory_Store_Embed → ME_Memory_Store_Embed_Merge`.
- Added: `ME_Memory_Store_Embed_Merge → ME_Memory_Store_DB`.

## Counts
- nodeCount: 45 → 47
- connectionCount: 63 → 65
- active: preserved (true)

## Invariants verified by builder
- BUILD-INV-1 only the three named nodes appear in the diff.
- BUILD-INV-2 only the four named connection edits appear.
- BUILD-INV-3 Store_Embed mirrors Search_Embed except jsonBody input field.
- BUILD-INV-4 Store_Embed_Merge reads Store_Prep, emits embedding_text, guards 1536-dim.
- BUILD-INV-5 SQL has `idempotency_key, embedding` column list end and `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END` guard; 14 binds.
- BUILD-INV-6 queryReplacement has 14 elements happy-path and 14 nulls error-path; 14th is `$json.__db.embedding_text`.
- BUILD-INV-7 no credential changes anywhere.
- BUILD-INV-8 no position changes except the two new nodes' coords and the one deliberate Store_DB shift.
- BUILD-INV-9 workflow-level metadata preserved byte-for-byte.
- BUILD-INV-10 active flag preserved.
