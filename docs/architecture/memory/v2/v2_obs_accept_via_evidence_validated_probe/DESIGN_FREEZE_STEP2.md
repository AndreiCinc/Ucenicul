# ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE — Design Freeze (Step 2)

Frozen: 2026-04-24.
Baseline (live): `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9`, 49 nodes, 67 connections, active=true.
**PROBE-ONLY mission** — no workflow mutation, no DB mutation. All Step 2 tests assert existing contract is intact and row.evidence_validated=TRUE triggers accept with `acceptance_signals:['evidence_validated']`.

## Q1. Live cartography — Promote lane

### `ME_Memory_Promote_Prep.parameters.jsCode` (frozen)

Extracts caller `memory_id`, `user_confirmed`, `evidence_validated`, `corroboration_threshold=2` (constant). Guards require `memory_id` and `promotion_target='long_term'`.

### `ME_Memory_Promote_DB.parameters.query` (frozen since V2-014)

5-way accept disjunct:
```sql
(corroboration_count >= $3::int)
OR ($4::boolean IS TRUE)                 -- caller user_confirmed
OR ($5::boolean IS TRUE)                 -- caller evidence_validated
OR (user_confirmed IS TRUE)              -- row-persisted (V2-031)
OR (evidence_validated IS TRUE)          -- ROW-PERSISTED (this probe's lane)
```
Promote occurs only when `accept.ok AND accept.tier='recent'`. UPDATE writes `tier='long_term'`, merges `user_confirmed OR $4`, `evidence_validated OR $5`.

### `ME_Memory_Promote_Result.parameters.jsCode` (frozen)

When `row.promoted === true`:
- if `corrCount >= corrThreshold` → push 'corroboration'
- if `db.user_confirmed === true || row.user_confirmed === true` → push 'user_confirmed'
- if `db.evidence_validated === true || row.evidence_validated === true` → push 'evidence_validated'  ← PROBE LANE

## Q2. Probe hypothesis

Given a seed row with `evidence_validated=TRUE` in `public.memory_items`, tier=`recent`, corroboration_count<2, user_confirmed=false, calling `promote_memory` with `user_confirmed:false, evidence_validated:false` → Promote_DB accepts via 5th disjunct (row.evidence_validated IS TRUE), Promote_Result returns `status:'success'`, `acceptance_signals:['evidence_validated']`, `tier:'long_term'`.

## Q3. Out of scope

- No write to Promote_DB SQL (unchanged).
- No write to Promote_Prep/Result jsCode (unchanged).
- No reopen of V2-014, V2-031, V2-032.
- No non-target regression in Store/Search/Recall/Supersede/RA lanes.

## Q4. PP-INV-1..14 (probe invariants)

| PP-INV | Assertion |
|---|---|
| PP-INV-1  | No workflow node changes between Step 1 apply and Step 2 probe (49 nodes / 67 connections, versionId stable). |
| PP-INV-2  | Promote_DB query string byte-identical vs Step 1 post-apply. |
| PP-INV-3  | Promote_Prep jsCode byte-identical. |
| PP-INV-4  | Promote_Result jsCode byte-identical. |
| PP-INV-5  | Row with `evidence_validated=TRUE`, tier=`recent`, cc<2, uc=false → Promote call (uc:false, ev:false) returns status=success. |
| PP-INV-6  | That call returns `acceptance_signals` that CONTAINS `'evidence_validated'`. |
| PP-INV-7  | Post-promote row has `tier='long_term'`, `evidence_validated=TRUE` (merge OR preserves row state). |
| PP-INV-8  | Row with all signals false (cc<2, uc=false, ev=false) → Promote call (uc:false, ev:false) returns status=partial, `denial_reason='acceptance_criteria_not_met'`. |
| PP-INV-9  | Row at `tier='long_term'` with ev=true → Promote call returns status=partial, `denial_reason='not_in_recent_tier'`. |
| PP-INV-10 | Row with both ev=true AND uc=true → acceptance_signals contains BOTH 'evidence_validated' AND 'user_confirmed'. |
| PP-INV-11 | Row with ev=true AND cc>=2 → acceptance_signals contains BOTH 'evidence_validated' AND 'corroboration'. |
| PP-INV-12 | Non-target lanes (Search/Recall/Supersede) unchanged; runtime regression 2/2 PASS as in Step 1 Matrix 5. |
| PP-INV-13 | DB invariant: rows with `evidence_validated=true AND tier='long_term'` increase by EXACTLY the number of accepted Step 2 promotes; non-target `memory_items` rows untouched. |
| PP-INV-14 | No new `_error` prep errors raised on well-formed payloads; error-path only via INVALID_PROMOTION_TARGET when memory_id absent. |

## Q5. Test plan (4×50 = 200)

| Pack file | Scope | Maps to PP-INV |
|---|---|---|
| `local_evidence_validated_probe_50.json` | EVP-L-01..50 (pure Promote_DB+Result simulator vs live-extracted candidate) | PP-INV-2..4 proof + PP-INV-5..11 semantics |
| `runtime_evidence_validated_probe_50.json` | EVP-R-01..50 live execute_workflow promote calls | PP-INV-5..11 live |
| `e2e_evidence_validated_probe_50.json` | EVP-E-01..50 persist + promote + readback + non-target regression | full PP-INV-1..14 live |
| `sql_evidence_validated_probe_50.sql` | EVP-S-01..50 SELECT-only DB invariants | PP-INV-7, 13, non-target untouched |

## Q6. Seed rows

Step 1 already persisted 26 rows with `evidence_validated=true` (20 `ev_evidence_true` + 6 `ev_evidence_combo-true`). The probe will target 20 of those (EVR-01..20, all tier=recent, cc=1, uc=false) as seed rows for the 20 `accept_via_row_evidence` local+runtime cases. Step 2 additionally creates:
- 15 fresh `ev_probe_deny` rows (ev=false, uc=false, cc=1) for `deny_without_signal`
- 7 fresh `ev_probe_long` rows (ev=true) promoted once to reach tier=long_term, then re-probed to deny_wrong_tier
- 8 fresh `ev_probe_combo` rows (ev=true AND uc=true; or ev=true AND cc=2) for `regression_signal_precedence`

## Q7. Rollback

Probe-only — no rollback needed. If probe fails, document failure in LIVE_RESULTS_STEP2 and raise to operator; no workflow revert required.
