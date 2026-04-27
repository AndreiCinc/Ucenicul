# F3.1 Case Matrix

> Companion doc to `matrix/f31_cases_150.json`. Explains the *why* and *shape* of each family's 150-case slice so operators can understand the matrix without decoding the JSON.

---

## 0. Canonical fixture

- File: `matrix/f31_cases_150.json`
- Generator: `harness/f31_matrix_gen.mjs`
- Regenerate: `node docs/architecture/memory/v2/f3_1/harness/f31_matrix_gen.mjs`
- Check: `node docs/architecture/memory/v2/f3_1/harness/f31_matrix_gen.mjs --check`

Generation is deterministic. Counts per run are `{search: 50, recall: 50, promote: 25, supersede: 25, total: 150}`.

## 1. Family: `search_lexical_fallback` (50 cases)

### Cardinality

5 queries × 5 memory_type filters × 2 status_override modes = 50 cases.

### Axes

| Axis | Values |
|---|---|
| query | `q1 raspunde dimineata`, `q2 prefera whatsapp`, `q3 buget lunar`, `q4 obiectie pret`, `q5 Phase7 anchor` |
| memory_type filter | `fact`, `preference`, `observation`, `constraint`, `null` (omitted) |
| status_override | `defaultActive` (no statuses supplied — defaults to `['active']`), `includeSuperseded` (`['active','superseded']`) |

### Oracle per case

- `status = success` always.
- `used_embedding = false` — all rows in DB have `embedding IS NULL` (post-F5 state).
- `embedding_attempted = true`.
- `embedding_error = null` — F2b fix confirms producer is stable across distinct Romanian inputs.
- For `q1..q4`: `recall_count = 0` (no lexical match against the Romanian-free seed content).
- For `q5` (positive lexical probe): `recall_count >= 3` (matches rows containing "Phase7 anchor" substring). Exact count depends on status_override — `defaultActive` gives 5 rows, `includeSuperseded` gives 7 rows.
- DB invariant: zero mutation; `MAX(updated_at)` unchanged post-family.

### Notes

- Seed manifest's third `status_override` (`['superseded']` only) is dropped because:
  (a) it exercises no new branch beyond `includeSuperseded` for the zero-row queries `q1..q4`, and
  (b) for `q5` it is subsumed by `includeSuperseded` minus the active rows — which we can compute by differencing rather than calling again.
  Dropping it lands the count at exactly 50. Explicit justification required by the matrix-truncation rule.

## 2. Family: `recall_intersection` (50 cases)

### Cardinality

2 threads × 2 entities × 4 categories × 4 memory_types = 64 raw Cartesian. Deterministic truncation to the first 50 produces a cross-axis cover over thread × entity × category × memory_type.

### Axes

| Axis | Values |
|---|---|
| source_thread_id | `77777777-…-0007` (smoke thread), `33333333-…-0003` (phase7 anchor thread) |
| entity_id | `eeee…0001`, `eeee…0002` |
| category | `null`, `anchor_test`, `recall_test`, `smoke_store` |
| memory_type | `null`, `fact`, `preference`, `observation` |

### Oracle per case

- `status = success` always.
- `applied_filters` envelope passes through exactly the keys the input supplied; `null` inputs are not in `applied_filters`.
- Result ordering is `created_at DESC` (per recall SQL contract).
- Default `status='active'` filter is applied unless caller overrides.
- Row count matches DB snapshot filtered by the exact intersection of supplied keys (computed ahead of time in the oracle from a DB sidecar query — not hard-coded).

### Notes

- Categories chosen to span distinct baseline anchors (`anchor_test`, `recall_test`, `smoke_store`) plus `null` for "no filter".
- Memory types chosen to span the 4 most common enum values (`fact`, `preference`, `observation`) + `null`. `constraint` is deliberately dropped because the baseline has zero constraint rows — exercising it only produces trivial zero-row cases already covered by the `null`-heavy slice.

## 3. Family: `promote_denial_vocabulary` (25 cases)

### Cardinality

Seed Cartesian is 3 (corroboration_mode alone); F3.1 extends to 25 semantically-distinct observations.

### Axes (extended beyond seed)

| Axis | Values | Source |
|---|---|---|
| `corroboration_mode` | `none`, `one_only`, `two_plus`, `already_long_term` | seed + F3.1 extension (`two_plus`) |
| `caller_user_confirmed` (`cuc`) | `false`, `true` | F3.1 extension |
| `caller_evidence_validated` (`cev`) | `false`, `true` | F3.1 extension |
| `row_prior_user_confirmed` (`rpuc`) | `false`, `true` | F3.1 extension (V2-014 row-side OR) |
| `tier_precondition` | `recent`, `long_term` | F3.1 extension |
| `replay_second_call` | `false`, `true` | F3.1 extension |

### Block layout (25 cases)

- Block A — Denial branches: 10 cases.
- Block B — Accept-via-`user_confirmed`: 3 cases (caller / row / both).
- Block C — Accept-via-`evidence_validated`: 2 cases.
- Block D — Accept-via-`corroboration`: 3 cases.
- Block E — Accept-via-multi-signal: 3 cases.
- Block F — Replay after accept: 2 cases.
- Block G — Edge cases (empty evidence_refs, caller-flag-overrides-refs per V2-009): 2 cases.

### Oracle per case

- `denial_reason` matches spec value (`accepted` / `not_in_recent_tier` / `acceptance_criteria_not_met`).
- `acceptance_signals` matches spec list exactly (ordering-insensitive compare).
- On accept: `tier` transitions `recent → long_term`; `last_reconfirmed_at` set; only target row mutated.
- On deny: zero DB mutation.
- `artifacts` envelope shape matches F4/PF3-eb precedent.

### Seed dependencies

Each promote case has a matching seed case `f31-promote-{nnn}-seed` that runs `store_memory` with the block's `tier_precondition` and `rpuc`. The seed must be fully settled before the promote call.

## 4. Family: `supersede_idempotency` (25 cases)

### Cardinality

Seed Cartesian is 8 (category × memory_type × replay_mode); F3.1 extends to 25 semantically-distinct observations.

### Axes (extended beyond seed)

| Axis | Values | Source |
|---|---|---|
| `target_state` | `active`, `superseded`, `missing`, `cross_tenant` | F3.1 extension (seed only had `replay_mode`) |
| `tier` | `recent`, `long_term` | F3.1 extension |
| `idempotency_scope` | `fresh`, `reused_after_accept`, `reused_after_error` | F3.1 extension beyond seed's `replay_mode` |
| `category` | `smoke_store`, `pricing` | seed |
| `memory_type` | `fact`, `observation`, `preference`, `constraint` | seed + F3.1 extension (`preference`, `constraint`) |

### Block layout (25 cases)

- Block A — Happy path + replay (5 cases).
- Block B — Long-term replacement (3 cases — direct-to-long-term deferred from F3 batch).
- Block C — Already-superseded target (4 cases — SU3 parity + replay-after-error).
- Block D — Missing target (4 cases — SU4 parity).
- Block E — Cross-tenant (4 cases — deferred from F3 batch).
- Block F — Edge cases (5 cases — chain, multi-type, replay-on-fresh-context).

### Oracle per case

- On success: `idempotency_reused` and `new_insert` match block's expected values; DB has +1 row (or 0 if replay); old target flipped to `status='superseded'`.
- On failure: `error_code = 'SUPERSEDE_TARGET_INVALID'`; zero DB mutation.
- Cross-tenant oracle: UPDATE WHERE `tenant_id` scopes out ⇒ `SUPERSEDE_TARGET_INVALID` same as missing; this is the intended taxonomy collapse per §5 of the action contract.

### Seed dependencies

- Each `active` or `superseded` target has a matching seed case `f31-supersede-{nnn}-seed` (runs `store_memory` to create the anchor row).
- `missing` targets use the sentinel uuid `ffffffff-ffff-ffff-ffff-ffffffffffff`.
- `cross_tenant` targets need a row under a different tenant. For F3.1 the sentinel `__CROSS_TENANT_SENTINEL__` is resolved at runner time by the harness to an ad-hoc row created under `bbbbbbbb-0000-0000-0000-000000000001` via direct SQL insert (avoids invoking the workflow against a tenant that isn't the session tenant). This inverts the normal "workflow is the only writer" rule; explicit exception documented in `F31_HARNESS_DESIGN.md §4 Cross-tenant seeding`.

## 5. Verification summary

| Gate | Check | Result |
|---|---|---|
| Counts per family | 50/50/25/25 | PASS (see `f31_matrix_gen.mjs --check`) |
| Stable ids unique | 150 distinct case_ids | PASS |
| Oracle fields present | `expected_runtime_status` ∈ {success, partial, failure} for every case | PASS |
| Seed linkage | promote + supersede-active/superseded cases reference `f31-*-seed` ids | PASS (spec enumerated) |
| Cross-tenant exception | Documented in `F31_HARNESS_DESIGN.md §4` | PASS (see §4) |
