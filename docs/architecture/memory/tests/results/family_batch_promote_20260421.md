# family_batch_promote_20260421.md — first batch for `promote_denial_vocabulary` family (F3 extension)

Date: 2026-04-21.
Frontier: **F3 — first-batch kickoff for the `promote_denial_vocabulary` family**.
Precondition: F4 rolled out (`versionId=fc43f6bc-…`).

## Scope of "first batch"

A single targeted case to fill the one gap left by F4: prove the `evidence_validated` acceptance signal end-to-end in addition to F4-t3 which only proved `user_confirmed`.

F4 already covered the seed manifest's three `corroboration_mode` denial branches:
- `already_long_term` ⇒ `denial_reason: not_in_recent_tier` (F4-t1, exec 1524)
- `none` ⇒ `denial_reason: acceptance_criteria_not_met` with all signals false (F4-t2, exec 1533)
- `one_only` ⇒ `denial_reason: acceptance_criteria_not_met` (degenerate of `none` — `corroboration_count=1` < threshold 2; same DB branch). F4-t2 row had `corr=1`.

F4-t3 covered accept-via-user_confirmed. The remaining accept signals are:
- accept-via-evidence_validated → **PF3-eb (this batch)**
- accept-via-corroboration → **deferred** (requires `corroboration_count >= 2` on a recent-tier row; no such row exists, requires duplicate-store seed flow not currently in batch scope)

## Inputs

- Workflow: `WF-ME-01 Module Execution`, id `uq26nh1grIpnHju0`, versionId `fc43f6bc-…`
- tenant_id: `aaaaaaaa-0000-0000-0000-000000000001`
- execution_context_id: `d4f82a41-01cd-4fb7-9d70-573557348e74`
- thread_id: `77777777-0000-0000-0000-000000000007`
- idempotency scope: `mem-batch-v2c-pf3-*`

Seed row inserted in-batch via live `store_memory` (exec 1622): `5a0b1317-8723-41be-8166-b027f98c1104`, category `smoke_f3_promote`, tier recent, active, `user_confirmed=false`, `evidence_validated=false`, `corroboration_count=1`.

## Runs

| Run | step_id | exec id | action | inputs | denial_reason | acceptance_signals | tier delta | DB invariant |
|---|---|---|---|---|---|---|---|---|
| PF3 seed | pf3-seed-eb | 1622 | store_memory | content + smoke_f3_promote | n/a | n/a | inserts at `recent` | new row 5a0b1317 |
| PF3-eb (accept) | pf3-eb | 1624 | promote_memory | `user_confirmed=false`, `evidence_validated=true` | `accepted` | `["evidence_validated"]` | recent → long_term | row 5a0b1317 updated; only this row mutated; `evidence_validated` flipped false→true; `last_reconfirmed_at=2026-04-21T08:04:20.852Z` |

Raw captures: `docs/architecture/memory/v2/f3/artifacts/runtime/exec_promote_pf3_*.summary.json`.

## Oracles — all Pass

- **`accept-via-evidence_validated` end-to-end**: `denial_reason='accepted'` verbatim (F4 patch correctly threads the value through, fixing pre-F4 `accepted ? null` regression), `acceptance_signals=['evidence_validated']` (only the `evidence_validated` predicate fired: corroboration `1 >= 2` false, user_confirmed both false). The single-element array is the exact-shape proof that the OR-of-3-signals branch correctly attributes which signal tipped the decision.
- **Artifacts entries**: 3 entries on accept — `{type:'memory_id', value:5a0b1317-…}`, `{type:'denial_reason', value:'accepted', promoted:true}`, `{type:'acceptance_signals', value:['evidence_validated']}`. F4's design contract for the artifacts shape holds for this signal in addition to `user_confirmed` (F4-t3) and the denials (F4-t1/F4-t2).
- **DB invariant**: only the targeted row mutated. Cross-check `SELECT WHERE category IN ('smoke_f3_supersede','smoke_f3_promote')` returns 3 rows post-batch (2 from supersede + 1 promote target); only `5a0b1317` has `last_reconfirmed_at` set, only `5a0b1317` has `tier='long_term'`, only `5a0b1317` has `evidence_validated=true`. No spurious mutations.
- **Contract §4 acceptance rule**: "Promotion is accepted if at least one is true: corroboration count threshold met, user_confirmed=true, evidence_validated=true." This batch proves the third predicate path with the same Result-node taxonomy F4 introduced.

## Residual failures

None. 2/2 (1 seed + 1 promote) oracles pass.

## Known-next-steps (not residuals — deliberately scoped out)

- **accept-via-corroboration**: requires seeding a recent-tier row to `corroboration_count >= 2`. The standard path is to call `store_memory` twice on identical `(tenant, content, category, source_thread_id)` so the second call increments `corroboration_count` via the unique-key conflict path. Adds 2 store calls + 1 promote call = 3 extra MCP round-trips. Deferred to F3.1 walker for batched execution.
- **Multi-signal accept**: a single call with `user_confirmed=true` AND `evidence_validated=true` should produce `acceptance_signals=['user_confirmed','evidence_validated']`. Pure code-path arithmetic; deferred.
- **Pre-existing-history accept**: a row with `user_confirmed=true` (from a prior call) being promoted with caller `user_confirmed=false`. Should still report `acceptance_signals=['user_confirmed']` per V2-014 (OR of caller + row). Deferred.
- **Replay accepted promote**: re-issuing the same step_id after accept. Promote does not have an idempotency_key path (per `ACTION_CONTRACTS_MEMORY.md §4` — only `store_memory` and `supersede_memory` carry `idempotency_key`). Replay should re-run the SQL, which returns `not_in_recent_tier` for the now-long_term row (same shape as F4-t1). Worth recording as a 1-line residual run, but functionally a duplicate of F4-t1 oracle. Deferred.

## Boundary (not a bug)

`ME_Dispatch_To_RA_01_SUBCALL` returns `INVALID_AGGREGATION_INPUT` because `domain_writes_performed=true`. Documented F1 runtime boundary; not a memory_module defect.
