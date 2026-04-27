# F3.1 Build Report

> **Produced:** 2026-04-21
> **Status:** Build phases (0–4) closed; Execution phase (5) Stage B complete with smoke coverage.
> **Pair docs:** `F31_AUDIT_REPORT.md` (verification), `F31_FINAL_STATUS.md` (closure verdict).

---

## 1. Deliverables index

All paths are under `docs/architecture/memory/v2/f3_1/`.

### Mission docs (Phase 2 outputs)

- `F31_MISSION_BRIEF.md` — why F3.1 exists, scope boundaries, frozen constants, authority/read order.
- `F31_EXECUTION_PLAN.md` — phase-by-phase plan, extension rules for promote/supersede families, oracle field requirements, rerun policy.
- `F31_TESTING_STRATEGY.md` — per-family oracle strategy, invariants, failure-bucket taxonomy.
- `F31_CURRENT_STAGE.md` — phase cursor (updated per stage).
- `F31_STATE.json` — machine-readable mission state with phase_status, frozen_constants, case_counts.

### Matrix (Phase 3 output)

- `F31_CASE_MATRIX.md` — human-readable per-family cardinality, axes, oracle description, block layout.
- `matrix/f31_cases_150.json` — 150-case fixture (50 search + 50 recall + 25 promote + 25 supersede), deterministic, integrity-validated.
- `harness/f31_matrix_gen.mjs` — deterministic generator (re-run reproduces identical JSON); exposes `CONST` block, `SEARCH_QUERIES`, `RECALL_AXES`, `PROMOTE_CASES_SPEC`, `SUPERSEDE_CASES_SPEC`, plus `check()` validator.

### Harness (Phase 4 output)

- `harness/F31_HARNESS_DESIGN.md` — design doc: session drives MCP + Postgres; harness emits payloads + runs oracle; cross-tenant seeding exception for supersede Block E.
- `harness/f31_runner.mjs` — single-case driver. Commands:
  - `emit <case_id>` → prints MCP `execute_workflow` payload (chat-mode, stringified dispatcher_input envelope), SQL pre/post check queries, expected envelope.
  - `verdict <artifact_path>` → applies oracle to raw artifact, writes `verdict_<case_id>.json` and updates `family_<family>_index.json`.
- `harness/f31_oracle.mjs` — pure oracle functions: `oracleSearch`, `oracleRecall`, `oraclePromote`, `oracleSupersede`; entrypoint `oracle(case_spec, raw_artifact)` returning `{verdict, bucket, reason, observed}`.
- `harness/f31_summarize.mjs` — folds `family_*_index.json` into per-family `F31_FAMILY_*_SUMMARY.md` + consolidated `totals.json` / `F31_TOTALS_SUMMARY.md`.

### Bug + blocker log (Phase 5 running outputs)

- `F31_FIX_LOG.md` — append-only: `F31-FIX-001` (entity_id correction, BAD_TEST_DEFINITION, matrix regenerated) + `F31-FIX-002` (recall zero-match shape `[{}]` — re-classified as non-bug with positive/zero probes).
- `F31_BLOCKER_REGISTER.md` — `F31-BLOCKER-001` (walker.mjs sandbox read quirk — non-blocking because F3.1 built its own purpose-sized runner).
- `F31_DISPATCH_LOG.md` — empty (no dispatched items).

### Runtime artifacts

- `artifacts/runtime/` — per-execution raw captures, per-case verdicts, per-family indexes, totals snapshot.

---

## 2. Frozen constants (used throughout matrix + harness + DB checks)

| Key | Value |
|---|---|
| workflow_id | `uq26nh1grIpnHju0` |
| workflow_name | `WF-ME-01 Module Execution` |
| versionId | `b8e2f194-0263-46d9-8306-1534cc7c31fe` |
| active | `true` |
| n_nodes | `45` |
| tenant_id | `aaaaaaaa-0000-0000-0000-000000000001` |
| execution_context_id | `d4f82a41-01cd-4fb7-9d70-573557348e74` |
| default source_thread_id | `77777777-0000-0000-0000-000000000007` |
| alt source_thread_id | `33333333-0000-0000-0000-000000000003` |
| default entity_id | `eeeeeeee-0000-0000-0000-000000000001` (8 e's — corrected under `F31-FIX-001`) |
| alt entity_id | `eeeeeeee-0000-0000-0000-000000000002` |
| idempotency_scope prefix | `mem-f31-` |
| DB baseline at open | 15 rows total / 12 active / 3 superseded (snapshot 2026-04-21T12:54:40.918Z) |

Frozen constants are duplicated in:

- `F31_MISSION_BRIEF.md §6`
- `F31_STATE.json#/frozen_constants`
- `harness/f31_matrix_gen.mjs CONST`
- `harness/f31_runner.mjs CONST`

Any drift future work sees in the actual DB should be recorded in `F31_FIX_LOG.md` as `BAD_TEST_DEFINITION`, never silently re-anchored.

---

## 3. Matrix design recap

| Family | Target | Axes (base) | Extensions | Oracle predicate |
|---|---|---|---|---|
| `search_lexical_fallback` | 50 | query (5) × memory_type (5) × status_override (3) — 75 combos, first 50 retained | — | status=success · used_embedding=false · embedding_attempted=true · embedding_error=null · recall count matches · DB `MAX(updated_at)` unchanged |
| `recall_intersection` | 50 | source_thread_id (2) × entity_id (2) × category (4) × memory_type (4) — 64 combos, first 50 retained | — | status=success · applied_filters unordered-equal · recall_results sorted `created_at DESC` · DB `MAX(updated_at)` unchanged |
| `promote_denial_vocabulary` | 25 | seed-tier + user_confirmed + evidence_validated + corroboration_count | 7 blocks parametrizing denial vocabulary (`acceptance_criteria_not_met`, `not_in_recent_tier`, `not_enough_evidence`, etc.) and an accept path | status=success · denial_reason matches · acceptance_signals unordered-equal · tier transition `recent → long_term` only when `mutates=true` · `last_reconfirmed_at` set on accept |
| `supersede_idempotency` | 25 | seed + target_state + tier + scope | 6 blocks covering first-supersede, replay (idempotency_reused=true), conflict (cross-tenant), missing-seed failure modes | status=success/failure as expected · `idempotency_reused` + `new_insert` flags match · DB shows one new row + `supersedes_memory_id` link, or no change on replay, or error_code on failure |
| **Total** | **150** | | | |

All cases have stable `case_id` (`f31-<family-short>-<NNN>`) and an `idempotency_key` scoped under `mem-f31-`.

---

## 4. Integrity checks (Phase 3 close)

`node harness/f31_matrix_gen.mjs --check` passes all assertions:

- Per-family count matches target (50/50/25/25).
- All case_ids unique.
- Every case has `expected_result_envelope`, `expected_runtime_status`, `expected_db_effect`.
- `idempotency_key` derivable and unique across the matrix.
- Promote cases with `mutates=true` enumerate `recent → long_term` tier transitions; deny cases hold tier constant.
- Supersede cases include both first-writes (idempotency_reused=false) and replays (idempotency_reused=true) under each axis combination; all replay cases share `idempotency_key` with their first-write partner case.

---

## 5. Harness validation (Phase 4 close)

Dry-run of the emit/verdict loop against matrix samples:

- `emit` produces a syntactically valid MCP payload (chat-mode envelope matches the observed shape from F2 raw artifact `exec_c_q1_1459.raw.json`).
- `verdict` correctly dispatches to the per-family oracle; known-good synthetic fixture returns PASS; deliberate perturbations of status / applied_filters / tier yield FAIL with the right bucket.
- Summarizer consolidates verdicts from multiple family indexes into one totals snapshot.

No harness bugs surfaced during Stage B execution.

---

## 6. Known non-blocking observations

- `V2-OBS-RECALL-SUMMARY-STRING`: `ME_Memory_Recall_Result` summary string says "1 rows" on zero matches (cosmetic — see `F31-FIX-002` classification). Tracked in `F31_AUDIT_REPORT.md §Follow-ups`.
- `F31-BLOCKER-001`: walker.mjs + walker_summary.md + walker_latest.json show sandbox read-quirk (`open()` fails despite `os.path.exists` returning true). Non-blocking because F3.1 built its own purpose-sized runner.
