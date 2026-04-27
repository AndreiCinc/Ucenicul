# COMPACT WORKFLOW CONTRACT — WF-SU-01

## Identity
- workflow_id: `WF-SU-01`
- workflow_label: State / Persistence Updater
- local_json: `workflows/WF-SU-01_State_Persistence_Updater/workflow/`
- live_workflow_id: `ENiYNfL3ul8AmmCB`

## Contract sources
- `workflows/WF-SU-01_State_Persistence_Updater/docs/`
- `workflows/WF-SU-01_State_Persistence_Updater/tests/su/` (nested)
- live JS scripts on the SU n8n nodes.

## Inputs
- required_inputs:
  - `execution_context_id`, `thread_id`, `user_id`, `idempotency_key`
  - `aggregated_result{}` (from RA)
- optional_inputs:
  - `write_classes[]` (drives write routing)
  - `memory_updates[]`

## Core behavior
- route_rules:
  - `SU_Input` is `executeWorkflowTrigger` (callable-ready).
  - Routes to write classes: `execution_contexts` / `threads` / `tasks` / `reminders` / `messages` / `rag_memories`.
  - Each write is idempotent on `(idempotency_key, target_table, target_key)`.
  - Emits `allowed_next_stage='WF-RC-01'`, `response_generation_allowed=true`.
- output_contract:
  - `SU_Build_Downstream_Envelope` emits RC-ready envelope + `domain_writes_performed[]`.

## Persistence
- db_touchpoints:
  - writes `execution_contexts` (status/timestamps update), `threads`, `tasks`, `reminders`, `messages`, `rag_memories`
- required_db_assertions:
  - per write class: row mutation matches envelope intent.
  - retry with same `idempotency_key` does not double-write.
  - all writes carry `origin='claude_test'` + `test_run_id`.

## Notes
- inferred_fields_present: yes.
- unresolved_items:
  - JS (not Python) on harness side; tests live in `tests/su/` nested folder.
  - Prior `tests/su/test_families.py` 650/650 PASS + live execs 744–747.
  - SU is already callable — no refactor needed.
