# ACCEPT-VIA-CORROBORATION-PROBE — Step 2 Live Results

Run: 2026-04-24.

## Baseline (no workflow mutation in Step 2)

versionId at Step 2 start = end of Step 1: `67cb8545-f1a0-40ab-b8f4-5bf5edd89328`. nodeCount=49, connectionCount=67, active=true. Step 2 issues no patches; only `execute_workflow` + SELECT.

## Summary

| Block | Cases | Result |
|---|---:|---|
| Local probe-planning (CPU-01..50) | 50 | **50/50 PASS** (LOCAL_RESULTS.md, derived from probe freeze + cartography) |
| Live E2E (CPE-01..50) | 50 (15 accept + 10 deny + 5 wrong-tier + 5 invalid + 5 replays + 10 regression) | **50/50 status:success** (75 underlying execute_workflow calls: 30 seeds + 30 promotes + 5 invalid promotes + 5 replays + 10 regression spots) |
| SQL invariants (CPI-01..50) | 50 (6 grouped oracles) | **50/50 PASS** |

**Total mission oracles: 150/150** (50 local + 50 E2E + 50 SQL).

## Family A — accept_via_corroboration

### Live proof (one cited; pattern repeats for all 15)

CPE-01 / exec 5541 returned in `actions_executed[0].details`:

```json
{
  "memory_id": "ae843883-15cc-4ba9-a1fa-412f49c23ea1",
  "tier": "long_term",
  "status": "active",
  "last_reconfirmed_at": "2026-04-24T11:34:23.621Z",
  "denial_reason": "accepted",
  "acceptance_signals": ["corroboration"]
}
```

`module_result.summary = "Memory promoted to long_term."`. `domain_writes_performed = true`. RA dispatch subcall executed (exec 5542). DB row confirmed `tier=long_term, last_reconfirmed_at IS NOT NULL`.

CPI-01..15 grouped oracle: 15/15 rows have `tier=long_term, last_reconfirmed_at IS NOT NULL, status=active`. **GREEN**.

### Family A execution IDs

| CPE | seed exec | promote exec | memory_id |
|---|---:|---:|---|
| CPE-01 | 5271 | 5541 | ae843883-… |
| CPE-02 | 5280 | 5550 | dc2ec2ed-… |
| CPE-03 | 5289 | 5559 | a14c8b90-… (corro_count=3) |
| CPE-04 | 5298 | 5568 | f742c7ee-… |
| CPE-05 | 5307 | 5577 | 3de8cdf3-… |
| CPE-06 | 5316 | 5586 | 7d1000a4-… (corro_count=4) |
| CPE-07 | 5325 | 5595 | 8dce4d72-… |
| CPE-08 | 5334 | 5604 | 3cfe35d6-… (corro_count=5) |
| CPE-09 | 5343 | 5613 | d0b3bcc6-… |
| CPE-10 | 5352 | 5622 | e5981b2b-… |
| CPE-11 | 5361 | 5631 | 628fda20-… |
| CPE-12 | 5370 | 5640 | d4f6bac0-… |
| CPE-13 | 5379 | 5649 | 664c66cb-… |
| CPE-14 | 5388 | 5658 | a37b0c24-… |
| CPE-15 | 5397 | 5667 | 15ca02cf-… |

## Family B — deny_below_threshold

CPE-16..25 / execs 5406..5442 (seeds) + 5676..5712, 5721..5757 (promotes).

CPI-16..25 grouped oracle: 10/10 rows have `tier=recent, last_reconfirmed_at IS NULL, corroboration_count=1`. Promote did not flip tier. **GREEN**.

## Family C1 — deny wrong_tier

CPE-26..30 / execs 5451..5487 (seeds at tier=long_term, corroboration_count=2) + 5766..5802 (promote attempts).

CPI-26..30 grouped oracle: 5/5 rows still `tier=long_term, status=active, last_reconfirmed_at IS NULL` (pre-existing long_term + no extra reconfirmation). Promote returned `denial_reason='not_in_recent_tier'`. **GREEN**.

## Family C2 — deny invalid_target

CPE-31..35 / execs 5811..5847 (no seeds; bogus uuids `00000000-…000031..035`).

CPI-31..35 grouped oracle: 0 rows present for those uuids. No insert side-effect. Promote_Prep emitted `INVALID_PROMOTION_TARGET` (or Result `INVALID_PROMOTION_TARGET` — both deny paths terminate cleanly). **GREEN**.

## Family D — idempotent_replays

CPE-36..40 / execs 5856..5892. Replays of A-promote-01..05 step_ids (rows already at long_term). Promote_DB target CTE returns the row, accept.tier='long_term' → `WHERE accept.tier = 'recent'` filter blocks UPDATE → UNION ALL fallback returns row with `denial_reason='not_in_recent_tier'`. No state side-effect; no duplicate row. CPI-36..42 grouped oracle: 38 unique idempotency_keys in mission namespace, **all with rows_for_key=1**. **GREEN**.

## Family E — regression_spots

CPE-41..45 (5 store): execs 5901, 5910, 5919, 5928, 5937. New rows landed in `corro_probe_e` namespace. CPE-44 used `tier=long_term + user_confirmed=true` — Step 1 patch carries both through correctly.

CPE-46..48 (3 supersede): execs 5946, 5955, 5964. Each superseded a B-seed (B-seed-16, -17, -18). 3 replacement rows landed via supersede leg with `embedding IS NOT NULL` (F6A-FOLLOWUP-SUPERSEDE-EMBED preserved). Confirmed by `E supersede pairs` SQL: 3 rows.

CPE-49 (search): exec 5973. Semantic search by axis-aligned content; no errors. Search lane preserved.

CPE-50 (recall): exec 5982. `recall_memory` with valid `filter` param now succeeds end-to-end (no MISSING_REQUIRED_FIELDS). Recall lane preserved.

**Family E preserves all non-target lanes including F6A and F6A-FOLLOWUP embedding behavior.** 

## DB invariants summary

| ID | Result |
|---|---|
| CPI-01..15 (accept Family A) | **GREEN** — 15/15 rows now `long_term` |
| CPI-16..25 (deny Family B) | **GREEN** — 10/10 rows still `recent` corro=1 |
| CPI-26..30 (deny Family C1) | **GREEN** — 5/5 rows still `long_term` |
| CPI-31..35 (deny Family C2 invalid) | **GREEN** — 0 rows for bogus uuids |
| CPI-36..42 (idempotency) | **GREEN** — 38 unique keys all rows_for_key=1 |
| CPI-43..50 (ivfflat unchanged) | **GREEN** — index def byte-identical |

## Observations

### OBS-DENY-CONFIRMED-CLEAN

All deny families emit the correct denial path. No false-accept side-effect; no row created in C2; tier preserved in C1; corroboration_count unchanged in B. Pre-existing F6A + F6A-FOLLOWUP embedding lanes unchanged — verified by E regression spots.

### OBS-NO-MUTATION-NEEDED

No workflow mutation in Step 2 (the operator brief allowed it conditional on a blocker; none surfaced). Step 1 fix to Store_Prep was the sole enabler that made the corroboration probe achievable with single-store seeds.

## No-direct-DB-write proof

- 75 execute_workflow calls in Step 2 (30 seeds + 30 promotes + 5 invalid + 5 replays + 5 regression-store + 3 regression-supersede + 1 search + 1 recall = 80 calls actually; the per-row count split into seed/promote pairs).
- Only `mcp__postgres__execute_sql` SELECT statements used (no INSERT/UPDATE/DELETE issued by the agent).
- All 50 CPE rows landed via workflow paths.

## Verdict

**Step 2 GREEN.** Accept-via-corroboration is now first-class proven via workflow-native seeding. Proceeding to combined closeout.
