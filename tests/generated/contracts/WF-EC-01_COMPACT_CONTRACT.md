# COMPACT WORKFLOW CONTRACT — WF-EC-01

## Identity
- workflow_id: `WF-EC-01`
- workflow_label: Execution Context
- local_json: `workflows/WF-EC-01_Execution_Context/workflow/`
- live_workflow_id: `v9jih4jqeXpOJOiH`

## Contract sources
- `workflows/WF-EC-01_Execution_Context/docs/`
- `workflows/WF-EC-01_Execution_Context/scripts/ec_logic.py`
- `workflows/WF-EC-01_Execution_Context/tests/test_families.py` (9 of 10 families canonical; 10th is tooling-reporting drift)

## Inputs
- required_inputs:
  - `user_message{ text, origin, user_id, external_message_id }`
  - `thread{ thread_id, is_new_thread? }`
  - `idempotency_key` (derived from `external_message_id` if absent)
- optional_inputs:
  - `tenant_id` (default derived from `user_id`)

## Core behavior
- route_rules:
  - `EC_Route_Valid` switch: if payload validates (all required fields present + schema-match), route to upsert; else emit error envelope.
  - `EC_Upsert_Context`: SQL `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`.
  - Parameterized binds: `$1..$8` (uuid, text, text, uuid, uuid, text, jsonb, timestamptz) per `ec_logic.py`.
- output_contract:
  - `EC_Return_Result` envelope: `execution_context{ execution_context_id, thread_id, user_id, origin, idempotency_key, ... }`, `meta{ module_name:'execution_context_init', result_type:'state' }`.
  - No `allowed_next_stage` emitted (handoff to OR via envelope + DB).

## Persistence
- db_touchpoints:
  - writes `execution_contexts` (UPSERT ON CONFLICT DO NOTHING on `idempotency_key`)
  - reads `execution_contexts` on replay
- required_db_assertions:
  - first call inserts exactly one row with `origin='claude_test'`, `test_run_id=...`.
  - replay with identical `idempotency_key` leaves row count unchanged and returns the prior row.
  - cross-tenant: same `idempotency_key` with different `tenant_id` is rejected at validation.

## Notes
- inferred_fields_present: yes — node + SQL node + alwaysOutputData=true verified in tests; availableInMCP=true.
- unresolved_items:
  - `current_plan_ref` schema drift (`varchar(200)` vs. `uuid`) — non-blocking but tracked for migration.
  - Tooling-reporting family in `test_families.py` fails due to removed handoff docs dir; contract-level families still 270/270 PASS (fresh run 2026-04-19).
  - No `Execute Workflow` connector out (canonical edge EC→OR not active).
