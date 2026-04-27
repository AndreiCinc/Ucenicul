# CLAUDE.md — Memory Sub-scope

This subtree is the operational workspace for `memory_module`.

## Purpose

Use this subtree when the task is specifically about:

- `memory_module`
- `memory_items`
- memory handlers inside `WF-ME-01`
- memory-specific tests, walkers, fixtures, and verification
- memory-specific design, ADRs, and divergence tracking

## Authority hierarchy for this subtree

1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
2. `docs/migration/Migration_Plan_Ucenicul.md`
3. `docs/architecture/Memory_Model_Spec.md`
4. `docs/architecture/Module_Spec_Memory.md`
5. `docs/architecture/Module_Registry_Ucenicul.md`
6. `docs/architecture/memory/FOCUS_PACK.md`
7. `docs/architecture/memory/MISSION_CONTRACT_MEMORY_MODULE.md`
8. This file

## Mandatory first-read order

1. `FOCUS_PACK.md`
2. `MISSION_CONTRACT_MEMORY_MODULE.md`
3. `IMPLEMENTATION_STATE.md`
4. `DECISION_LEDGER_MEMORY.md`
5. `BUG_LEDGER_MEMORY.md`
6. `PHASE_GATE_CHECKLIST.md`

Only then load deeper files.

## Write fence

Allowed writes:

- `docs/architecture/memory/**`
- `tests/memory/**`
- `migration.sql` for the new `memory_items` architecture
- memory-specific ME handler documentation and patch planning
- memory-specific walker / fixtures / results

Allowed workflow touch surface:

- only the `WF-ME-01` memory path
- only memory handlers and memory-routing artifacts
- no task/reminder/improvement/watcher modifications

Forbidden writes unless escalated and logged:

- `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
- `docs/migration/Migration_Plan_Ucenicul.md`
- other canonical global specs
- `rag_memories` design resurrection or adaptation
- non-memory `WF-ME-01` handlers
- any workflow other than `WF-ME-01`

## Required operating mode

You MUST work through explicit sub-processes:

1. `memory-architect`
2. `postgres-migrator`
3. `n8n-patcher`
4. `walker-tester`
5. `document-auditor`

Do not free-form improvise across all concerns at once.

## Required skills / pipelines

You MUST use explicit skills and mini-pipelines:

- PostgreSQL reasoning pipeline for schema, enums, indexes, constraints, idempotency
- n8n patch pipeline for node-level changes, markers, rollback, verification
- documentation pipeline for mission contract -> design -> implementation -> verification
- bug pipeline for symptom -> root cause -> smallest canonical fix -> state update

## Bug rule

When a bug appears:

1. log it in `BUG_LEDGER_MEMORY.md`
2. do not widen scope silently
3. choose the smallest canonical local fix
4. update `IMPLEMENTATION_STATE.md`
5. continue only after the state file is updated

## Quality rule

Every important file must be drafted, reviewed, scored internally, and revised until it clears `9.6/10` on:

- authority alignment
- coherence
- completeness
- implementability
