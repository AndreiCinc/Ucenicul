# family_batch_supersede_20260421.md — first batch for `supersede_memory`

Date: 2026-04-21.
Frontier: **F3 — first-batch kickoff for the `supersede_idempotency` family**.
Precondition: F4 rolled out (`versionId=fc43f6bc-…`).

## Scope of "first batch"

Four targeted cases covering the variant axes of the `supersede_idempotency` family: first-time supersede, replay-same-step idempotency, already-superseded target, missing target. The seed manifest lists 25 combinatorial variants (category × memory_type × replay_mode); the 4 cases here prove the *semantically distinct* branches — the remaining 21 are pure parameter-combination coverage deferred to F3.1.

## Inputs

- Workflow: `WF-ME-01 Module Execution`, id `uq26nh1grIpnHju0`, versionId `fc43f6bc-…`
- tenant_id: `aaaaaaaa-0000-0000-0000-000000000001`
- execution_context_id: `d4f82a41-01cd-4fb7-9d70-573557348e74`
- thread_id: `77777777-0000-0000-0000-000000000007`
- idempotency scope: `mem-batch-v2c-su*`

Seed row inserted in-batch via live `store_memory` (exec 1598): `1c2168f0-19ab-4a71-b923-d15860ba088c`, category `smoke_f3_supersede`, tier recent, active.

## Runs

| Run | step_id | exec id | action | target | status_kind | Oracle |
|---|---|---|---|---|---|---|
| SU1 seed | su1-seed | 1598 | store_memory | — | success | Inserts `1c2168f0-…` recent/active (fixture seed) |
| SU1 super | su1-super | 1600 | supersede_memory | `1c2168f0` | success | new_id `3a3de63d-…-cd8677a15601`, idempotency_reused=false, new_insert=true |
| SU2 replay | su1-super (same step_id) | 1602 | supersede_memory | `1c2168f0` | success | returns SAME new_id `3a3de63d-…`, idempotency_reused=true, new_insert=false |
| SU3 already | su3 | 1604 | supersede_memory | `1c2168f0` (now superseded) | error | `SUPERSEDE_TARGET_INVALID` (new step_id, but target status='superseded') |
| SU4 missing | su4 | 1613 | supersede_memory | `ffffffff-ffff-…-ffff` | error | `SUPERSEDE_TARGET_INVALID` (target doesn't exist) |

Raw captures: `docs/architecture/memory/v2/f3/artifacts/runtime/exec_supersede_*.summary.json`.

## Oracles — all Pass

- **First-time supersede (SU1 super)**: `new_insert=true`, `idempotency_reused=false`. New row created with `supersedes_memory_id=1c2168f0`; old row flipped to `status='superseded'`, `updated_at` advanced to `08:01:44.825Z`. DB verification: exactly 2 rows with category `smoke_f3_supersede` post-batch.
- **Replay idempotency (SU2)**: Same step_id ⇒ same `idempotency_key = supersede_memory:d4f82a41-…:mem-batch-v2c-su1-super`. DB returns the already-created replacement row; `idempotency_reused=true`, `new_insert=false`, `created_at` unchanged from SU1. No duplicate row. Matches contract §5 "duplicate idempotency → return existing row, not duplicate".
- **Already-superseded (SU3)**: Different step_id, but target row is now `status='superseded'`. DB UPDATE WHERE clause (`status='active'`) does not match ⇒ node returns `{success:true}` placeholder. `ME_Memory_Supersede_Result` correctly detects absence of `id` and emits `SUPERSEDE_TARGET_INVALID`. Matches contract §5 "old target already superseded → failed with SUPERSEDE_TARGET_INVALID".
- **Missing target (SU4)**: Nonexistent uuid. Same path — UPDATE matches nothing, Result emits `SUPERSEDE_TARGET_INVALID`. Matches contract §5 "old target missing → failed". Shared taxonomy with SU3 is intentional (the contract collapses both into one error code).
- **DB invariant**: 2 rows total under `smoke_f3_supersede` (seed superseded + replacement active). SU3 and SU4 created zero rows. SU2 replay created zero rows.

## Residual failures

None. 5/5 (4 supersede + 1 seed) oracles pass.

## Runtime boundary (not a bug)

All domain-write cases (SU1 seed, SU1 super, SU2 replay) downstream dispatch to `WF-RA-01` fails with `INVALID_AGGREGATION_INPUT` because the module emits `domain_writes_performed=true` without the full dispatcher/batcher envelope. Documented F1 boundary (see `MEMORY_V2_BUG_LEDGER.md §Runtime boundaries observed during F1`). Not a memory_module defect.

## Known-next-steps (not residuals — deliberately scoped out)

- Full 25-case combinatorial expansion (category × memory_type × replay_mode) requires F3.1 walker/sidecar.
- Supersede with caller-supplied `tier='long_term'` (direct-to-long-term replacement) — not exercised, deferred.
- Supersede chain (A → A' → A''): contract §5 says "no automatic chain guesswork in v1" — covered by SU3 (attempting to supersede a superseded row is explicitly refused).
- Cross-tenant supersede (tenant A tries to supersede tenant B's row) — not exercised in this batch; the Prep node scopes the UPDATE WHERE by `tenant_id` so it should behave identically to SU4 missing target, but not proved here. Add to F3.1.
