# FOCUS_PACK.md — Memory Module Entry Point

This file is the permanent entry point for the `memory_module` workspace.
It replaces one-shot handoff manifests as the day-to-day operational anchor.

## What this workspace is for

Designing and implementing the new modular `memory_module` with all five canonical actions:

1. `store_memory`
2. `recall_memory`
3. `promote_memory`
4. `search_memory`
5. `supersede_memory`

## What this workspace is NOT for

- resurrecting or adapting `rag_memories`
- redesigning the whole repo
- touching non-memory workflows
- re-auditing the canonical baseline
- changing global authority docs without explicit escalation

## Minimal authority pack

Read only these sections from the global corpus unless the task truly requires more:

- `Architecture_Spec_v3_Ucenicul.md`
  - F.9 Memory Item
  - M. Memory Model
  - V. Privacy Contracts
  - X. Schema Gap Register
  - Y.4 Boundary Map
  - Y.9 Privacy Boundary
- `Migration_Plan_Ucenicul.md`
  - cutover principles
  - transitional rules
  - incompatibility list
- `Memory_Model_Spec.md`
- `Module_Spec_Memory.md`
- `Module_Registry_Ucenicul.md`

## Implemented-state truth for this mission

For the current mission, implemented-state truth is derived from:

- `ddl_current_20260420.sql`
- `MEMORY_MODULE_BUNDLE_README.md`
- current live ME / PL workflow exports when available
- current ME placeholder handler code

If any historical doc conflicts with the new mission contract, the mission contract wins for this module workspace, provided it does not violate the global architecture spec.

## Frozen decisions for this mission

- New architecture starts from zero for `memory_items`
- `rag_memories` is treated as legacy / out-of-scope
- `memory_module` must implement all 5 canonical actions
- `search_memory` defaults to `status='active'`, with explicit override support
- defaults:
  - `confidence = 0.8`
  - `importance = 0.5`
  - `durability = stable`
- `source_thread_id` is required for `store_memory`
- `source_message_id` is recommended but not hard-required in all v1 cases
- `recall_memory` uses strict filter intersection
- `promote_memory` supports only `recent -> long_term`
- final verification must include `Known limitations / v2 follow-ups`

## Write fence

Allowed writes:

- this subtree
- `tests/memory/**`
- memory-specific migration / patch planning
- memory-specific ME patch surface

Forbidden writes by default:

- `Architecture_Spec_v3_Ucenicul.md`
- `Migration_Plan_Ucenicul.md`
- `rag_memories`
- non-memory workflow logic
- global repo restructuring

## Escalation triggers

Escalate instead of silently changing scope when:

- a fix requires touching workflows other than `WF-ME-01`
- a fix requires changing global canonical docs
- the design would invalidate existing green chain guarantees
- the DB reality blocks `memory_items` creation
- the patch would require changing task/reminder/improvement/watcher paths

## Version fencing

These hashes were captured when this focus pack was created. If the live files drift, re-check before proceeding.

- `Architecture_Spec_v3_Ucenicul.md`: `142b0466f6c1`
- `Migration_Plan_Ucenicul.md`: `7595829edbfa`
- `Memory_Model_Spec.md`: `be5ae788a43f`
- `Module_Spec_Memory.md`: `f673fdb39631`
- `Module_Registry_Ucenicul.md`: `650339ad8b9c`
- `ddl_current_20260420.sql`: `5fdbc9f25c94`
- `MEMORY_MODULE_BUNDLE_README.md`: `d73f8a06f948`
- `FINAL_TEST_AND_E2E_SUMMARY.md`: `b2a3c4fe5cad`

## Session resume protocol

Every new session must start with:

1. `FOCUS_PACK.md`
2. `MISSION_CONTRACT_MEMORY_MODULE.md`
3. `IMPLEMENTATION_STATE.md`
4. `DECISION_LEDGER_MEMORY.md`
5. `BUG_LEDGER_MEMORY.md`
6. `PHASE_GATE_CHECKLIST.md`

Do not reload the entire repo unless the current phase requires it.
