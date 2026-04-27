# COMPACT WORKFLOW CONTRACT — WF-RA-01

## Identity
- workflow_id: `WF-RA-01`
- workflow_label: Result Aggregator
- local_json: `workflows/WF-RA-01_Result_Aggregator/workflow/`
- live_workflow_id: `5RcNLtxNjAHJsZPE`

## Contract sources
- `workflows/WF-RA-01_Result_Aggregator/docs/`
- `workflows/WF-RA-01_Result_Aggregator/scripts/ra_logic.py`
- `workflows/WF-RA-01_Result_Aggregator/tests/test_families.py`

## Inputs
- required_inputs:
  - `execution_context_id`, `thread_id`, `user_id`, `idempotency_key`
  - `module_name`, `module_result{ status_kind, result_type, payload }`
- optional_inputs:
  - `domain_writes_performed[]`, `memory_updates[]`, `error`

## Core behavior
- route_rules:
  - `RA_Input` is `executeWorkflowTrigger` (callable-ready).
  - Aggregates one or more module results, forming `aggregated_result{ status_kind, result_type, payload }`.
  - Determines SU write classes (state, thread_touch, tasks, reminders, messages, rag_memories).
  - Emits `allowed_next_stage='WF-SU-01'`.
- output_contract:
  - `RA_Build_Downstream_Envelope` emits full SU-ready envelope.

## Persistence
- db_touchpoints:
  - reads `execution_contexts`, `module_results` (or envelope-only if caller passes inline)
  - no writes
- required_db_assertions:
  - if caller wrote `tasks`/etc. before RA, RA does not mutate them.

## Notes
- inferred_fields_present: yes.
- unresolved_items:
  - `test_families.py` fresh run 2026-04-19: AssertionError "missing required SQL files" — harness expects `sql/01..sql/20` fixture files. Prior run 650/650 PASS + live execs 734–738.
  - RA is already callable — no refactor needed.
