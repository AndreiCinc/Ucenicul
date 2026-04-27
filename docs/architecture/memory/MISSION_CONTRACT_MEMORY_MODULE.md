# MISSION_CONTRACT_MEMORY_MODULE.md

## Mission

Design and prepare implementation for the new `memory_module` so that Claude can execute the work autonomously, in small controlled phases, with minimal context noise and explicit recovery from bugs.

## Product goal

Create a modular, thread-aware memory subsystem that is ready to be used in the new architecture and is not coupled to the old `rag_memories` model.

## In scope

- new `memory_items` architecture
- all five canonical actions:
  - `store_memory`
  - `search_memory`
  - `recall_memory`
  - `promote_memory`
  - `supersede_memory`
- memory-specific documentation subtree
- memory-specific migration plan and SQL
- memory-specific `WF-ME-01` patch plan
- memory-specific walker strategy
- final verification protocol

## Out of scope

- adapting `rag_memories`
- redesigning non-memory module behavior
- touching task/reminder/improvement/watcher logic
- changing global authority documents unless escalated
- broad repo reorganization
- privacy Phase 2 implementation beyond compatibility notes

## Write surface

Primary write surface:

- `docs/architecture/memory/**`
- `tests/memory/**`

Controlled implementation surface:

- memory-related `WF-ME-01` handler path only
- migration SQL for new `memory_items`

## Mandatory operating method

Claude MUST use explicit sub-processes / agent roles:

1. `memory-architect`
   - owns contracts, scope, design logic
2. `postgres-migrator`
   - owns DDL, enums, indexes, constraints, idempotency
3. `n8n-patcher`
   - owns ME handler patching and node-level change planning
4. `walker-tester`
   - owns fixtures, test oracle, walker logic
5. `document-auditor`
   - owns clarity, consistency, authority alignment, and file scoring

Claude MUST also use explicit skills / pipelines:
- PostgreSQL skill pipeline
- n8n patch pipeline
- documentation pipeline
- bug handling pipeline
- verification pipeline

## Required phase order

0. workspace control
1. focus + divergence freeze
2. action contracts freeze
3. design doc freeze
4. schema + migration freeze
5. patch planning freeze
6. walker / oracle freeze
7. final verification

No phase may be skipped. No phase may be silently reopened without a logged reason.

## Bug handling contract

When a bug is found:

1. log it in `BUG_LEDGER_MEMORY.md`
2. classify scope:
   - local-memory
   - cross-surface
   - authority-conflict
   - environment-blocker
3. apply the smallest canonical local fix if possible
4. update `IMPLEMENTATION_STATE.md`
5. continue only after the state file is updated

## File quality rule

Every important file must be:
- drafted
- reviewed
- internally scored
- revised until it reaches at least `9.6 / 10`

Scoring dimensions:
- authority alignment
- coherence
- completeness
- implementability

## Frozen architecture choices

- `memory_items` is new and separate
- `rag_memories` is ignored for the new architecture
- working memory stays outside `memory_items`
- `memory_items.tier` supports only `recent` and `long_term`
- `promote_memory` only supports `recent -> long_term`
- `search_memory` defaults to `active`, with explicit override
- defaults:
  - `confidence = 0.8`
  - `importance = 0.5`
  - `durability = stable`
- `source_thread_id` required
- `source_message_id` recommended but optional in some v1 cases
- recall filters intersect strictly
- `final_verification.md` must contain `Known limitations / v2 follow-ups`

## Mandatory deliverables

- `memory_module_design.md`
- `migration.sql`
- `patch_plan.md`
- `tests/memory/walkers/walker.mjs`
- `final_verification.md`

## Definition of done

The mission is done only when:
- the design is frozen
- the SQL is frozen
- the patch plan is frozen
- the walker oracle is frozen
- the final verification document exists
- all open bugs are either closed or explicitly carried in `Known limitations / v2 follow-ups`
