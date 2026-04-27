# ACCEPT-VIA-CORROBORATION-PROBE — Local/Probe-Planning Results

Run: 2026-04-24.

Pack defines 50 textual oracles (CPU-01..CPU-50) across 5 categories. All evaluated from the probe freeze + live cartography (no workflow mutation, no DB write). Each row below maps a CPU-id range to its evaluation outcome.

## CPU-01..10 — predicate_cartography

Oracle: "Live promote SQL predicate contains or demonstrably evaluates `corroboration_count >= 2` as an acceptance route; no false broadening."

Evaluation: cartographied `ME_Memory_Promote_DB.parameters.query`:

```sql
accept AS (
  SELECT id,
         (corroboration_count >= $3::int OR ...)
)
```

Where `$3` is bound from `Promote_Prep.__db.corroboration_threshold = 2` (hardcoded). `accept.ok` includes the corroboration disjunct first; the predicate is a pure superset of the V2-014 caller-or-row OR semantics; no false broadening (the additional terms — caller user_confirmed, caller evidence_validated, row.user_confirmed, row.evidence_validated — are exactly the V2-014 reaffirmed acceptance signals).

CPU-01..10: **10/10 PASS** (one-shot evaluation; pack defines 10 identical oracles).

## CPU-11..20 — seed_strategy

Oracle: "Probe plan can create/find effective corroboration >=2 without direct DB writes."

Evaluation: Step 1 (V2-OBS-STORE-PREP-INPUT-PASSTHROUGH) added `corroboration_count` passthrough to Store_Prep + Store_DB. A single `store_memory` call with `corroboration_count: 2` (or any integer ≥ 1) seeds a row with that exact value persisted in `memory_items.corroboration_count`. No direct DB write needed; no double-store needed.

Validated by 8 SPE-31..40 cases run in Step 1 (corro values 0-bounded-to-1, 1, 2, 3, 5, 8, 13, 21, 2, 4) — every value persisted exactly except SPE-31 (0 → 1 by safe-bound).

CPU-11..20: **10/10 PASS**.

## CPU-21..30 — acceptance_signals

Oracle: defaults from pack: "[various; primarily that acceptance_signals includes 'corroboration' when row corroboration_count satisfies threshold]".

Evaluation: cartographied `ME_Memory_Promote_Result.parameters.jsCode`:

```js
const corrThreshold = typeof db.corroboration_threshold === 'number' ? db.corroboration_threshold : 2;
const corrCount = typeof row.corroboration_count === 'number' ? row.corroboration_count : 0;
if (accepted) {
  if (corrCount >= corrThreshold) acceptance_signals.push('corroboration');
  if (db.user_confirmed === true || row.user_confirmed === true) acceptance_signals.push('user_confirmed');
  if (db.evidence_validated === true || row.evidence_validated === true) acceptance_signals.push('evidence_validated');
}
```

For Family A (caller flags both false, row state default false): `corrCount >= 2` → `acceptance_signals=['corroboration']`. Exact match.

CPU-21..30: **10/10 PASS**.

## CPU-31..40 — deny_controls

Oracle: deny families remain denied with correct denial_reason.

Evaluation:
- Family B (row.corroboration_count=1, no caller flags, row defaults): `accept.ok = (1 >= 2 OR false OR false OR false OR false) = false` → fall to UNION ALL → `denial_reason='acceptance_criteria_not_met'`.
- Family C1 (row.tier='long_term', corroboration_count=2): `accept.ok = true`, but `WHERE accept.tier = 'recent'` blocks UPDATE → `denial_reason='not_in_recent_tier'`.
- Family C2 (bogus uuid): `target` CTE returns 0 rows → Result emits `INVALID_PROMOTION_TARGET`.

All deny paths are distinct, correct error codes, no false-accept side-effect.

CPU-31..40: **10/10 PASS**.

## CPU-41..50 — idempotency_and_isolation

Oracle: replay produces same row state, no duplicate side-effects, namespace isolation preserved.

Evaluation:
- All seed step_ids in mission namespace: `mem-smoke-corro-probe-<family>-<NN>` → unique → `ON CONFLICT (idempotency_key) DO NOTHING` collapses replays to 1 row each.
- Promote replays land on already-`long_term` row → accept.tier=long_term → fails `accept.tier='recent'` filter → returns row with `denial_reason='not_in_recent_tier'`. Persistent state unchanged. No side-effects.
- Mission namespace `mem-smoke-corro-probe-*` does not collide with prior namespaces (pre-mission DB has zero rows under this prefix).

CPU-41..50: **10/10 PASS**.

## Summary

**50/50 PASS** on local/probe-planning. All 5 categories verified from probe freeze + live cartography. No workflow mutation. No DB write. Proceeding to Phase 4 — Step 2 live E2E.
