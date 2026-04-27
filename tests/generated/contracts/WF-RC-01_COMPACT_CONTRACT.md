# COMPACT WORKFLOW CONTRACT — WF-RC-01

## Identity
- workflow_id: `WF-RC-01`
- workflow_label: Response Composer
- local_json: `workflows/WF-RC-01_Response_Composer/workflow/`
- live_workflow_id: `TClXgmO8H8zsSwMb`

## Contract sources
- `workflows/WF-RC-01_Response_Composer/docs/`
- `workflows/WF-RC-01_Response_Composer/scripts/rc_logic.py`
- `workflows/WF-RC-01_Response_Composer/tests/test_families.py`

## Inputs
- required_inputs:
  - `execution_context_id`, `thread_id`, `user_id`, `idempotency_key`
  - `module_results{}` (from SU's aggregated payload)
  - `domain_writes_performed[]`
- optional_inputs:
  - `user_facing_summary`, `locale`

## Core behavior
- route_rules:
  - RC composes the user-facing response text + format.
  - Gated emission: when `dispatch_to_mo_01 === true`, it calls `RC_Dispatch_To_MO_01_SUBCALL` (executeWorkflow → MO). **Currently disabled in live.**
  - Emits `allowed_next_stage='MESSAGE_OUT'`.
- output_contract:
  - `RC_Build_Output_Envelope` emits MO-ready envelope with `response_text`, `response_format`, `channel`, `channel_destination`.

## Persistence
- db_touchpoints:
  - reads `execution_contexts`, `threads` (for chat context)
  - no writes
- required_db_assertions:
  - none from RC itself.

## Notes
- inferred_fields_present: yes.
- unresolved_items:
  - 6 misfiled reports live in `docs/` (prior drift); not contract-blocking.
  - `RC_Prepare_MO_01_Handoff` + `RC_Dispatch_To_MO_01_SUBCALL` exist but are DISABLED — Phase 4 must enable them.
  - RC entry trigger type needs verification for callable readiness when SU→RC connector is activated.
