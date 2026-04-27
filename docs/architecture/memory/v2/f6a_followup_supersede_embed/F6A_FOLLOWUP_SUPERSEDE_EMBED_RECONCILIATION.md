# F6A-FOLLOWUP-SUPERSEDE-EMBED — Phase 8 Reconciliation

Run: 2026-04-24 (agent clock).
Inputs: `F6A_FOLLOWUP_SUPERSEDE_EMBED_LOCAL_RESULTS.md`, `F6A_FOLLOWUP_SUPERSEDE_EMBED_LIVE_RESULTS.md`, `F6A_FOLLOWUP_SUPERSEDE_EMBED_APPLY_EVIDENCE_20260424.md`, `F6A_FOLLOWUP_SUPERSEDE_EMBED_DESIGN_FREEZE.md`, `F6A_FOLLOWUP_SUPERSEDE_EMBED_TESTING_STRATEGY.md`, `harness/cartography.md`.

## 1. Design ↔ staged payload ↔ live workflow ↔ runtime parity

| Layer | Evidence | Match |
|---|---|---|
| Design freeze vs staged builder output | BUILD-INV-1..10 PASS; builder deterministic (rerun byte-identical at sha256 `7f2816af…589773b4`) | YES |
| Staged payload vs live workflow after apply | Live post-dump re-ran WD-1..WD-14 harness → 14/14 PASS; merge jsCode live sha256 `6272bec4…750f9b` matches staged builder output exactly | YES |
| Live workflow vs runtime behavior | 9/9 MU against live-derived pure candidate + 6/6 E2E + 8/8 DB invariants | YES |

## 2. Block-level parity (local vs live)

| Block | Local (Phase 4) | Live (Phase 7) | Parity |
|---|---|---|---|
| Design-shape invariants (DS-INV-1..14 == WD-1..14) | 14/14 (against staged post vs pre) | 14/14 (against **live** post vs pre) | **YES** |
| Merge purity + F6A symmetry | 9/9 (MU-1..MU-9 against staged candidate) | 9/9 (MU-1..MU-9 against live-extracted candidate) | **YES** |
| Integration-style (LI-1..LI-8) | 8/8 (mocked DB semantics) | proved by E1+E2+E4 on live DB (happy / idempotent / invalid target) + E3 (semantic eligibility) + DB-4 (old row preserved) + DB-5 (no duplicate) | **YES** |
| Happy supersede with embedding | LI-1 | E1 — replacement `a0eea3bb`, 1536-d | **YES** |
| Idempotency replay | LI-2 | E2 — rows_for_key=1 | **YES** |
| Semantic retrieval participation | LI-8 | E3 — replacement TOP-1 similarity 0.809 | **YES** |
| Invalid target regression | LI-5 | E4 — zero rows for invalid namespace | **YES** |
| Store-lane F6A regression | n/a (out of mission Prep) | E5 — F6A store still emits 1536-d | **YES** |
| Recall non-target regression | n/a | E6 — existing behavior preserved | **YES** |

**Local 31 + live 14 (E2E+DB) = 45 non-preflight oracles; +7 preflight (Phase 0) = 52/52 combined.**

Verdict: parity confirmed. No live anomaly contradicts any local-matrix PASS.

## 3. Diff-surface invariants runtime confirmation (DS-INV-1..14)

All 14 asserted by `run_workflow_diff_tests.mjs` against `pre` + **live post-dump** (not just the staged post). Every DS-INV GREEN.

Additional runtime confirmations beyond the 14 checks:

- Non-target byte-identity: confirmed by E5 store regression (same F6A store-lane output shape) + E6 recall regression (same error-then-empty behavior as pre-mission).
- Settings whitelist filtering by `n8n-patch.mjs replace`: WD-14 reads settings in the candidate JSON; the live dump settings also match (byte-identical). `.audit.jsonl` records the apply.

## 4. Observations classification

### OBS-RECALL-UX-PREEXISTING

**Finding.** `recall_memory` with just `memory_id` (no `filter`) returns `_error:true MISSING_REQUIRED_FIELDS missing_fields:["filter"]` from `ME_Memory_Recall_Prep`, yet `ME_Memory_Recall_Result` still emits `"summary":"Memory recall completed (1 rows)."` with `recall_results:[{}]`.

**Root cause.** `ME_Memory_Recall_Prep` contract requires a structural filter; the Result node uses a non-empty rows array but did not null-propagate the Prep `_error`. This is pre-existing (documented as deferred follow-up `V2-OBS-RECALL-SUMMARY-STRING` in `MEMORY_V2_STATE.md §Open items`).

**F6A-followup delta.** Zero. Recall lane is out-of-scope for this mission.

**Decision.** **Accept** as current behavior for this mission's closeout. Already tracked as `V2-OBS-RECALL-SUMMARY-STRING`.

### OBS-ENVELOPE-INIT (calibration note)

**Finding.** First attempt at E1 used `dispatcher_input.module_execution_started=true`, which `ME_Validate_Dispatcher_Result` explicitly rejects. Corrected within seconds; no state was written to DB.

**Root cause.** My own calibration error, not a workflow defect. The validator encodes the guard `module_execution_started !== false → INVALID_DISPATCH_INPUT`.

**F6A-followup delta.** Zero. Pre-existing guard behavior; no code path touched.

**Decision.** **Not a defect.** Resolved at time of discovery.

### No other observations

- No OBS-E5-equivalent issue surfaced on the supersede lane this run: because E4 (invalid target) terminates before the embed/merge leg even matters in a `_error:true`-like fashion — the supersede guard fails in the SQL (`marked` CTE returns zero rows) and UNION ALL fallback also finds zero, so no row lands. The only `_error` propagation path (MISSING_REQUIRED_FIELDS / SUBJECTIVE_JUDGMENT_FORBIDDEN / INVALID_CATEGORY out of `ME_Memory_Supersede_Prep`) would route the same way as F6A's OBS-E5 via `continueOnFail=true` + NULL×16 queryReplacement → this is by design (pre-existing pattern, accepted under F6A_RECONCILIATION §3 OBS-E5). Not re-raised here; would be the exact same accept.

## 5. SCOPE-OBS-1 (from F6A) — closure

F6A_RECONCILIATION.md §3 SCOPE-OBS-1 flagged "supersede-lane produces embedding-less rows" and logged it as follow-up `F6A-FOLLOWUP-SUPERSEDE-EMBED`. **This mission is that follow-up.** SCOPE-OBS-1 is now closed.

Live evidence of closure:
- E1 supersede replacement row `a0eea3bb`: `embedding IS NOT NULL`, dim 1536.
- DB-2/DB-3: generalized to any supersede row in the mission namespace.
- DB-4: old row preserved; supersede semantics unchanged.

## 6. Reconciliation verdict

- **Design vs staged payload:** byte-match (sha256 `7f2816af…`).
- **Staged payload vs live workflow after apply:** byte-match; merge jsCode sha256 `6272bec4…`.
- **Live workflow vs runtime behavior:** 52/52 oracles met (7 PF + 9 MU + 14 WD + 8 LI + 6 E + 8 DB).
- **Open items:** two classified observations (OBS-RECALL-UX-PREEXISTING — already tracked; OBS-ENVELOPE-INIT — calibration, not a defect). Zero new blockers.
- **SCOPE-OBS-1 from F6A:** CLOSED by this mission.

**Verdict: F6A-FOLLOWUP-SUPERSEDE-EMBED RECONCILED.** No blocker. Proceed to Phase 9 closeout + writeback.

## 7. Inputs into Phase 9

The following must be reflected in the writeback:

1. `MEMORY_V2_STATE.md` — F6A-FOLLOWUP-SUPERSEDE-EMBED moves `opened → CLOSED SUCCESS`; live versionId `c07fe923 → 13e8e767`; lineage extended; SCOPE-OBS-1 retired.
2. `MEMORY_V2_PHASE_GATES.md` — new gate section for F6A-FOLLOWUP (F6AF.0..F6AF.9).
3. `MEMORY_V2_CLOSEOUT.md` — append closeout section; update "current live" sentence.
4. `SESSION_HANDOFF_NEXT.md` — new snapshot: mission done; supersede-embed follow-up retired; V2-OBS-STORE-PREP-INPUT-PASSTHROUGH / V2-OBS-RECALL-SUMMARY-STRING still open non-blocking.
5. `CURRENT_TRUTH_POST_F5.md` — upgrade header to cover F5 + F6A + F6A-followup; remove `F6A-FOLLOWUP-SUPERSEDE-EMBED` from the "follow-ups pending" list; baseline versionId line updated.
6. `MEMORY_V2_DECISION_LEDGER.md` — new ledger entry **V2-030** (next free id after V2-029). Verify V2-030 is free before writing.
7. `auto-memory project_memory_module_post_f5_anchor.md` — update anchor to post-F6A-FOLLOWUP (lineage + versionId + retired SCOPE-OBS-1).
8. `F6A_FOLLOWUP_SUPERSEDE_EMBED_STATE.json` — status CLOSED, verdict SUCCESS, phases 6..9 GREEN.
