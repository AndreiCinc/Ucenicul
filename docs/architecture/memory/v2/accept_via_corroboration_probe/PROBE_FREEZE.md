# ACCEPT-VIA-CORROBORATION-PROBE — Probe Freeze

Frozen: 2026-04-24.
Baseline (from Step 1 close): live versionId `67cb8545-f1a0-40ab-b8f4-5bf5edd89328`, 49 nodes, 67 connections, active=true. No further workflow mutation in Step 2.

## Q1. How does live `store_memory` influence corroboration?

After Step 1 (V2-OBS-STORE-PREP-INPUT-PASSTHROUGH), `store_memory` accepts `corroboration_count` as a caller input and persists it into `memory_items.corroboration_count` (subject to DB CHECK `>= 1`). Therefore a single `store_memory` call with `corroboration_count: 2` (or higher) is a workflow-native way to seed a row whose persistent state satisfies the corroboration acceptance predicate.

This eliminates the previously-blocked deferral of "accept-via-corroboration probe" (V2-018: required double-store seed). Step 1 closes that infra gap; the probe is now achievable with a single store_memory + a single promote_memory.

## Q2. Live promote acceptance predicate

From `ME_Memory_Promote_DB.parameters.query`:

```sql
accept AS (
  SELECT id,
         (corroboration_count >= $3::int
            OR ($4::boolean IS TRUE)
            OR ($5::boolean IS TRUE)
            OR (user_confirmed IS TRUE)
            OR (evidence_validated IS TRUE)) AS ok,
         tier
  FROM target
)
```

Bound from `Promote_Prep`:
- `$3` = `__db.corroboration_threshold = 2` (hardcoded).
- `$4` = `__db.user_confirmed = inputs.user_confirmed === true`.
- `$5` = `__db.evidence_validated = inputs.evidence_validated === true`.

A row is accepted iff at least one of: `corroboration_count >= 2`, caller user_confirmed=true, caller evidence_validated=true, row.user_confirmed=true, row.evidence_validated=true. **For accept-via-corroboration**: row.corroboration_count >= 2 with caller flags both false and row.user_confirmed/evidence_validated both false.

## Q3. Probe seeding strategy

| Family | Cases | Seeding | Promote inputs | Expected outcome |
|---|---|---|---|---|
| A. accept_via_corroboration | CPE-01..15 (15) | `store_memory` with `corroboration_count: 2` (or 3..) | `user_confirmed=false, evidence_validated=false, promotion_target='long_term'` | `accepted=true`, tier flips `recent → long_term`, `acceptance_signals=['corroboration']` |
| B. deny_below_threshold | CPE-16..25 (10) | `store_memory` default (corroboration_count=1) | same as A | `accepted=false, denial_reason='acceptance_criteria_not_met'`, tier stays `recent` |
| C. deny_wrong_tier_or_invalid_target | CPE-26..35 (10) | C1 (5 cases): seed with `tier='long_term'`. C2 (5 cases): no seed, use bogus uuid | promote with no flags | C1 → `denial_reason='not_in_recent_tier'`. C2 → `INVALID_PROMOTION_TARGET` (Prep) or row-not-found (DB Result fallback) |
| D. idempotent_replays | CPE-36..40 (5) | replay 5 of the CPE-01..15 step_ids | n/a | same row state; no side-effects |
| E. regression_spots | CPE-41..50 (10) | mixed: 5 store, 3 supersede, 1 search, 1 recall | n/a | F6A store-embed still works; F6A-followup supersede still works; non-target lanes preserved |

Total: 15+10+10+5+10 = 50 live cases.

## Q4. Deny-control construction

- **CPE-16..25 (B):** Seed has `corroboration_count=1` (default). All 5 acceptance routes are false. Expected `denial_reason='acceptance_criteria_not_met'`.
- **CPE-26..30 (C1 wrong_tier):** Seed has `tier='long_term'`. Even though corroboration may pass, the WHERE clause `accept.tier = 'recent'` blocks the UPDATE → `denial_reason='not_in_recent_tier'`.
- **CPE-31..35 (C2 invalid_target):** Promote with random non-existent uuid → `target` CTE returns 0 rows → Result emits `INVALID_PROMOTION_TARGET`.

## Q5. Idempotency collisions

Seed step_ids and promote step_ids are namespaced as `mem-smoke-corro-probe-<family>-<NN>` (seed) and `mem-smoke-corro-probe-promote-<family>-<NN>` (promote). All keys distinct across CPE-01..50.

For replays (CPE-36..40), I deliberately reuse 5 of the CPE-01..15 promote step_ids → second promote call against the same step_id should be a no-op against the now-`long_term` row (target CTE returns it; accept.tier is now `long_term`, not `recent`; UPDATE skipped; UNION ALL returns the row with `denial_reason='not_in_recent_tier'`). DB-side: rows_for_step remains 1 store + 1 promote logical operation; no duplicate target rows.

## Q6. acceptance_signals validation

Captured via `ME_Memory_Promote_Result` envelope: `actions_executed[0].details.acceptance_signals` array. For Family A: must contain `'corroboration'`. For Families B, C, D, E: array empty (deny path) or N/A (non-target).

## Q7. No-direct-DB-write proof

- All seeds via `store_memory` execute_workflow.
- All promotes via `promote_memory` execute_workflow.
- DB SELECT only via `mcp__postgres__execute_sql`; no INSERT/UPDATE/DELETE issued by the agent.
- Mission namespace `mem-smoke-corro-probe-*` is unique to this mission.

## Q8. Test mapping (CPU/CPE/CPI 50/50/50)

| Pack category | IDs | Maps to |
|---|---|---|
| CPU local — predicate_cartography | CPU-01..10 | Q2 SQL predicate cartography (single live SQL inspection covers all 10) |
| CPU local — seed_strategy | CPU-11..20 | Q3 Family A seeding strategy variants |
| CPU local — acceptance_signals | CPU-21..30 | Q6 acceptance_signals expectations |
| CPU local — deny_controls | CPU-31..40 | Q4 deny-control variants |
| CPU local — idempotency_and_isolation | CPU-41..50 | Q5 namespace + replay expectations |
| CPE live — accept_via_corroboration | CPE-01..15 | Family A live runs |
| CPE live — deny_below_threshold | CPE-16..25 | Family B live runs |
| CPE live — deny_wrong_tier_or_invalid_target | CPE-26..35 | Families C1+C2 |
| CPE live — idempotent_replays | CPE-36..40 | Family D replays |
| CPE live — regression_spots | CPE-41..50 | Family E non-target |
| CPI SQL — accept rows | CPI-01..15 | Family A row state assertions |
| CPI SQL — deny rows | CPI-16..25 | Family B row state |
| CPI SQL — wrong-tier/invalid | CPI-26..35 | Family C |
| CPI SQL — idempotency | CPI-36..42 | Family D + corpus dedupe check |
| CPI SQL — index unchanged | CPI-43..50 | ivfflat index byte-identical |

## Acceptance gates

- All 50 CPU evaluable from probe freeze + cartography.
- All 50 CPE workflow-mediated with status:success.
- All 50 CPI grouped invariants pass.
- Accept-via-corroboration acceptance_signals includes `'corroboration'` for at least Family A.
- Deny families remain denied; tier preserved in C1; no row created in C2.
- F6A store-embed and F6A-followup supersede-embed both intact (E5+E5sup smokes).

No workflow mutation in Step 2.
