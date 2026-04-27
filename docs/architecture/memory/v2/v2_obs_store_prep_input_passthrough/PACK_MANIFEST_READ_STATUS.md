# Two-Step Pack — Manifest & Read Status

Pack archive: `UCENICUL_TWO_STEP_AUTONOMOUS_PACK_STORE_PREP_AND_CORROBORATION.zip`
SHA256 verified: `a6ab294720a15f65dad2b83cffd42ade1bab58b987b2a2a2e0d9a4acb7bdd1f5` (matches published checksum).
Unpacked to: `/sessions/tender-amazing-franklin/two_step_pack/`
Mission dirs: `v2/v2_obs_store_prep_input_passthrough/`, `v2/accept_via_corroboration_probe/`
Inventory captured: 2026-04-24.

## Authority priority

1. `OPERATOR_PROMPT_FOR_CLAUDE_TWO_STEP.md`
2. `README.md`
3. `RUNBOOK_AUTONOMOUS_EXECUTION.md`
4. `00_PROJECT_STANDING_RULE_50_TESTS.md`
5. `01_STORE_PREP_INPUT_PASSTHROUGH/01_MISSION_BRIEF.md` + `02_DESIGN_FREEZE_EXPECTED.md`
6. `02_ACCEPT_VIA_CORROBORATION_PROBE/01_MISSION_BRIEF.md` + `02_PROBE_FREEZE_EXPECTED.md`
7. `tests/**` + `sql/**` (fixtures/oracles)
8. `COMBINED_CLOSEOUT_TEMPLATE.md`

## Files (15)

| # | Path (relative to pack root) | Status | Purpose |
|---|---|---|---|
| 1 | `OPERATOR_PROMPT_FOR_CLAUDE_TWO_STEP.md` | READ, USED_FOR_CONTEXT + USED_FOR_IMPLEMENTATION | Operator directive: open both missions sequentially under 50/50/50 rule, V2-028 canonical channel, autonomous execution |
| 2 | `README.md` | READ, USED_FOR_CONTEXT | Pack overview + baseline reconciliation |
| 3 | `RUNBOOK_AUTONOMOUS_EXECUTION.md` | READ, USED_FOR_IMPLEMENTATION | 5-phase runbook maps to internal tasks #25..#36 |
| 4 | `00_PROJECT_STANDING_RULE_50_TESTS.md` | READ, USED_FOR_CONTEXT | Minimum 50/50/50 tests rule (permanent) |
| 5 | `01_STORE_PREP_INPUT_PASSTHROUGH/01_MISSION_BRIEF.md` | READ, USED_FOR_IMPLEMENTATION | Step 1 brief: fix/validate Store_Prep input passthrough |
| 6 | `01_STORE_PREP_INPUT_PASSTHROUGH/02_DESIGN_FREEZE_EXPECTED.md` | READ, USED_FOR_IMPLEMENTATION | Step 1 design freeze template (10 DS-INV examples) |
| 7 | `01_STORE_PREP_INPUT_PASSTHROUGH/tests/local_store_prep_50.json` | READ, USED_FOR_TESTS | 50 local tests (SPU-01..SPU-50), 4 categories |
| 8 | `01_STORE_PREP_INPUT_PASSTHROUGH/tests/e2e_store_prep_50.json` | READ, USED_FOR_TESTS | 50 live E2E tests (SPE-01..SPE-50), 6 families |
| 9 | `01_STORE_PREP_INPUT_PASSTHROUGH/sql/store_prep_sql_invariants_50.sql` | READ, USED_FOR_TESTS | 50 SELECT-only invariants (SPI-01..SPI-50) |
| 10 | `02_ACCEPT_VIA_CORROBORATION_PROBE/01_MISSION_BRIEF.md` | READ, USED_FOR_IMPLEMENTATION | Step 2 brief: probe accept via corroboration |
| 11 | `02_ACCEPT_VIA_CORROBORATION_PROBE/02_PROBE_FREEZE_EXPECTED.md` | READ, USED_FOR_IMPLEMENTATION | Step 2 probe freeze template |
| 12 | `02_ACCEPT_VIA_CORROBORATION_PROBE/tests/local_corroboration_probe_50.json` | READ, USED_FOR_TESTS | 50 local probe-planning tests (CPU-01..CPU-50), 5 categories |
| 13 | `02_ACCEPT_VIA_CORROBORATION_PROBE/tests/e2e_corroboration_probe_50.json` | READ, USED_FOR_TESTS | 50 live E2E tests (CPE-01..CPE-50), 5 families |
| 14 | `02_ACCEPT_VIA_CORROBORATION_PROBE/sql/corroboration_sql_invariants_50.sql` | READ, USED_FOR_TESTS | 50 SELECT-only invariants (CPI-01..CPI-50) |
| 15 | `COMBINED_CLOSEOUT_TEMPLATE.md` | READ, SUPPORT_ONLY | Template used by Phase 5 combined closeout |

## Unreadable files

None.

## Mirrored tests into project

- `v2/v2_obs_store_prep_input_passthrough/tests/{local_store_prep_50.json,e2e_store_prep_50.json,store_prep_sql_invariants_50.sql}`
- `v2/accept_via_corroboration_probe/tests/{local_corroboration_probe_50.json,e2e_corroboration_probe_50.json,corroboration_sql_invariants_50.sql}`
