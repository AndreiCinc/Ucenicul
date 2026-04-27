# F6A-FOLLOWUP-SUPERSEDE-EMBED — Diff Summary

Builder: `build_patch_f6a_followup_supersede_embed.mjs`
Ran: 2026-04-24T09:19:38.056Z

## Snapshots

- pre  `WF-ME-01_pre_f6a_followup.json` sha256 = `1b487734443891a6e7c70c2cf63e26aabc6bd288ca6cd67cf1188dad2c816906`
- post `WF-ME-01_post_f6a_followup.json` sha256 = `7f2816afdda50021b1b9a561eed23df4ad72d5ad7db1c3f1e9205cff589773b4`

## Merge jsCode sha256

`6272bec4e67422947d71a1b2283670c57bc6e99b177a55f7754b842332750f9b`

## Diff surface

- nodes.length: 47 -> 49 (+2)
- edges count:  65 -> 67 (+2)
- added nodes:  ["ME_Memory_Supersede_Embed","ME_Memory_Supersede_Embed_Merge"]
- modified nodes: ["ME_Memory_Supersede_DB"] (parameters.query + parameters.options.queryReplacement only)
- removed nodes: []
- bind slots in Supersede_DB SQL: 15 -> 16
- queryReplacement success branch: 15 -> 16 __db references (added `embedding_text`)
- queryReplacement error branch: 15 -> 16 nulls

## Connection edits

- removed: ME_Memory_Supersede_Prep -> ME_Memory_Supersede_DB
- added:   ME_Memory_Supersede_Prep -> ME_Memory_Supersede_Embed
- added:   ME_Memory_Supersede_Embed -> ME_Memory_Supersede_Embed_Merge
- added:   ME_Memory_Supersede_Embed_Merge -> ME_Memory_Supersede_DB

## BUILD-INV

- BUILD-INV-1 deterministic: yes (builder reads pre, applies pure transform)
- BUILD-INV-2 exactly 2 new nodes: PASS
- BUILD-INV-3 single modified node (Supersede_DB, only parameters.query+options.queryReplacement): PASS
- BUILD-INV-4 non-target nodes byte-identical: PASS
- BUILD-INV-5 edge count +2: PASS
- BUILD-INV-6 Embed input expression present: PASS
- BUILD-INV-7 Merge references Supersede_Prep, not Store_Prep: PASS
- BUILD-INV-8 SQL has 16 distinct binds + `$16` CASE guard: PASS
- BUILD-INV-9 queryReplacement: success=16 __db refs incl embedding_text, error=16 nulls: PASS
- BUILD-INV-10 output sha256 printed above: PASS
