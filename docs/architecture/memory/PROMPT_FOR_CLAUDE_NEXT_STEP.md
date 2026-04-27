# PROMPT_FOR_CLAUDE_NEXT_STEP.md

You are continuing the `memory_module` mission inside the dedicated memory workspace.

## Mission mode

You MUST work phase-by-phase.
You MUST use explicit sub-processes / agent roles:
- memory-architect
- postgres-migrator
- n8n-patcher
- walker-tester
- document-auditor

You MUST use explicit skills / pipelines:
- PostgreSQL pipeline
- n8n patch pipeline
- documentation pipeline
- bug-handling pipeline
- verification pipeline

## First files to read

1. `docs/architecture/memory/FOCUS_PACK.md`
2. `docs/architecture/memory/MISSION_CONTRACT_MEMORY_MODULE.md`
3. `docs/architecture/memory/IMPLEMENTATION_STATE.md`
4. `docs/architecture/memory/BUG_LEDGER_MEMORY.md`
5. `docs/architecture/memory/TEST_ORACLE_MEMORY_MODULE.md`
6. `tests/memory/fixtures/fixture_manifest.json`
7. `tests/memory/walkers/README.md`

## Current phase

Current phase is:
- `3.5 — walker / oracle freeze`

This phase is already prepared.
Your next implementation phase is:
- `4 — schema + migration freeze`

## Non-negotiable TDD rule

Do NOT write final implementation first.
The oracle is already frozen.
Your schema, SQL, patch plan, and implementation must satisfy the oracle.

## Test volume frozen

- 50 tests per action
- 250 total tests
- all five canonical actions are in scope

## Multi-workflow rule

If you create more than one workflow or sub-workflow, you MUST also:
- create the connector nodes between them
- document them in `patch_plan.md`
- test them explicitly in the walker

A child workflow is not considered tested if the bridge nodes are absent or unverified.

## Required deliverables still to complete

1. `schema/memory_items_schema.md`
2. `migration.sql`
3. `patch_plan.md`
4. `tests/memory/walkers/walker.mjs`
5. `final_verification.md`

## Execution protocol

For each important file:
1. derive exact contract from mission + oracle
2. write the file
3. review it
4. score it internally
5. if score < 9.6/10, revise it before moving on
6. update `IMPLEMENTATION_STATE.md`

## Bug protocol

When a bug or conflict appears:
1. log it in `BUG_LEDGER_MEMORY.md`
2. classify it
3. apply the smallest canonical fix
4. update `IMPLEMENTATION_STATE.md`
5. only then continue

## Touch surface

Allowed:
- `docs/architecture/memory/**`
- `tests/memory/**`
- new migration for `memory_items`
- memory-only patch surface in `WF-ME-01`

Do not touch other workflow surfaces unless there is a real bug and you document it first.

## Immediate task

Proceed now with **Phase 4 — schema + migration freeze** using the frozen oracle.
When Phase 4 is complete, update:
- `IMPLEMENTATION_STATE.md`
- `PHASE_GATE_CHECKLIST.md`
- `DECISION_LEDGER_MEMORY.md` if you made any new design decision

