# F3.1 Execution Plan

> Subordinate to `F31_MISSION_BRIEF.md` §3 target outcomes and to `04_F31_TESTING_STRATEGY.md` pack doc (also re-expressed locally in `F31_TESTING_STRATEGY.md`).

---

## Phase map

F3.1 runs the seven phases defined in `03_F31_EXECUTION_RUNBOOK.md`, adapted to this repo's current state.

| Phase | Name | Gate | Artifacts |
|---|---|---|---|
| 0 | Truth anchor | Live versionId + DB baseline confirmed | entry in `F31_CURRENT_STAGE.md` |
| 1 | Inventory and gap audit | F3 first-batch reports + seed manifest read, sandbox quirks noted | `F31_CURRENT_STAGE.md` + `F31_BLOCKER_REGISTER.md` entry for walker.mjs read quirk if still open |
| 2 | Mission control docs | Brief, plan, strategy, stage, state written | this file + peers |
| 3 | Matrix generation | 150 cases with stable ids + oracle fields written to `matrix/f31_cases_150.json`; counts verified | `F31_CASE_MATRIX.md` + fixture JSON |
| 4 | Harness build | Runner + oracle + summarizer code written, local-only dry-run validated | `F31_HARNESS_DESIGN.md` + `harness/*.mjs` |
| 5 | Execution and evidence capture | Live MCP execution with DB verification; per-family summaries written incrementally | `artifacts/runtime/**` + per-family `F31_FAMILY_*_SUMMARY.md` |
| 6 | Bug handling | All F3.1-scope bugs fixed or dispatched; oracle adjustments justified in `F31_FIX_LOG.md` | `F31_FIX_LOG.md` + `F31_BLOCKER_REGISTER.md` + `F31_DISPATCH_LOG.md` |
| 7 | Closeout | Final verdict, counts, remaining blockers, exact next step | `F31_AUDIT_REPORT.md` + `F31_BUILD_REPORT.md` + `F31_FINAL_STATUS.md` + MEMORY_V2 pointer updates |

## Phase 0 — Truth anchor (done)

Confirmed at mission open time 2026-04-21:

- `workflow_entity` row for `uq26nh1grIpnHju0`: versionId `b8e2f194-0263-46d9-8306-1534cc7c31fe`, active `true`, 45 nodes, `updatedAt` `2026-04-21T12:52:49.680Z`.
- `memory_items` under tenant `aaaaaaaa-0000-0000-0000-000000000001`: 15 rows total (12 active / 3 superseded) across 13 categories; `MAX(updated_at) = 2026-04-21T12:54:40.918Z`.

No drift from `CURRENT_TRUTH_POST_F5.md`.

## Phase 1 — Inventory and gap audit (done)

Successfully read:

- `tests/fixtures/family_cases_seed.json` (2486 bytes) — authoritative F3.1 seed.
- `tests/scripts/generate_family_cases.mjs` — reference cartesian generator (not reused verbatim because seed variants for promote+supersede are insufficient for 25-count targets; see §Extension rules below).
- `tests/scripts/run_runtime_smoke.mjs` — template runner with `executeCase()` stub requiring MCP + DB wiring.
- `tests/scripts/summarize_results.mjs` — template markdown summarizer.
- All 4 F3 first-batch reports under `tests/results/family_batch_*_20260421.md`.

Sandbox quirk (documented in `F31_BLOCKER_REGISTER.md` as non-blocking):

- `tests/walkers/walker.mjs` (23007 bytes), `tests/results/walker_summary.md`, `tests/results/walker_latest.json` consistently return `ENOENT` to `Read`, `cat`, `head`, `cp`, and Python `open()` despite `os.stat` returning valid size + perms. Working interpretation: FUSE/mount ACL irregularity on files touched at a specific mtime window. Workaround: F3.1 sidecar is purpose-built from the seed manifest and F3 first-batch patterns; walker.mjs is not required.

## Phase 2 — Mission control docs (in progress)

Files to produce in this phase:

- `F31_MISSION_BRIEF.md` — done.
- `F31_EXECUTION_PLAN.md` — this file.
- `F31_CURRENT_STAGE.md` — cursor doc.
- `F31_STATE.json` — machine-readable stage pointer.
- `F31_TESTING_STRATEGY.md` — mirrors `04_F31_TESTING_STRATEGY.md` with F3.1-specific details.
- `F31_BLOCKER_REGISTER.md` — pre-seeded with walker read quirk.
- `F31_DISPATCH_LOG.md` — empty at open; populated on demand.
- `F31_FIX_LOG.md` — empty at open; populated on demand.

## Phase 3 — Matrix generation

### Extension rules (applied where seed variants are insufficient)

**`promote_denial_vocabulary`** — seed Cartesian is 3 combos (corroboration_mode × 1 × 1 × 1), target is 25. F3.1 extends with:

- `corroboration_mode` ∈ {`none`, `one_only`, `two_plus`, `already_long_term`} (adds `two_plus` to cover accept-via-corroboration).
- `caller_user_confirmed` ∈ {`false`, `true`} (covers V2-014 OR of caller+row).
- `caller_evidence_validated` ∈ {`false`, `true`} (covers PF3-eb shape).
- `row_prior_user_confirmed` ∈ {`false`, `true`} (covers V2-014 row OR branch).
- `tier_precondition` ∈ {`recent`, `long_term`} (covers `not_in_recent_tier` denial + replay shape).
- `replay_second_call` ∈ {`false`, `true`} (covers replay-same-step after accept — exec returns denial or no-op).

Targeted 25 cases = semantically distinct combinations of the axes above. Non-informative combos (e.g. both caller signals true AND corroboration two_plus — triple redundant) are intentionally omitted; see `F31_CASE_MATRIX.md` for the exact 25.

**`supersede_idempotency`** — seed Cartesian is 8 combos (category × memory_type × replay_mode), target is 25. F3.1 extends with:

- `target_state` ∈ {`active`, `superseded`, `missing`, `cross_tenant`} (covers SU3 + SU4 + cross-tenant deferred from F3 batch).
- `tier` ∈ {`recent`, `long_term`} (covers direct-to-long-term replacement deferred).
- `idempotency_scope` ∈ {`fresh`, `reused_after_accept`, `reused_after_error`} (replay semantics distinct from F3 SU2 which only covers accept-then-replay).

Targeted 25 cases = semantically distinct combinations of the axes above. See `F31_CASE_MATRIX.md`.

### Case id format

`f31-{family-short}-{ordinal:03d}` where family-short ∈ {`search`, `recall`, `promote`, `supersede`}. Example: `f31-search-001`, `f31-recall-027`, `f31-promote-013`, `f31-supersede-024`.

### Oracle fields on every case

Every case in `matrix/f31_cases_150.json` carries:

```json
{
  "case_id": "...",
  "family": "search_lexical_fallback | recall_intersection | promote_denial_vocabulary | supersede_idempotency",
  "action": "search_memory | recall_memory | promote_memory | supersede_memory | store_memory (seed-only)",
  "inputs": { ... action-specific ... },
  "preconditions": { "seed_cases": ["f31-..."], "tier": "...", "status": "..." },
  "expected_runtime_status": "success | partial | failure",
  "expected_result_envelope": { ... partial predicate, not verbatim ... },
  "expected_db_effect": { "mutates": true|false, "row_delta": {...} },
  "expected_error_code": null | "SUPERSEDE_TARGET_INVALID | ...",
  "notes": "why this case is distinct"
}
```

### Verification gates at end of phase 3

- JSON parses cleanly.
- Case count per family = target count.
- No duplicate `case_id`.
- Every case has a non-null `family` and `action`.
- Every case has `expected_runtime_status` ∈ the 3 allowed values.
- Promote and supersede cases reference valid `seed_cases` that are themselves listed earlier in the matrix OR reference pre-existing DB anchors from the F3 baseline.

## Phase 4 — Harness build

Harness layout under `docs/architecture/memory/v2/f3_1/harness/`:

```
F31_HARNESS_DESIGN.md        — design doc, one-shot read before editing code
f31_runner.mjs               — drives one case at a time (MCP + DB verify + artifact write)
f31_oracle.mjs               — oracle functions per family
f31_summarize.mjs            — folds artifacts/runtime/* into per-family + total summaries
f31_matrix_gen.mjs           — deterministic generator producing matrix/f31_cases_150.json from constants (stable ids)
```

Runner responsibilities:

1. Load `matrix/f31_cases_150.json`.
2. For one case: build MCP `execute_workflow` inputs per-action; print the payload; write the raw result + DB verification to `artifacts/runtime/exec_{case_id}_{timestamp}.raw.json`.
3. Apply oracle; write per-case verdict to `artifacts/runtime/verdict_{case_id}.json`.
4. Accumulate verdicts into `artifacts/runtime/family_{family}_index.json`.

MCP execution constraint: since MCP tools are in-session-only and cannot be called from Node, the runner's real-driver mode is a **manual drive** — the runner emits the exact payload and validates the response I paste back in. For F3.1 an offline drive mode is also provided: `--record` captures raw payload + response tuples from MCP calls made in this session into artifact files; the oracle + summarizer then run fully inside the Node process. See `F31_HARNESS_DESIGN.md` for the interaction model.

## Phase 5 — Execution

Stage A — generation certainty: run `f31_matrix_gen.mjs`; validate with `--check`.

Stage B — family smoke: first 2 cases per family (8 total) run end-to-end to prove harness wiring. This extends F3 first-batch coverage on the versionId `b8e2f194-…` rather than the earlier `fc43f6bc-…` / `f7f3e982-…` versions already exercised.

Stage C — full family runs: one family at a time, checkpointing after each batch. Each live MCP `execute_workflow` call produces a raw artifact; a post-execution `execute_sql` snapshot validates DB effect.

Stage D — global reconciliation: `f31_summarize.mjs` across all families; `F31_AUDIT_REPORT.md` written.

Execution budget awareness: each MCP round-trip consumes session context. Where Stage C's full 150-case drive exceeds the session's realistic capacity, the execution plan falls back cleanly: the harness + matrix + Stage B smoke constitute a reproducible next-session-can-continue surface, with the remainder scoped explicitly in `F31_FINAL_STATUS.md` as a deliberate PARTIAL split rather than an abandonment.

## Phase 6 — Bug handling

Every failure is bucketed per `04_F31_TESTING_STRATEGY.md` §Failure handling model:

1. Bad test definition → matrix or oracle patch; recorded in `F31_FIX_LOG.md`; limited rerun.
2. Bad harness → harness code patch; recorded in `F31_FIX_LOG.md`; wider rerun per rerun policy.
3. Runtime workflow bug → recorded in `F31_FIX_LOG.md` as OPEN if fixable in-session; `F31_DISPATCH_LOG.md` if it requires workflow modification (F6-territory); `F31_BLOCKER_REGISTER.md` entry referencing either.
4. External blocker → `F31_BLOCKER_REGISTER.md` + `F31_DISPATCH_LOG.md` with category.

## Phase 7 — Closeout

- Write `F31_AUDIT_REPORT.md` and `F31_BUILD_REPORT.md` from artifacts.
- Write `F31_FINAL_STATUS.md` with verdict + counts + unresolved + next step.
- Update `MEMORY_V2_PHASE_GATES.md` F3.1 row.
- Update `MEMORY_V2_STATE.md` post-F5 anchor block (if verdict is SUCCESS, mark F3.1 deferred→closed).
- Update `SESSION_HANDOFF_NEXT.md` with a one-paragraph F3.1 exit.

## Rerun policy (from strategy)

- Selective: failed case only.
- Family slice: when an oracle is patched.
- Full family: when harness plumbing is patched.
- All 4 families: when generator or summarizer is patched.

Each rerun produces a new artifact file with a fresh timestamp; prior artifacts are not deleted.
