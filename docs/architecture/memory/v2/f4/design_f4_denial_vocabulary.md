# design_f4_denial_vocabulary.md — F4 promote_memory denial vocabulary

Opened: 2026-04-21.
Closes: BUG-V2-03.

## Problem

`ME_Memory_Promote_DB` already emits a three-valued `denial_reason` column:

- `accepted` — `RETURNING m.*, TRUE AS promoted, 'accepted'::text AS denial_reason` on the successful UPDATE branch
- `not_in_recent_tier` — denial fallthrough when `target.tier <> 'recent'`
- `acceptance_criteria_not_met` — denial fallthrough when in `recent` tier but none of the acceptance signals hold

But `ME_Memory_Promote_Result` strips the acceptance value via `denial_reason: accepted ? null : row.denial_reason`, so callers cannot tell accepted-how from each other, and cannot read the authoritative DB value for accepted cases.

Furthermore, the SQL's accept predicate is `(corroboration_count >= threshold OR user_confirmed OR evidence_validated)`, so when accepted there are up to three orthogonal reasons — flattened to a single string `'accepted'` in the SQL. This loses signal.

## Authoritative taxonomy (F4.0)

### Denial reasons (when `promoted=false`)

| `denial_reason` | Meaning | Actionable next step for caller |
|---|---|---|
| `not_in_recent_tier` | Target memory is not in the `recent` tier. Nothing to promote. | Caller likely wants `recall_memory` to confirm what tier the row is in, or has a stale reference. No re-promote is possible without a tier reset (admin action). |
| `acceptance_criteria_not_met` | Target is in `recent` tier but `corroboration_count < threshold` AND `user_confirmed=false` AND `evidence_validated=false`. | Caller should supply one of: `user_confirmed=true` (explicit confirmation), `evidence_validated=true` (external evidence), or wait for corroboration to reach threshold (out-of-band events update the count). |

### Acceptance signals (when `promoted=true`)

A new list field `acceptance_signals` on `module_result.artifacts` (and mirrored in `details`) that enumerates which of the three OR'd predicates tipped the decision. Multiple can be present simultaneously; order is stable:

1. `corroboration` — `row.corroboration_count >= db.corroboration_threshold` (threshold is 2 in current Prep)
2. `user_confirmed` — caller supplied `inputs.user_confirmed === true`
3. `evidence_validated` — caller supplied `inputs.evidence_validated === true`

Note: the SQL's UPDATE stores `user_confirmed = (m.user_confirmed OR $4)` and `evidence_validated = (m.evidence_validated OR $5)`, so `row.user_confirmed` and `row.evidence_validated` on a just-promoted row reflect both caller input and prior history OR'd together. To attribute signal authorship to *this* call we read the Prep node's `__db.user_confirmed` / `__db.evidence_validated` (which are the caller inputs only). Pre-existing `row.user_confirmed=true` or `evidence_validated=true` was already an acceptance predicate before this call, so it should also be reported — we OR both sources.

### Rationale — why not extend SQL

SQL-side categorisation would require three `SELECT … UNION ALL` branches with CASE analysis, doubling the query surface. The Result node already has pure-function access to `row.*` + Prep `__db.*`, so the taxonomy fits cleanly as pure computation. No new data round-trip.

## Patch surface (F4.1)

**Single node**: `ME_Memory_Promote_Result.parameters.jsCode`.

No schema, no new nodes, no SQL mutation. Rollout is a `patch-node --params` merge exactly like Patch A.

## New jsCode (behavioural contract)

- Preserve error propagation from Prep unchanged.
- Preserve "Target memory not found" fallback unchanged.
- `details.denial_reason` = `row.denial_reason` **verbatim** for both accepted and denied cases (no more null-on-accept).
- On accepted: compute `acceptance_signals` from `row.corroboration_count`, `db.corroboration_threshold`, `db.user_confirmed || row.user_confirmed`, `db.evidence_validated || row.evidence_validated`.
- New `artifacts` entries:
  - `{ type: 'memory_id', value: row.id }` — unchanged
  - `{ type: 'denial_reason', value: row.denial_reason, promoted: accepted }` — authoritative DB signal
  - On accept only: `{ type: 'acceptance_signals', value: acceptance_signals }` — the signals that tipped the decision
- `details.acceptance_signals` mirrors the artifacts value when accepted (empty array when denied).
- `needs_followup` and `followup_requests` unchanged semantically; `followup_requests[0].reason` continues to use `row.denial_reason` for the denial cases.

## Safety properties

- **Read-only for denied probes**: SQL WHERE `accept.ok AND accept.tier='recent'` gates the UPDATE, so `not_in_recent_tier` and `acceptance_criteria_not_met` probes do not mutate.
- **Backward compatibility**: consumers that only look at `details.denial_reason` now get a string (never null) even on accept. Callers that null-checked will see 'accepted'. String comparison for denial values is unchanged.
- **No new failure mode**: the new fields are additive; on prep error the contract is unchanged.
- **Idempotency**: Promote SQL uses `WHERE m.id=… AND accept.tier='recent'` — replaying an already-promoted target falls through to `not_in_recent_tier`. No tier oscillation.

## Test plan

F4 smoke covers the taxonomy enumerated above:

| Case | Target | Inputs | Expected `denial_reason` | Expected `acceptance_signals` | DB effect |
|---|---|---|---|---|---|
| F4-t1 deny (not_in_recent_tier) | `7b03cd9c-…` (A5, tier=long_term) | `user_confirmed=false`, `evidence_validated=false` | `not_in_recent_tier` | (empty) | none |
| F4-t2 deny (acceptance_criteria_not_met) | `c7f148d9-…` (A1, tier=recent, corr=1) | `user_confirmed=false`, `evidence_validated=false` | `acceptance_criteria_not_met` | (empty) | none |
| F4-t3 accept (user_confirmed signal) | new row inserted as `mem-smoke-v2f4-accept:f4-t3` | `user_confirmed=true` | `accepted` | `['user_confirmed']` | tier recent→long_term on the inserted row |

F4-t3 requires a new row so no pre-existing fixture is mutated. The inserted row is scoped under `mem-smoke-v2f4-accept:` and persists as an F4 audit fixture, analogous to the F1 smoke_store / smoke_supersede rows.
