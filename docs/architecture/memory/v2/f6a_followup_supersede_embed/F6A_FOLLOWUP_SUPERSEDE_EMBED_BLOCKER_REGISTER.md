# F6A-FOLLOWUP-SUPERSEDE-EMBED — Blocker Register

## Active blockers

None as of 2026-04-24 end-of-Phase-1.

## Known deliberate exclusions (not blockers)

| ID | Title | Owner |
|---|---|---|
| F6AF-X-01 | Rank-inversion on short rare-token queries is out-of-scope (pre-existing F6A OBS-E6.5; retrieval-quality tuning not authorized here) | future retrieval-quality mission |
| F6AF-X-02 | Back-fill of existing `embedding IS NULL` rows (102 rows as of 2026-04-24) | forbidden; DS-INV-6 invariant |
| F6AF-X-03 | `ivfflat` retrain policy | future F6C-IVFFLAT-RETRAIN-POLICY |
| F6AF-X-04 | Supersede-prep hardcoded flags fix | open follow-up `V2-OBS-STORE-PREP-INPUT-PASSTHROUGH` |
| F6AF-X-05 | Search/Recall/Promote/RA envelope edits | forbidden by scope |

## Risks watched during execution

- If live `ME_Memory_Supersede_DB` uses a CTE pattern where the replacement-row INSERT is an inner SELECT not directly amenable to appending a column, the builder may need a wider SQL splice than a single projection append. Phase 2 cartography resolves this before Phase 3 proceeds.
- If `ME_Memory_Supersede_Prep` does not emit the replacement content in `__db.content` (the F6A pattern) but uses a different field name, the Embed node's `input` expression must be derived from the live Prep output, not assumed. Phase 2 resolves this.
- If supersede-lane uses `continueOnFail=true` on the DB node with an error-branch queryReplacement (F6A pattern — OBS-E5), the error branch must receive one additional NULL slot to match the +1 success branch slot (per WD-10). Phase 2 confirms branch shape.

## Stop rule

If any of the above risks materializes and can't be resolved from live read-only inspection + F6A pattern comparison, the mission stops at Phase 2 with a hard blocker and reports to the operator.
