# F3.1 Final Status

> **Closed:** 2026-04-22T14:30Z (Stage C closure under 2026-04-22 operator reopening directive).
> **Verdict:** `SUCCESS`
> **Prior verdict superseded:** `PARTIAL_SUCCESS_WITH_EVIDENCE` (2026-04-21 — 3/150 executed at that point). This document now reflects the Stage C completion.
> **Authority:** subordinate to `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md`.
> **Pair docs:** `F31_STATE.json`, `F31_CURRENT_STAGE.md`, `F31_BUILD_REPORT.md`, `F31_AUDIT_REPORT.md`, `F31_MISSION_BRIEF.md`, `F31_FIX_LOG.md`, `F31_FAMILY_*_SUMMARY.md`.

---

## 1. Verdict and why this shape

**`SUCCESS`** — all 150 F3.1 matrix cases executed via live `WF-ME-01` (versionId `b8e2f194-0263-46d9-8306-1534cc7c31fe`, 45 nodes, active). 149 PASS. The single FAIL (`f31-promote-012`) is bucketed `BAD_TEST_DEFINITION` because it probes V2-014 (row-persisted `user_confirmed` OR caller acceptance), which is explicitly deferred per `docs/architecture/memory/patch_plan.md §5.3`. Runtime is correct under the shipped acceptance CTE; the case will re-PASS once V2-014 ships.

The F3.1 mission brief §3 defined `SUCCESS` as "all 150 matrix cases executed against live WF-ME-01; 0 RUNTIME_WORKFLOW_BUG remain unresolved at closure; any remaining FAILs are fully classified (`BAD_TEST_DEFINITION` / `BAD_HARNESS` / `EXTERNAL_BLOCKER`) and entered into the deferred-followups list." Stage C closure meets this bar: **0 RUNTIME_WORKFLOW_BUG** at closure.

---

## 2. Score card

| Axis | Result |
|---|---|
| 150-case matrix committed | ✓ (`matrix/f31_cases_150.json`, 50/50/25/25) |
| Matrix integrity validated | ✓ (all generator invariants pass; q5 query patched in `F31-FIX-011`) |
| Sidecar harness committed | ✓ (`harness/f31_runner.mjs` + `f31_oracle.mjs` + `f31_extract_from_exec.mjs` + `f31_summarize.mjs` + `f31_seed_resolve.mjs` + `f31_unflatten.mjs`) |
| Harness proven live | ✓ (all 150 cases executed against WF-ME-01) |
| Frozen constants match live state | ✓ (post-`F31-FIX-001` entity_id correction) |
| Bugs handled | ✓ (11 classification+fix entries in `F31_FIX_LOG.md`, F31-FIX-001..F31-FIX-011) |
| Blockers isolated | ✓ (`F31-BLOCKER-001` non-blocking; no external dispatches needed) |
| Full execution of 150 cases | ✓ (149 PASS + 1 BAD_TEST_DEFINITION FAIL) |
| Per-family summary files | ✓ (per-family indexes + markdown summaries written for all 4 families) |
| Runtime workflow bugs remaining | **0** |

### Final Stage C tally

| Family | Target | Executed | PASS | FAIL | BLOCKED | Fail bucket |
|---|---:|---:|---:|---:|---:|---|
| `search_lexical_fallback` | 50 | 50 | 50 | 0 | 0 | — |
| `recall_intersection` | 50 | 50 | 50 | 0 | 0 | — |
| `promote_denial_vocabulary` | 25 | 25 | 24 | 1 | 0 | 1 × BAD_TEST_DEFINITION (V2-014 deferred) |
| `supersede_idempotency` | 25 | 25 | 25 | 0 | 0 | — |
| **Total** | **150** | **150** | **149** | **1** | **0** | **0 × RUNTIME_WORKFLOW_BUG** |

---

## 3. Applied fixes

| Fix ID | Kind | Summary |
|---|---|---|
| F31-FIX-001 | BAD_TEST_DEFINITION | `entity_id` constant wrong in matrix generator (4-e's → 8-e's) |
| F31-FIX-002 | — (non-bug) | Recall DB zero-match `[{}]` shape is placeholder, not a bug |
| F31-FIX-003 | BAD_HARNESS | Delegated recall-lane subagent wrong payload + hallucinated verdicts — reworked |
| F31-FIX-004 | BAD_HARNESS | Store-seed missing `source_thread_id` |
| F31-FIX-005 | Out-of-scope observation | Store Prep hardcodes tier/user_confirmed/corroboration_count (follow-up) |
| F31-FIX-006 | BAD_HARNESS | Promote probe missing `promotion_target` input |
| F31-FIX-007 | BAD_HARNESS | `oraclePromote` conflated n8n exec status with module_result.status |
| F31-FIX-008 | BAD_TEST_DEFINITION | Promote case 012 tests DEFERRED V2-014 — oracle reclassified |
| F31-FIX-009 | BAD_HARNESS | Supersede `flattenSupersedeInputs` shape (`memory_id` → `supersedes_memory_id` + `source_thread_id`) |
| F31-FIX-010 | Out-of-scope observation | Supersede n8n-level aggregation error post module success (RA aggregation-lane follow-up) |
| F31-FIX-011 | BAD_TEST_DEFINITION | q5 matrix query targeted non-existent Romanian corpus ("memorie antica" → "Phase7 anchor") |

All 11 fixes are logged with detail, rerun scope, and rerun verdict in `F31_FIX_LOG.md`.

---

## 4. Deferred follow-ups (out of F3.1 scope)

| Follow-up | Owner | Effect on F3.1 re-run |
|---|---|---|
| V2-014 — row-persisted `user_confirmed` OR caller acceptance | memory-module promote SQL | Promote case 012 flips from FAIL (BAD_TEST_DEFINITION) → PASS |
| V2-OBS-STORE-PREP-INPUT-PASSTHROUGH | store-lane | F3.1 seed preconditions currently materialized via post-insert UPDATE; no rerun impact |
| V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE | RA / aggregation lane | N8n-level status on supersede happy-path flips from `failed` → `success`; module-level contract already correct |
| V2-OBS-RECALL-SUMMARY-STRING | cosmetic | No F3.1 impact |

---

## 5. Next step

F3.1 is closed. The next body of work is outside F3.1 scope — either V2-014 implementation, RA aggregation-stage gate fix, or a fresh mission under the live workflow. The `F31_STATE.json` closure anchor + `F31_CURRENT_STAGE.md` cursor together serve as the authoritative hand-off into the next mission. No reconstruction is needed.

---

## 6. Truth anchor diff

Nothing changed in the stabilization authority docs. `CURRENT_TRUTH_POST_F5.md` constants remain valid. F3.1 added documentation under `docs/architecture/memory/v2/f3_1/**`, runtime artifacts under `docs/architecture/memory/v2/f3_1/artifacts/runtime/**`, and harness scripts under `docs/architecture/memory/v2/f3_1/harness/**`.

No workflow edits were performed (F3.1 scope boundary #3). No schema migrations were run. No rollout-channel changes were made (V2-025 CLI stands). DB effect was confined to per-case memory_items writes under tenant `aaaaaaaa-…0001` (promote tier transitions + supersede row insert/supersede chain) — each tied to an idempotency_key under the `mem-f31-` prefix for traceability.

---

## 7. Pointer update (for MEMORY_V2 index)

The pointer line in `docs/architecture/memory/v2/MEMORY_V2_STATE.md` should read (replacing the prior PARTIAL_SUCCESS_WITH_EVIDENCE line):

- `docs/architecture/memory/v2/f3_1/F31_STATE.json` — F3.1 walker/sidecar mission **closed SUCCESS on 2026-04-22T14:30Z**: all 150 cases executed against live WF-ME-01 (versionId `b8e2f194`); 149 PASS, 1 FAIL classified BAD_TEST_DEFINITION (V2-014 deferred); 0 RUNTIME_WORKFLOW_BUG remain. 11 fixes in `F31_FIX_LOG.md`; 4 deferred follow-ups handed off.
