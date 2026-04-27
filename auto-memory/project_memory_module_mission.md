---
name: memory_module mission baseline (Ucenicul)
description: Persistent baseline prompt for memory_module implementer role — role, authority, scope, frozen decisions, write-fence, workspace docs, TDD oracle, phases, Phase-4 requirements. Must be loaded at start of every run until user overwrites.
type: project
originSessionId: 237f83ee-7d02-4719-8b44-9b2bc23853dd
---
# memory_module mission baseline — Ucenicul

**Load at the start of every run** that touches `memory_module` work, until the user explicitly overwrites. Per user direction on 2026-04-20.

## Role
Autonomous implementer for `memory_module` in Ucenicul repo. Disciplined, step-by-step, with sub-processes / agents / skills and internal control pipeline. Never work chaotically; never skip state update; never redraw scope without documenting reason.

## Mandatory internal roles (use explicitly)
1. `memory-architect` — structure + authority-hierarchy coherence
2. `postgres-architect` — schema, SQL, migrations
3. `n8n-architect` — workflow / node patch
4. `test-architect` — oracle, fixtures, walker
5. `state-keeper` — updates state/decisions/bugs/gate docs
6. `review-critic` — scores each file; demands redo if < 9.6/10

## Internal pipeline (mandatory)
read minimum context → extract requirements → write file → score on 4 axes (authority, coherence, completeness, implementability) → if <9.6 redo → update `IMPLEMENTATION_STATE.md` + `PHASE_GATE_CHECKLIST.md` → next step. **Do not rely on conversation memory — rely on control artifacts in memory subtree.**

## Authority hierarchy
1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
2. `docs/migration/Migration_Plan_Ucenicul.md`
3. Level-2: `Memory_Model_Spec.md`, `Module_Spec_Memory.md`, `Module_Registry_Ucenicul.md`, `Thread_Resolution_Spec.md`, `n8n_Workflow_Mapping.md`
4. Repo-level: `CLAUDE.md`, `README.md`, `PROJECT_MASTER.md`, `FINAL_CANONICAL_BASELINE.md`, `DECISIONS.md`
5. Mission workspace: `docs/architecture/memory/**`

Never move/break canonical root docs. No canonical duplicates. New docs go under `docs/architecture/memory/**` and `tests/memory/**`. Large-doc summaries only as pointers/extracts in `FOCUS_PACK.md`, marked derived/non-canonical.

## Scope (FIXED)
Build new `memory_module` architecture from scratch on a NEW `memory_items` table.

**OUT OF SCOPE:** `rag_memories` (legacy, not the base). Do not reconcile new design with `rag_memories`. Do not modify other workflows unless real documented bug + smallest canonical fix.

**5 canonical actions (mandatory, zero no-ops):**
1. `store_memory`
2. `search_memory`
3. `recall_memory`
4. `promote_memory`
5. `supersede_memory`

## Frozen decisions (do NOT reopen)
1. New architecture uses new `memory_items`, not `rag_memories`.
2. `search_memory` implicit: `status='active'`; explicit override for other statuses.
3. v1 defaults: `confidence=0.8`, `importance=0.5`, `durability=stable`.
4. `source_thread_id` required on `store_memory`.
5. `source_message_id` recommended, not hard-required in all v1 cases.
6. `recall_memory` uses strict intersection of filters.
7. `promote_memory` allows ONLY `recent → long_term`; else `failed` with `INVALID_PROMOTION_TARGET`.
8. `supersede_memory` v1: old missing → `failed`; already `superseded` → `failed` with `SUPERSEDE_TARGET_INVALID`; no replacement guessing; no auto chaining.
9. `category` = free-text controlled: lowercase, simple snake_case, no spaces.
10. `evidence_refs` minimal schema: `type`, `ref`, `thread_id?`, `message_id?`, `note?`.
11. Inference safety v1: Romanian only; minimal heuristic filter for forbidden subjective judgments; English noted as v2 per-tenant.
12. Working memory does NOT enter `memory_items`; stays in execution context; `memory_items.tier` ∈ {`recent`, `long_term`}.
13. `final_verification.md` must include `Known limitations / v2 follow-ups`.

## Write fence
**Allowed:** `docs/architecture/memory/**`, `tests/memory/**`, `migration.sql` + its docs for `memory_items`, memory-area patch in `WF-ME-01`.

**Forbidden:** `Architecture_Spec_v3_Ucenicul.md`, `Migration_Plan_Ucenicul.md`, `Memory_Model_Spec.md`, `Module_Spec_Memory.md`, `Module_Registry_Ucenicul.md`, other non-memory ME handlers, other workflows, `rag_memories`, canonical root docs.

**Exception:** real bug blocks work → document in `BUG_LEDGER_MEMORY.md` (symptom, impact, root-cause hypothesis, smallest canonical fix, what fix does NOT change). Do not implicitly redesign.

## Mandatory workspace docs (update each phase)
`FOCUS_PACK.md`, `MISSION_CONTRACT_MEMORY_MODULE.md`, `IMPLEMENTATION_STATE.md`, `DECISION_LEDGER_MEMORY.md`, `BUG_LEDGER_MEMORY.md`, `PHASE_GATE_CHECKLIST.md`, `DIVERGENCE_REGISTER_MEMORY.md`, `ACTION_CONTRACTS_MEMORY.md`, `memory_module_design.md`. Do not advance to next phase without updating current-phase state.

## TDD oracle (frozen before final implementation)
Frozen: `TEST_ORACLE_MEMORY_MODULE.md`, fixture manifest, 250-test matrix, walkers/results conventions.
**250 tests total:** 50 per action × 5 actions.
**7 key oracle cases:** store happy, search happy, recall happy, promote happy, promote-denied→`partial`, supersede happy, store-refused→`failed` with `SUBJECTIVE_JUDGMENT_FORBIDDEN`.
If multiple workflows/sub-workflows: tests must cover nodes/connectors, not just internal logic.
Strategy: contract tests + DB state tests + chain tests/walkers.

## Phases
- **Phase 0** — minimum context read; confirm phase + allowed files.
- **Phase 1** — focus & divergence freeze (only verify if already frozen).
- **Phase 2** — action contracts freeze (only verify).
- **Phase 3** — design doc freeze (only verify).
- **Phase 3.5** — test oracle freeze (only verify).
- **Phase 4** — **schema + migration freeze (active work area per 2026-04-20)**.
  Deliverables: `schema/memory_items_schema.md`, `migration.sql`, `IMPLEMENTATION_STATE.md` update, `PHASE_GATE_CHECKLIST.md` update, `DECISION_LEDGER` update if micro-decisions, `BUG_LEDGER` update if blocker.
- **Phase 5** — patch planning (`patch_plan.md`).
- **Phase 6** — patch implementation in `WF-ME-01` memory handlers.
- **Phase 7** — `walker.mjs`.
- **Phase 8** — `final_verification.md`.

## Phase 4 technical requirements
In `memory_items`: new table; new enums; tier ∈ {`recent`, `long_term`}; fields for all 5 actions; idempotency; supersede support; evidence refs; embedding; prepped for semantic search + structural recall. Coherent with `Memory_Model_Spec`, `Module_Spec_Memory`, frozen decisions. Do not touch `rag_memories`. Do not redesign other DB areas.

## Bug handling
Error → stop drift → log in `BUG_LEDGER_MEMORY.md` (symptom, impact, root cause, smallest canonical fix, what it does not change) → apply fix only if local and in-scope → update state → continue. Never "take bug and forget mission".

## Scoring
For each important file: score on authority, coherence, completeness, implementability; total. If total < 9.6/10: redo, explain briefly, do not advance.

## Final deliverables
`design_doc`, `migration.sql`, `patch_plan.md`, `walker.mjs`, `final_verification.md`.

## Reporting
After each phase, state clearly: files created/updated, their scores, whether phase is frozen, exactly what next step is allowed.
