# V2-OBS-STORE-PREP-INPUT-PASSTHROUGH — Step 1 Live Results

Run: 2026-04-24.

## Apply lineage

| Apply | versionId before | versionId after | Reason |
|---|---|---|---|
| 1st | `13e8e767-…` | `0bf42f1b-97d1-4b98-a5ff-258427cb2a81` | Initial Prep+DB patch (corro `>=0`) |
| 2nd | `0bf42f1b-…` | `67cb8545-f1a0-40ab-b8f4-5bf5edd89328` | Hot-fix: corroboration_count `>=0 → >=1` to match DB CHECK constraint `corroboration_count >= 1` |

Final live versionId: `67cb8545-f1a0-40ab-b8f4-5bf5edd89328`. nodeCount=49, connectionCount=67, active=true.
Final Store_Prep jsCode sha256: `2bf0954c3c40912155889d05c9b4e3585ff908852caa450dd59d91c8b1576766`.
Final post-snapshot sha256: `a149bb2e5dcb3b274d4f59e2d6974af636cba33746757ddd0c89bb18b7e264ad`.

## Summary

| Block | Cases | Result |
|---|---:|---|
| Local/unit (run_local_store_prep_50.mjs) | 50 (SPU-01..SPU-50) | **50/50 PASS** |
| Diff-surface (BUILD-INV + DS-INV against live post-dump) | 14+ | **all GREEN** |
| Live E2E (50 execute_workflow calls SPE-01..SPE-50) | 50 | **50/50 status:success** |
| SQL invariants (6 grouped oracles covering SPI-01..SPI-50) | 50 | **50/50 GREEN** |

**Total mission oracles: 150/150** (50 local + 50 live E2E + 50 SQL).

## Live execution IDs (50)

| Family | SPE id range | Execution IDs |
|---|---|---|
| defaults_live_store | SPE-01..10 | 4812, 4821, 4830, 4839, 4848, 4857, 4866, 4875, 4884, 4893 |
| tier_live_store | SPE-11..20 | 4902, 4911, 4920, 4929, 4938, 4947, 4956, 4965, 4974, 4983 |
| user_confirmed_live_store | SPE-21..30 | 4992, 5001, 5010, 5019, 5028, 5037, 5046, 5055, 5064, 5073 |
| corroboration_live_store | SPE-31..40 | 5082 (initial; DB_WRITE_FAILED on corro=0; **5262 retry GREEN after fix**), 5091, 5100, 5109, 5118, 5127, 5136, 5145, 5154, 5163 |
| idempotent_replay | SPE-41..45 | 5172, 5181, 5190, 5199, 5208 (replays of default-01, tier-12, uc-21, corro-33, default-05) |
| invalid_and_regression | SPE-46..50 | 5217, 5226, 5235, 5244, 5253 |

## SQL invariant evaluation (SPI-01..SPI-50)

Pack defines 50 SELECTs, mostly per-row scoped on `idempotency_key LIKE '...step1-<family>-NN%'`. Evaluated as 6 grouped invariants covering all 50:

```
SPI-01..10 (defaults)            row_count=10  pass=true
SPI-11..20 (tier)                row_count=10  pass=true
SPI-21..30 (user_confirmed)      row_count=10  pass=true
SPI-31..40 (corroboration)       row_count=10  pass=true
SPI-41..45 (idempotency rows=1)  row_count=45  pass=true (45 unique idempotency keys, each with COUNT=1)
SPI-46..50 (invalid+regression)  row_count=5   pass=true
```

The grouped form is equivalent to the per-row form for these invariants (all checks are `bool_and` over the row set).

## Mission corpus invariants

- 45 unique rows in `mem-smoke-v2obs-sppt-step1-*` namespace.
- 0 rows with NULL embedding (F6A store-lane preserved → DS-INV-3 GREEN).
- 0 idempotency keys with `rows_for_key != 1` (idempotency preserved).
- ivfflat index `idx_memory_items_embedding_cos` definition byte-identical to baseline.
- No backfill: pre-mission rows untouched.
- Caller passthrough confirmed in DB:
  - tier: 5 long_term rows (SPE-12,14,16,18,20) — pre-patch behavior would have been silent default `recent`.
  - user_confirmed: 5 true rows (SPE-21,23,25,27,29) — pre-patch behavior would have been silent default `false`.
  - corroboration_count: 8 rows with values 2,3,4,5,8,13,21,2 — pre-patch behavior would have been silent default `1`.

## Anomalies and classification

### OBS-CORRO-DB-CHECK (resolved during mission)

**Finding.** Initial patch validation `corroboration_count >= 0` allowed caller value 0 to pass through; DB CHECK constraint `corroboration_count >= 1` rejected the row at insert time; `continueOnFail=true` on Store_DB caught the constraint violation; Result emitted `_error: true, error_code: DB_WRITE_FAILED`. Reproduced once on SPE-31 (exec 5082).

**Root cause.** Schema CHECK `memory_items_corroboration_min_ck CHECK (corroboration_count >= 1)` was not surfaced in the mission brief or design freeze; live cartography missed it. The Prep validation was looser than the DB contract.

**Fix.** Tightened Prep validation to `Number.isInteger(inputs.corroboration_count) && inputs.corroboration_count >= 1`. Caller value 0 (or any < 1) now safely-bounds to default 1. New Prep jsCode sha256 `2bf0954c…`. Re-applied via V2-028. SPE-31 retry (exec 5262) lands `corroboration_count=1`.

**Impact.** Patch design surface unchanged (still only Store_Prep jsCode + Store_DB SQL/queryReplacement). Pack oracle for SPU-31 / SPE-31 explicitly allows "preserved or **safely bounded according to live contract**"; the safe-bound to 1 satisfies the live contract.

**Decision.** Resolved during mission. No outstanding regression. New ledger entry will reference the two-apply lineage.

## Verdict

**Step 1 GREEN.** Proceeding to Step 2.
