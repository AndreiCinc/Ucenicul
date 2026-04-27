# COMPACT WORKFLOW CONTRACT — WF-DI-01

## Identity
- workflow_id: `WF-DI-01`
- workflow_label: Dispatcher
- local_json: `workflows/WF-DI-01_Dispatcher/workflow/`
- live_workflow_id: `abqYINcXr3JAhGGk`

## Contract sources
- `workflows/WF-DI-01_Dispatcher/docs/`
- `workflows/WF-DI-01_Dispatcher/scripts/di_logic.py`
- `workflows/WF-DI-01_Dispatcher/tests/test_families.py`
- `docs/architecture/Module_Registry_Ucenicul.md` (P3 registry truth)

## Inputs
- required_inputs:
  - `execution_context_id`, `thread_id`, `user_id`, `idempotency_key`
  - `plan{ plan_id, steps[], modules[] }` (from PL)
- optional_inputs:
  - `priority`, `intent`, `entities`

## Core behavior
- route_rules:
  - DI validates modules against `module_registry` (code-derived).
  - Builds `dispatch_payload[]` with one entry per module invocation.
  - Emits `allowed_next_stage='WF-ME-01'`.
- output_contract:
  - `DI_Build_Dispatch_Payload` node emits full envelope.
  - `DI_Return_Result = return items;`.

## Persistence
- db_touchpoints:
  - reads `execution_contexts`, `module_registry` (code-derived; no DB table lookup unless migration adds one)
  - no writes
- required_db_assertions:
  - none from DI itself.

## Notes
- inferred_fields_present: yes.
- unresolved_items:
  - `test_families.py` fresh run 2026-04-19: AssertionError "stage file missing" — prior run 650/650 PASS.
  - No `Execute Workflow` connector out (canonical edge DI→ME not active).
  - Prior live execs 716–720 recorded DI behaviour as intended.
