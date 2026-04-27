# Evidence-Validated Pack — Manifest & Read Status

Pack: `UCENICUL_NEXT_AUTONOMOUS_PACK_EVIDENCE_VALIDATED.zip`
Pack zip sha256: `f4fc73f03da07061377bf605adf278d8e307e865a9dded95e173ab0fc4bc6401` (verified vs operator checksum).
Per-file checksums: `PACK_FILE_SHA256SUMS.txt` — all 18 entries match (`sha256sum -c` clean).
Unpacked to: `/sessions/tender-amazing-franklin/evidence_validated_pack/`
Mission dirs:
- `docs/architecture/memory/v2/v2_obs_store_prep_evidence_validated_passthrough/` (Step 1)
- `docs/architecture/memory/v2/accept_via_evidence_validated_probe/` (Step 2)

## Authority priority

1. `OPERATOR_PROMPT_FOR_CLAUDE_EVIDENCE_VALIDATED.md`
2. `README.md`
3. `NEXT_STEP_SELECTION_RATIONALE.md`
4. `00_PROJECT_STANDING_RULE_50_TESTS.md`
5. `GRANULAR_PHASE_PLAN.md`
6. `TEST_PLAN.md`
7. `tests/**` fixtures
8. `EVIDENCE_TEMPLATE.md`, `CLOSEOUT_TEMPLATE.md`, `PACK_FILE_SHA256SUMS.txt`

## Files (19)

| # | Path | Status | Purpose |
|---|---|---|---|
| 1 | `OPERATOR_PROMPT_FOR_CLAUDE_EVIDENCE_VALIDATED.md` | READ, USED_FOR_CONTEXT + USED_FOR_IMPLEMENTATION | Operator directive: 2-step pack; Step 1 ext to V2-031 surface; Step 2 probe-only; 4×50=200/step, 400 combined; V2-028 canonical |
| 2 | `README.md` | READ, USED_FOR_CONTEXT | Pack overview + baseline reconciliation (`67cb8545` / 49 / 67 / active) |
| 3 | `NEXT_STEP_SELECTION_RATIONALE.md` | READ, USED_FOR_CONTEXT | Planner rationale: same bounded shape as V2-031; closes the last acceptance-signal passthrough |
| 4 | `00_PROJECT_STANDING_RULE_50_TESTS.md` | READ, USED_FOR_CONTEXT | Standing rule: 4 categories × 50 each per step (local/runtime/E2E/SQL) |
| 5 | `GRANULAR_PHASE_PLAN.md` | READ, USED_FOR_IMPLEMENTATION | Phase 0..12 task list maps to internal tasks #43..#54 |
| 6 | `TEST_PLAN.md` | READ, USED_FOR_TESTS | 400 oracle plan (200/step) |
| 7 | `EVIDENCE_TEMPLATE.md` | READ, SUPPORT_ONLY | Evidence skeleton |
| 8 | `CLOSEOUT_TEMPLATE.md` | READ, SUPPORT_ONLY | Final-report skeleton |
| 9 | `PACK_FILE_SHA256SUMS.txt` | READ, USED_FOR_CONTEXT | Per-file integrity sums (verified) |
| 10 | `tests/step1/unit_store_prep_evidence_validated_50.json` | READ, USED_FOR_TESTS | 50 EVU-01..EVU-50; categories: true_passthrough(15)+false_passthrough(10)+missing_default_false(10)+invalid_type_guard(8)+v2031_regression_combo(7) |
| 11 | `tests/step1/runtime_store_prep_evidence_validated_50.json` | READ, USED_FOR_TESTS | 50 runtime/smoke; runtime_true(20)+runtime_false(15)+runtime_default(5)+runtime_combo(10) |
| 12 | `tests/step1/e2e_store_prep_evidence_validated_50.json` | READ, USED_FOR_TESTS | 50 live E2E; persist_true_and_promote_ready(15)+persist_false_not_promote_by_ev(10)+combined_regression(10)+idempotency(7)+non_target_regression(8) |
| 13 | `tests/step1/sql_store_prep_evidence_validated_50.sql` | READ, USED_FOR_TESTS | 50 EVS-01..EVS-50 SELECT-only |
| 14 | `tests/step1/run_local_store_prep_evidence_validated_50.mjs` | READ, USED_FOR_TESTS | Harness template — adapt to live-extracted candidate |
| 15 | `tests/step2/local_evidence_validated_probe_50.json` | READ, USED_FOR_TESTS | 50 local probe; accept_via_row_evidence(20)+deny_without_signal(15)+deny_wrong_tier(7)+regression_signal_precedence(8) |
| 16 | `tests/step2/runtime_evidence_validated_probe_50.json` | READ, USED_FOR_TESTS | 50 runtime; probe_runtime_accept(20)+probe_runtime_deny(20)+probe_runtime_regression(10) |
| 17 | `tests/step2/e2e_evidence_validated_probe_50.json` | READ, USED_FOR_TESTS | 50 live E2E; accept(20)+deny_false(15)+deny_wrong_tier_or_invalid(10)+regression(5) |
| 18 | `tests/step2/sql_evidence_validated_probe_50.sql` | READ, USED_FOR_TESTS | 50 EVP-S-* SELECT-only |
| 19 | `tests/step2/run_local_evidence_validated_probe_50.mjs` | READ, USED_FOR_TESTS | Harness template |

## Unreadable files

None.

## Key contract facts extracted

- **Mission pair:** V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH (Step 1, structural patch) + ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE (Step 2, probe-only).
- **Step 1 expected diff surface:** `ME_Memory_Store_Prep.parameters.jsCode` + `ME_Memory_Store_DB.parameters.query` + `ME_Memory_Store_DB.parameters.options.queryReplacement`. 0 new nodes; 0 connection edits.
- **Step 1 acceptance:** 200/200 (50 unit + 50 runtime + 50 E2E + 50 SQL). Must regress V2-031 (tier/user_confirmed/corroboration_count) + F6A/F6A-FOLLOWUP embeddings.
- **Step 2 acceptance:** 200/200 (50 local probe + 50 runtime + 50 E2E + 50 SQL). Must produce live `acceptance_signals:['evidence_validated']` for accept family.
- **Combined:** 400/400 GREEN.
- **Apply channel:** strict V2-028 (Step 1 only). Step 2 mutates nothing.
- **Idempotency namespaces:** `ev-evidence-true-*`, `ev-evidence-false-*`, `ev-probe-accept-*`, `ev-probe-deny-*`.
