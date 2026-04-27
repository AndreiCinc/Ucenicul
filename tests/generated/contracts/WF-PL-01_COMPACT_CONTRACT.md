# COMPACT WORKFLOW CONTRACT — WF-PL-01

## Identity
- workflow_id: `WF-PL-01`
- workflow_label: Plan Generation
- local_json: `workflows/WF-PL-01_Plan_Generation/workflow/`
- live_workflow_id: `RwToPLa1ErHl2tUi`

## Contract sources
- `workflows/WF-PL-01_Plan_Generation/docs/`
- `workflows/WF-PL-01_Plan_Generation/scripts/pl_logic.py`
- `workflows/WF-PL-01_Plan_Generation/tests/test_families.py`
- `docs/architecture/n8n_Workflow_Mapping.md` §PL

## Inputs
- required_inputs:
  - `execution_context_id`, `thread_id`, `user_id`, `idempotency_key`
  - `intent` (string from OR)
  - `entities{}` (object from OR)
- optional_inputs:
  - `locale`, `prior_turn_summary`, `intent_confidence`

## Core behavior
- route_rules:
  - PL builds a plan: `{ plan_id, steps[], modules[], priority }`.
  - Module whitelist derived from architecture (task_module, memory_module, rag_module, etc.).
  - Emits `allowed_next_stage='WF-DI-01'`.
- output_contract:
  - `PL_Generate_Plan` node emits full plan envelope.
  - `PL_Return_Result = return items;` (pass-through).

## Persistence
- db_touchpoints:
  - reads `execution_contexts` (optional context pull)
  - no writes
- required_db_assertions:
  - no DB mutation from PL.

## Notes
- inferred_fields_present: yes.
- unresolved_items:
  - `test_families.py` fresh run 2026-04-19: 150 errors — same tooling-reporting drift pattern.
  - No `Execute Workflow` connector out (canonical edge PL→DI not active).
  - Prior live execs 711–714 recorded PL behaviour as intended.
