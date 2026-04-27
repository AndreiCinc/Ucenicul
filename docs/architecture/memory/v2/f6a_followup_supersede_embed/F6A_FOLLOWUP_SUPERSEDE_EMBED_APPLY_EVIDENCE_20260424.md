# F6A-FOLLOWUP-SUPERSEDE-EMBED — Apply Evidence (2026-04-24)

Canonical channel: V2-028 autonomous agent-run local `n8n-patch.mjs replace`.

## Pre-state (Phase 5)

Captured via `mcp__n8n__verify_workflow` on 2026-04-24 immediately before apply:

| Field | Value | Match baseline |
|---|---|---|
| versionId | `c07fe923-76eb-4901-b53b-14039536df55` | YES |
| nodeCount | 47 | YES |
| connectionCount | 65 | YES |
| active | true | YES |

Pre-snapshot JSON sha256: `1b487734443891a6e7c70c2cf63e26aabc6bd288ca6cd67cf1188dad2c816906`.
Post-payload JSON sha256: `7f2816afdda50021b1b9a561eed23df4ad72d5ad7db1c3f1e9205cff589773b4`.
Merge jsCode sha256: `6272bec4e67422947d71a1b2283670c57bc6e99b177a55f7754b842332750f9b`.

Pre-apply gate: all Phase 4 local oracles GREEN (38/38: 7 PF + 9 MU + 14 WD + 8 LI). Green light for apply.

## Post-state (Phase 6)

Captured via `mcp__n8n__verify_workflow` immediately after `n8n-patch.mjs replace` exit-zero on 2026-04-24T09:22:31Z:

| Field | Expected | Got | Match |
|---|---|---|---|
| versionId | new (!= baseline) | `13e8e767-0b0e-401a-b3da-7db94e1f926a` | YES |
| nodeCount | 49 | 49 | YES |
| connectionCount | 67 | 67 | YES |
| active | true | true | YES |

Live post-apply dump: `artifacts/WF-ME-01_live_post_f6a_followup.json`.

Live merge jsCode sha256 (extracted from live dump): `6272bec4e67422947d71a1b2283670c57bc6e99b177a55f7754b842332750f9b` — byte-identical to the staged-builder output. Design → staged → live byte-match end-to-end.

## Diff-surface post-apply (Phase 6)

Re-ran the pack's 14-check harness against `pre` vs **live** post-dump:

| Check | Result |
|---|---|
| WD-1 / DS-INV-1 node count +2 | **PASS** |
| WD-2 / DS-INV-2 connection count +2 net | **PASS** |
| WD-3 / DS-INV-3 new nodes exist | **PASS** |
| WD-4 / DS-INV-4 embed node credential (openAiApi, predefinedCredentialType) | **PASS** |
| WD-5 / DS-INV-5 embed jsonBody has `text-embedding-3-small`, `input`, `$json.__db.*` | **PASS** |
| WD-6 / DS-INV-6 merge jsCode references `ME_Memory_Supersede_Prep`, `embedding_text`, `1536` | **PASS** |
| WD-7 / DS-INV-7 Supersede_DB SQL has `embedding` + `vector(1536)` | **PASS** |
| WD-8 / DS-INV-8 Supersede_DB CASE `$16::text IS NULL ... ELSE $16::vector(1536)` | **PASS** |
| WD-9 / DS-INV-9 queryReplacement success branch +1 slot (embedding_text) | **PASS** |
| WD-10 / DS-INV-10 queryReplacement error branch nulls +1 | **PASS** |
| WD-11 / DS-INV-11 non-target existing 46 nodes byte-identical | **PASS** |
| WD-12 / DS-INV-12 exactly 2 new nodes added | **PASS** |
| WD-13 / DS-INV-13 supersede lane rewired (4 edges) | **PASS** |
| WD-14 / DS-INV-14 settings object unchanged | **PASS** |

**14/14 DS-INV GREEN.**

## Re-verification of MU-1..MU-9 against live-derived pure candidate

Extracted the live `ME_Memory_Supersede_Embed_Merge.parameters.jsCode`, inlined the `$()` lookup into `(prep, httpResp)` arguments (same transform documented in `tests/README_TESTS.md`), ran the pack's harness:

```
PASS MU-1 valid vector
PASS MU-2 OpenAI error object
PASS MU-3 statusCode >= 400
PASS MU-4 malformed response
PASS MU-5 wrong dimension
PASS MU-6 prep error short-circuit
PASS MU-7 existing embedding_text preserved
PASS MU-8 non-embedding __db fields preserved
PASS MU-9 passthrough preserved with diagnostics appended
ALL PASS 9/9
```

Live-derived candidate: `harness/supersede_merge_live_candidate.mjs`. Live-jsCode text: `harness/merge_live_jscode.txt`.

## Phase 6 verdict

**GREEN.** Live WF-ME-01 advanced from `c07fe923` → `13e8e767`. Diff surface matches the staged design byte-for-byte. Merge jsCode live = staged. No rollback required. Proceeding to Phase 7 (live E2E matrix).
