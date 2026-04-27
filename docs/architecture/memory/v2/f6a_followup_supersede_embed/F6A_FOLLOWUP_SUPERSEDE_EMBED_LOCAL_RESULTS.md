# F6A-FOLLOWUP-SUPERSEDE-EMBED — Phase 4 Local Results

Ran: 2026-04-24

## Summary

| Block | Cases | Result |
|---|---:|---|
| A — Preflight (Phase 0) | 7 (PF-1..PF-7) | 7/7 GREEN (already captured Phase 0) |
| B — Merge unit | 9 (MU-1..MU-9) | **9/9 PASS** |
| C — Diff-surface | 14 (WD-1..WD-14 == DS-INV-1..14) | **14/14 PASS** |
| D — Integration-style (mocked DB) | 8 (LI-1..LI-8) | **8/8 PASS** |

**Total local oracles: 38/38 GREEN** (7 preflight + 31 local).

## Artifacts used

- `harness/supersede_merge_candidate.mjs` — pure candidate (sha256 equivalent to live jsCode modulo the `$()` lookup inlined into `prep`/`httpResp` parameters).
- `artifacts/WF-ME-01_pre_f6a_followup.json` (sha256 `1b487734443891a6e7c70c2cf63e26aabc6bd288ca6cd67cf1188dad2c816906`).
- `artifacts/WF-ME-01_post_f6a_followup.json` (sha256 `7f2816afdda50021b1b9a561eed23df4ad72d5ad7db1c3f1e9205cff589773b4`).
- `artifacts/build_patch_f6a_followup_supersede_embed.mjs` (deterministic; BUILD-INV-1..10 all PASS; re-run produces byte-identical output).

## Merge jsCode hashes

- Live Code-node text written into post snapshot: sha256 `6272bec4e67422947d71a1b2283670c57bc6e99b177a55f7754b842332750f9b` (includes the `$('ME_Memory_Supersede_Prep').first().json` lookup + `const httpResp = $json;` prelude).
- Harness-pure candidate (`harness/supersede_merge_candidate.mjs`): parameters `(prep, httpResp)` replace the `$()` + `$json` lookups. Body byte-identical to the live jsCode after the first 3 lines. This is the manual inline transformation the pack's `README_TESTS.md` authorises.

## Block B — Merge unit (MU-1..MU-9)

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

## Block C — Diff-surface (WD-1..WD-14)

```
PASS WD-1 node count +2
PASS WD-2 connection count +2 net
PASS WD-3 new nodes exist
PASS WD-4 embed node credential shape
PASS WD-5 embed node model and input expression
PASS WD-6 merge code references supersede prep + 1536 + embedding_text
PASS WD-7 Supersede_DB SQL includes embedding projection
PASS WD-8 Supersede_DB SQL has CASE null guard
PASS WD-9 queryReplacement adds exactly one db slot
PASS WD-10 error/null branch increments if present
PASS WD-11 non-target existing nodes byte-identical
PASS WD-12 only two new nodes added
PASS WD-13 supersede lane rewired
PASS WD-14 settings object unchanged in candidate JSON
ALL PASS 14/14
```

## Block D — Integration-style mocked DB (LI-1..LI-8)

```
PASS LI-1 valid supersede with embedding
PASS LI-2 idempotent replay
PASS LI-3 http error still supersedes
PASS LI-4 malformed response
PASS LI-5 invalid target -> no replacement row
PASS LI-6 prep _error short-circuit + DB error path
PASS LI-7 old row embedding preserved
PASS LI-8 replacement row semantically eligible
ALL 8/8
```

## Verdict

**Phase 4 GREEN.** All local oracles pass. Proceeding to Phase 5 (pre-apply verify + apply command).
