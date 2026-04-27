# F3.1 Testing Strategy (repo-local)

> Mirrors `04_F31_TESTING_STRATEGY.md` from the mission pack, adapted to F3.1-specific context (versionId, tenant, seed state, harness layout).

---

## 1. Goal

Run the full 150-case expansion in a way that is:

- context-safe for a long autonomous session (reduce one monolithic "run all 150 in one shot" pattern);
- cheap to rerun per case or per family slice;
- easy to debug at per-case granularity;
- resilient to partial failure (one family's red does not poison others);
- traceable at per-case and per-family level — every case id has exactly one terminal state.

## 2. Staged execution

### Stage A — Generation certainty

- Generator (`harness/f31_matrix_gen.mjs`) produces `matrix/f31_cases_150.json` from frozen constants.
- `f31_matrix_gen.mjs --check` validates: count per family = target, stable id uniqueness, oracle fields non-null, preconditions point at earlier-matrix cases or F3 baseline rows.
- Stage A gate: all 6 checks pass.

### Stage B — Family smoke

- 2 cases per family (8 cases total), selected so that each case represents a variant axis not yet exercised under the current versionId.
- Smoke cases: `f31-search-001`, `f31-search-026`, `f31-recall-001`, `f31-recall-026`, `f31-promote-001`, `f31-promote-013`, `f31-supersede-001`, `f31-supersede-013`.
- Stage B gate: all 8 smoke cases produce a complete raw artifact + oracle verdict; the harness wiring is proven end-to-end.

### Stage C — Full family runs

- Drive one family at a time; checkpoint after each.
- Rerun policy (from §4) dictates scope of any patch.
- Stage C gate: each family's per-case index contains 50 / 50 / 25 / 25 verdicts with PASS / FAIL / BLOCKED terminal states.

### Stage D — Global reconciliation

- `harness/f31_summarize.mjs` computes total pass/fail/block counts.
- `F31_AUDIT_REPORT.md` is written from the index.
- Orphan detection: every case id in the matrix has a matching verdict.

## 3. Failure buckets

Every failing case is tagged with exactly one of the four buckets:

1. `BAD_TEST_DEFINITION` — matrix variant, oracle predicate, or precondition wrong.
2. `BAD_HARNESS` — runner, oracle fn, summarizer, DB verification or parser wrong.
3. `RUNTIME_WORKFLOW_BUG` — `WF-ME-01` behavior inconsistent with contract.
4. `EXTERNAL_BLOCKER` — MCP/Postgres/infra/auth/dispatch blocker outside F3.1 control.

Bucket selection dictates the next action (see §5).

## 4. Rerun policy

| Change | Rerun scope |
|---|---|
| Individual case matrix edit | Only that case |
| Single-family oracle patch | That family's slice |
| Cross-family oracle patch | All 150 |
| Runner / DB verification logic patch | All 150 |
| Generator patch | All 150 + regenerate `f31_cases_150.json` |
| Summarizer patch | Re-summarize only (no re-execute) |

Every rerun writes a new `exec_*.raw.json` with a fresh UTC timestamp; prior artifacts are never deleted.

## 5. Next-action table

| Bucket | Action | Artifact |
|---|---|---|
| BAD_TEST_DEFINITION | Patch matrix / oracle; document in fix log | `F31_FIX_LOG.md` |
| BAD_HARNESS | Patch harness; document in fix log; wider rerun | `F31_FIX_LOG.md` |
| RUNTIME_WORKFLOW_BUG (F3.1-fixable) | Patch if harness-adjacent (rare — e.g. input shape); else dispatch | `F31_FIX_LOG.md` + if dispatch `F31_DISPATCH_LOG.md` |
| RUNTIME_WORKFLOW_BUG (requires node change) | Dispatch to F6 frontier; record as blocker category `WORKFLOW_RUNTIME_BUG` | `F31_BLOCKER_REGISTER.md` + `F31_DISPATCH_LOG.md` |
| EXTERNAL_BLOCKER | Classify category; dispatch with evidence; continue unaffected families | `F31_BLOCKER_REGISTER.md` + `F31_DISPATCH_LOG.md` |

## 6. Success target

Preferred verdict is `SUCCESS`. Route to green by:

- Fixing test-support gaps (matrix, oracle).
- Fixing harness issues (runner, summarizer).
- Fixing F3.1-local runtime bugs if harness-adjacent.
- Escalating truly external blockers via dispatch; continuing on unblocked families.

If the session ends before full execution, the acceptable non-SUCCESS verdicts are `PARTIAL_SUCCESS_WITH_EVIDENCE` (with explicit scope boundary and next-step) or `BLOCKED_WITH_EVIDENCE` (single external blocker — hard stop).

## 7. Context-preservation tactics

- One canonical matrix: `matrix/f31_cases_150.json`.
- One canonical fix log: `F31_FIX_LOG.md`.
- One canonical blocker register: `F31_BLOCKER_REGISTER.md`.
- One canonical dispatch log: `F31_DISPATCH_LOG.md`.
- Per-family summaries written as produced, not at end.
- Runtime evidence under `artifacts/runtime/` grouped by `exec_{case_id}_{timestamp}.raw.json` + `verdict_{case_id}.json`.
- `F31_CURRENT_STAGE.md` + `F31_STATE.json` updated on every phase transition.
- Never hold unwritten assumptions; externalize decisions.
