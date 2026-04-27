# F3.1 Mission Brief

> **Status:** OPEN. Autonomous mission in progress.
> **Opened:** 2026-04-21 by repo owner (senior-engineer autonomy instruction).
> **Frontier:** `memory_module v2` F3.1 — walker / sidecar harness full combinatorial expansion.
> **Authority position:** subordinate to `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` for live-state constants and to `docs/architecture/Architecture_Spec_v3_Ucenicul.md` for module contracts.

---

## 1. Why F3.1 exists

F3 first-batch (2026-04-21) ran 17 oracle runs across 4 family batches — `search_lexical_fallback` (6), `recall_intersection` (6), `supersede_idempotency` (4), `promote_denial_vocabulary` (1+1 seed). Each batch explicitly deferred the full combinatorial surface to F3.1:

- `family_batch_search_f2b_20260421.md` §Known-next-steps: "Full 50-case search_lexical_fallback run needs F3.1 walker or sidecar runner."
- `family_batch_recall_20260421.md` §Known-next-steps: "Full 50-case run requires F3.1 walker/sidecar runner."
- `family_batch_promote_20260421.md` §Known-next-steps: "accept-via-corroboration … Deferred to F3.1 walker for batched execution."
- `family_batch_supersede_20260421.md` §Known-next-steps: "Full 25-case combinatorial expansion … requires F3.1 walker/sidecar."

F3.1 closes those four explicit deferrals in one mission.

## 2. Target surface

Full combinatorial expansion enumerated in `family_cases_seed.json`:

| Family | Target count | Variant axes |
|---|---|---|
| `search_lexical_fallback` | 50 | query (5) × memory_type (5) × status_override (3) |
| `recall_intersection` | 50 | thread_id (2) × entity_id (2) × category (4) × memory_type (4) |
| `promote_denial_vocabulary` | 25 | promotion_target (1) × user_confirmed (1) × evidence_validated (1) × corroboration_mode (3), expanded with evidence_seed + tier state + corroboration_count axes to reach 25 |
| `supersede_idempotency` | 25 | category (2) × memory_type (2) × replay_mode (2), expanded with target_status + tier + idempotency_scope axes to reach 25 |
| **Total** | **150** | |

Where the seed manifest's raw Cartesian is smaller than the target count (promote: 3 combos; supersede: 8 combos), F3.1 extends the variant axes as documented in `F31_CASE_MATRIX.md` so every counted case is a semantically distinct observation, not a replay of the same branch.

## 3. Target outcomes

F3.1 is DONE only if:

1. The 150-case matrix exists explicitly as a committed fixture with stable case ids and oracle metadata.
2. A sidecar harness exists that can drive the matrix end-to-end against live `WF-ME-01` (versionId `b8e2f194-…`) via MCP `execute_workflow` + `get_execution` + Postgres verification.
3. Every case has one terminal state in `{PASS, FAIL, BLOCKED}` recorded in `artifacts/runtime/` plus a per-family summary.
4. Bugs surfaced inside the F3.1 scope are fixed or dispatched with evidence.
5. A final status doc gives the exact next step for the next session — no reconstruction required.

Final verdict is one of:

- `SUCCESS` — all 150 cases have a recorded terminal state and no open F3.1-scoped runtime bug.
- `PARTIAL_SUCCESS_WITH_EVIDENCE` — partial execution with a clear scope boundary explaining what ran, what didn't, and why the remainder is deliberately deferred rather than abandoned.
- `BLOCKED_WITH_EVIDENCE` — all remaining work depends on a single external blocker documented in `F31_DISPATCH_LOG.md`.

Vague stops are forbidden.

## 4. Scope boundaries

### In scope

- Matrix generation for the 4 named families.
- Sidecar harness (generator + runner + oracle + summarizer).
- Live execution against `WF-ME-01` at versionId `b8e2f194-0263-46d9-8306-1534cc7c31fe`.
- DB verification under tenant `aaaaaaaa-0000-0000-0000-000000000001` using `execution_context_id = d4f82a41-01cd-4fb7-9d70-573557348e74` and `source_thread_id = 77777777-0000-0000-0000-000000000007` unless a case explicitly varies those axes.
- Fixing F3.1-scoped runtime or harness bugs.
- Documenting blockers and dispatching them per `05_F31_BLOCKER_AND_DISPATCH_PROTOCOL.md`.

### Out of scope

- Workflow modification of `WF-ME-01` nodes. Any needed workflow change must go through F6 (not opened) — F3.1 may surface such a need as a blocker, must not act on it.
- New families beyond the four named above.
- MCP patch_workflow_nodes (blocked by sub-B — documented in `MEMORY_V2_BLOCKERS.md`).
- Rollout-channel work (V2-025 post-F5 operator-run CLI stands; F3.1 does not alter it).
- Performance / load testing. F3.1 is a correctness surface, not a throughput surface.

## 5. Authority and read order

Anyone picking this up must read in the following order before touching the harness or DB:

1. `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` — live constants.
2. `docs/architecture/memory/v2/stabilization/AUTHORITY_AND_READ_ORDER.md` — hierarchy.
3. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` — system spec.
4. `docs/architecture/memory/ACTION_CONTRACTS_MEMORY.md` — action contracts for the 5 actions.
5. `docs/architecture/memory/tests/fixtures/family_cases_seed.json` — seed manifest.
6. The 4 F3 family batch reports under `docs/architecture/memory/tests/results/family_batch_*_20260421.md` — baseline oracles already proven.
7. This file, then `F31_EXECUTION_PLAN.md` and `F31_TESTING_STRATEGY.md`.

## 6. Frozen constants for the duration of this mission

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
| default entity_id | `eeeeeeee-0000-0000-0000-000000000001` (8 e's — corrected in F31-FIX-001) |
| idempotency_scope prefix | `mem-f31-` |
| DB baseline | 15 rows total / 12 active / 3 superseded (snapshot 2026-04-21T12:54:40.918Z) |

If any of these drift during execution, record the drift in `F31_FIX_LOG.md` or `F31_BLOCKER_REGISTER.md` rather than silently re-anchoring.

## 7. Discipline reminders (from the mission pack)

- **Blockers don't stop the mission.** A blocker is classified → evidenced → logged → routed → isolated; then execution resumes on what remains executable.
- **Never hold unwritten assumptions.** Externalize every non-obvious decision into one of the F3.1 docs below.
- **One canonical matrix, one canonical fix log, one canonical blocker register.** No scattered chat-only notes.
- **Checkpoint after each family.** Write per-family summaries as they are produced, not at the end.
- **Terminal state per case.** Every one of the 150 case ids must end up in exactly one of PASS / FAIL / BLOCKED.

## 8. Deliverables index

Produced or updated under `docs/architecture/memory/v2/f3_1/`:

- `F31_MISSION_BRIEF.md` (this file)
- `F31_EXECUTION_PLAN.md`
- `F31_CURRENT_STAGE.md`
- `F31_STATE.json`
- `F31_TESTING_STRATEGY.md`
- `F31_CASE_MATRIX.md` + `matrix/f31_cases_150.json`
- `harness/F31_HARNESS_DESIGN.md` + `harness/f31_runner.mjs` + `harness/f31_oracle.mjs` + `harness/f31_summarize.mjs`
- `F31_BUILD_REPORT.md`
- `F31_AUDIT_REPORT.md`
- `F31_FIX_LOG.md`
- `F31_BLOCKER_REGISTER.md`
- `F31_DISPATCH_LOG.md`
- `F31_FINAL_STATUS.md`
- `artifacts/runtime/**` — per-execution raw captures and per-family summaries.
