# TEST_ORACLE_MEMORY_MODULE.md

## Purpose

This document freezes the TDD oracle for the new `memory_module` before schema, SQL, or `WF-ME-01` implementation is allowed to advance.

It exists to reduce context noise, prevent drift during bug fixing, and give Claude a stable executable contract even when implementation details change.

## Scope

The oracle covers all five canonical actions:
- `store_memory`
- `search_memory`
- `recall_memory`
- `promote_memory`
- `supersede_memory`

## Test strategy decision

We use **test-first development** for this module.

Required order:
1. freeze oracle
2. freeze fixtures
3. freeze walker contract
4. write schema / migration
5. write patch plan
6. implement
7. run walker and compare against this oracle

No implementation phase may redefine expected behavior silently.

## Test volume

The module must ship with:
- **50 test cases per action**
- **250 total memory-module test cases**

Distribution:
- contract / validation cases
- DB mutation cases
- idempotency cases
- error / partial cases
- chain / aggregator cases

The full machine-readable index is in `tests/memory/fixtures/fixture_manifest.json`.

## Frozen global expectations

### Global status expectations
- `store_memory`: `success` on valid inputs, `failed` on validation or subjective-judgment rejection
- `search_memory`: `success` on valid searches, `partial` only for tolerated degraded query situations if explicitly designed, otherwise `failed`
- `recall_memory`: `success` on valid structural recall, `partial` only when explicitly documented, otherwise `failed`
- `promote_memory`: `success` when promotion criteria are met, `partial` when denied by policy, `failed` on invalid targets / invalid records
- `supersede_memory`: `success` for valid transactional supersede, `failed` on invalid target or invalid new-memory payload

### Frozen behavior decisions
- `search_memory` defaults to `status='active'`, with explicit override for other statuses
- `confidence` default = `0.8`
- `importance` default = `0.5`
- `durability` default = `stable`
- `source_thread_id` is mandatory for `store_memory`
- `source_message_id` is recommended, not always mandatory in v1
- `recall_memory` uses strict intersection when multiple filters are present
- `promote_memory` supports only `recent -> long_term`
- `supersede_memory` fails when the old target does not exist or is already `superseded`
- subjective lexical filter v1 runs in Romanian only

## Seven mandatory anchor cases

These are the high-signal anchor cases that every implementation must pass even before the full 250-case matrix is exhausted.

### A1 — store_memory happy path
- input: valid `content`, `memory_type`, `category`, `source_thread_id`
- expected aggregated status: `success`
- expected DB state:
  - one `memory_items` row inserted
  - `tier='recent'`
  - `status='active'`
  - defaults applied where omitted

### A2 — search_memory happy path
- pre-state: at least one seeded memory row exists
- input: query semantically close to seeded memory
- expected aggregated status: `success`
- expected output:
  - `recall_results[0]` returns seeded row
  - sorted by best similarity first

### A3 — recall_memory happy path
- pre-state: seeded memory with known `entity_id`, `thread_id`, `category`
- input: at least one supported structural filter
- expected aggregated status: `success`
- expected output:
  - rows returned without embedding ranking requirement
  - sorted by `created_at DESC`

### A4 — promote_memory happy path
- pre-state: `recent` row with promotion criterion satisfied
- input: `memory_id`, `promotion_target='long_term'`
- expected aggregated status: `success`
- expected DB state:
  - same row moved to `tier='long_term'`
  - `last_reconfirmed_at` updated

### A5 — promote_memory denied path
- pre-state: valid recent row, but no promotion criterion satisfied
- expected aggregated status: `partial`
- expected DB state:
  - tier remains `recent`
  - denial reason preserved in output

### A6 — supersede_memory happy path
- pre-state: one active row exists
- input: valid old ID + valid new-memory payload
- expected aggregated status: `success`
- expected DB state:
  - old row `status='superseded'`
  - new row `status='active'`
  - new row points to old row via `supersedes_memory_id`

### A7 — store_memory subjective refusal
- input: Romanian subjective insult / character judgment under `observation` or `pattern`
- expected aggregated status: `failed`
- expected DB state:
  - no new row inserted
  - failure code = `SUBJECTIVE_JUDGMENT_FORBIDDEN`

## 250-case matrix summary

### store_memory — 50 cases
Families covered:
- happy minimal
- happy rich
- idempotency replay
- subjective refusal
- validation failure
- seeded rows for later search / recall
- default application
- thread requirement
- embedding generation path
- metadata / evidence variations

Expected distribution:
- success: 43
- failed: 7
- partial: 0

### search_memory — 50 cases
Families covered:
- semantic happy path
- default active-only scope
- status override
- strict filter intersection
- empty result success
- limit behavior
- ranking stability
- invalid query / invalid limit
- cross-thread guard
- cross-status guard

Expected distribution:
- success: 45
- partial: 5
- failed: 0

### recall_memory — 50 cases
Families covered:
- entity recall
- thread recall
- category recall
- memory_type recall
- strict intersection
- ordering
- empty result success
- invalid no-filter cases
- status scope
- mixed filter guard

Expected distribution:
- success: 45
- partial: 5
- failed: 0

### promote_memory — 50 cases
Families covered:
- corroboration success
- user-confirmed success
- evidence-validated success
- denied partial
- invalid target
- already long_term
- status guard
- evidence merge
- counter update
- missing memory

Expected distribution:
- success: 35
- partial: 10
- failed: 5

### supersede_memory — 50 cases
Families covered:
- happy basic
- happy with evidence
- invalid old missing
- invalid old superseded
- transactional integrity
- idempotency replay
- store-contract reuse
- subjective guard
- linkage integrity
- status scope

Expected distribution:
- success: 43
- failed: 7
- partial: 0

## Layered test execution model

### Layer 1 — Contract tests
Validate request / result shapes for every action.

### Layer 2 — DB state tests
Validate inserts, updates, supersede transitions, promotion decisions, and non-write failures.

### Layer 3 — Chain / aggregator tests
Validate `aggregated_result.status`, module-result wrapping, and bridge behavior across workflow boundaries.

## Multi-workflow rule

If implementation uses more than one workflow or sub-workflow, tests MUST also assert the existence and correctness of the connector nodes that bridge them.

Examples:
- Execute Workflow nodes
- connector envelopes
- wait-for-child-completion behavior
- downstream envelope shape after sub-workflow return

A test is NOT considered complete if only the child workflow logic is asserted but the connector nodes are missing or untested.

## Required artifacts

Claude must create or complete:
- `tests/memory/fixtures/fixture_manifest.json`
- `tests/memory/walkers/walker.mjs`
- `tests/memory/results/README.md`
- any generated result files under `tests/memory/results/`

## Exit rule

Oracle freeze is complete only when:
- this file exists and is coherent
- the 250-case manifest exists
- walker conventions are frozen
- `IMPLEMENTATION_STATE.md` is updated
- `PHASE_GATE_CHECKLIST.md` reflects the oracle phase status
