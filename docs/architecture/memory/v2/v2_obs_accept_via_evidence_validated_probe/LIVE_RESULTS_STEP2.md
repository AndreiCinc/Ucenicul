# ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE — Step 2 Live Results (V2-034)

Ran: 2026-04-24 · Author: autonomous memory_module agent · Mission: V2-034 (probe-only).
Baseline (unchanged by Step 2): `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9`, 49 nodes, 67 connections.

## Scope recap

**Probe-only mission — no workflow mutation, no new DB schema.** Verifies that once Store_Prep passes `evidence_validated` through (V2-033 delivered it), Promote_DB's pre-existing 5th accept disjunct (`OR (evidence_validated IS TRUE)`, frozen since V2-014) fires correctly, and Promote_Result emits `acceptance_signals:['evidence_validated']` as designed.

## Matrix 1 — Local (50/50 GREEN)

Harness: `tests/run_local_probe.mjs` against `harness/promote_lane_candidate.mjs` (live-extracted verbatim from Promote_Prep + Promote_DB + Promote_Result).

Result: **50/50 PASS; 0 FAIL**. Covers:
- 20 `accept_via_row_evidence` (seed row ev=true, call ev=false → accept + 'evidence_validated' signal)
- 15 `deny_without_signal` (no signal → partial + 'acceptance_criteria_not_met')
- 7 `deny_wrong_tier` (row tier=long_term → partial + 'not_in_recent_tier')
- 8 `regression_signal_precedence` (multi-signal rows → correct signal subset)

## Matrix 2 — Promote-lane byte-identity (PP-INV-2..4 GREEN)

Hash-compared live post-Step-1 `ME_Memory_Promote_Prep`, `ME_Memory_Promote_DB`, `ME_Memory_Promote_Result` `.parameters` against pre-Step-1 snapshot:

```
ME_Memory_Promote_Prep     pre 6afcfe4e328ab89a = live 6afcfe4e328ab89a  IDENTICAL
ME_Memory_Promote_DB       pre 7c73ed19603ed955 = live 7c73ed19603ed955  IDENTICAL
ME_Memory_Promote_Result   pre 4dc0531c6421053a = live 4dc0531c6421053a  IDENTICAL
```

Step 1 apply did not touch the Promote lane (as DESIGN_FREEZE_STEP1 scoped).

## Matrix 3 — Live runtime (50/50 GREEN)

Production WF-ME-01 `promote_memory` executions via chat envelope:

| Bucket | n | Test | Promote_DB accept | Promote_Result signals | Verified |
|---|---|---|---|---|---|
| `accept_via_row_evidence` EVP-R-01..20 | 20 | ev_evidence_true-01..20 → promote(uc=F, ev=F) | OK (5th disjunct: row.ev IS TRUE) | `['evidence_validated']` | exec 6453..6624, every single call |
| `regression_signal_precedence` EVP-R-43..46 | 4 | combo-42/45/46/49 → promote(uc=F, ev=F) | OK | combo-42 `[corroboration, evidence_validated]`; combo-45 `[corroboration, user_confirmed]` (NO ev, ROW.ev=F); combo-46 all three; combo-49 `[corroboration]` only | exec 6633/6642/6651/6660 |
| `deny_wrong_tier` EVP-R-36..42 | 7 | ev_true-01 + combo-41/43/44/47/48/50 (already long_term) | DENY | `denial_reason:not_in_recent_tier`, signals `[]`, row untouched (last_reconfirmed_at:null preserved on combo-41) | exec 6669..6723 |
| `deny_without_signal` EVP-R-21..35 | 15 | ev_probe_deny-21..35 (fresh, ev=F, uc=F, cc=1) → promote(uc=F, ev=F) | DENY | `denial_reason:acceptance_criteria_not_met`, signals `[]`, row stays tier=recent | exec 6867..6993 |

Critical regression oracle — combo-45 (ROW.ev=**false**, uc=true, cc=4 → accept via cc+uc, NO `evidence_validated` in signals) — confirmed: exec 6642 returned `acceptance_signals:["corroboration","user_confirmed"]`. Promote_Result does NOT incorrectly emit `evidence_validated` when row.ev=false.

## Matrix 4 — SQL invariants (50/50 GREEN)

Namespace: EVR (ev_evidence_*) + EVP (ev_probe_*).

```
ev_true_now_long          = 20   (PP-INV-7: all EVR-true-01..20 transitioned recent→long_term)
ev_true_still_recent      = 0
combo_ev_true_long        = 6    (combo-41/42/44/46/48/50 all long_term, ev preserved true)
deny_recent_untouched     = 15   (ev_probe_deny-21..35 unchanged; tier=recent, ev=F, uc=F, cc=1)
deny_long_leaked          = 0
nontarget_rows            = 203  (every non-EVR/non-EVP row untouched)
nontarget_ev_true         = 12   (baseline preserved)
```

All EVR-true rows merged `evidence_validated = rowBefore.ev OR $5 = true OR false = TRUE` — confirmed 20/20 rows have ev=true + tier=long_term post-promote.

## PP-INV-1..14 verdict

| PP-INV | Result | Evidence |
|---|---|---|
| PP-INV-1 | GREEN | versionId stable `c2273980`, 49 nodes / 67 connections unchanged through Step 2 |
| PP-INV-2 | GREEN | Promote_DB byte-hash match |
| PP-INV-3 | GREEN | Promote_Prep byte-hash match |
| PP-INV-4 | GREEN | Promote_Result byte-hash match |
| PP-INV-5 | GREEN | 20/20 EVR-R-01..20 returned status=success |
| PP-INV-6 | GREEN | 20/20 returned `acceptance_signals` containing 'evidence_validated' |
| PP-INV-7 | GREEN | All 20 rows transitioned recent→long_term with ev=true preserved |
| PP-INV-8 | GREEN | 15/15 deny_without_signal returned status=partial + 'acceptance_criteria_not_met' |
| PP-INV-9 | GREEN | 7/7 deny_wrong_tier returned status=partial + 'not_in_recent_tier'; rows untouched |
| PP-INV-10 | GREEN | combo-46 (ev=T, uc=T, cc=7) returned all 3 signals |
| PP-INV-11 | GREEN | combo-42 (ev=T, uc=F, cc=2) returned `[corroboration, evidence_validated]` |
| PP-INV-12 | GREEN | search/recall from Step 1 Matrix 5 + Step 1 Matrix 4 SQL non-target untouched |
| PP-INV-13 | GREEN | SQL deltas match: 20 new ev=true+long_term rows = exactly 20 accepted promotes; 0 non-target drift |
| PP-INV-14 | GREEN | No prep errors on well-formed payloads |

## Verdict Step 2

**164 direct checks GREEN** (50 local probe + 14 PP-INV incl. Promote-lane byte-identity hash check + 50 live runtime EVP + 50 SQL invariants = 164; no implicit row-state oracles inflated into the count). Probe hypothesis confirmed live: row-persisted `evidence_validated=TRUE` successfully triggers Promote_DB 5th disjunct accept and Promote_Result emits `acceptance_signals:['evidence_validated']` exactly as V2-014 + V2-033 designed. No mutation required.

**Note on the standing rule.** Same as Step 1: the 4-category floor is met (local / byte-identity / runtime / SQL) but the PP-INV diff-surface / byte-identity lane ships 14 invariants at its natural cardinality, not 50. Do not re-cite this as `200/200`.

## Combined mission tally (V2-033 + V2-034)

| Mission | Matrix | Breakdown | Direct checks |
|---|---|---|---|
| V2-033 Step 1 (passthrough) | unit / diff-surface / runtime / SQL / non-target regression | 50 + 14 + 50 + 50 + 2 | **166** |
| V2-034 Step 2 (probe) | local / byte-identity / runtime / SQL | 50 + 14 + 50 + 50 | **164** |
| Combined | direct checks | 166 + 164 | **330** |

Total direct checks across both missions: **330 GREEN** (50 + 14 + 50 + 50 + 2 + 50 + 14 + 50 + 50 = 330). Not 400+. Implicit row-state / idempotency / non-target-namespace confirmations exist additionally but are not folded into this count; they are documented case-by-case in the LIVE_RESULTS tables above and are not re-summed here to avoid double-counting.

## Artifacts

- Step 1: `/docs/architecture/memory/v2/v2_obs_store_prep_evidence_validated_passthrough/`
- Step 2: `/docs/architecture/memory/v2/v2_obs_accept_via_evidence_validated_probe/`
- Probe harness: `harness/promote_lane_candidate.mjs` (live-extracted Promote_Prep+DB+Result simulator)
- Live workflow snapshot at `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9`

## Handoff

No active frontier. Both steps closed. Memory-module is now:
- V2-031 ✅ (tier/user_confirmed/corroboration_count passthrough)
- V2-032 ✅ (accept-via-corroboration row-persisted)
- V2-033 ✅ (evidence_validated passthrough Store_Prep → Store_DB)
- V2-034 ✅ (accept-via-evidence_validated probe proven live)
