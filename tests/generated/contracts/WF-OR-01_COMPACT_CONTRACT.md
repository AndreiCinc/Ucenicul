# COMPACT WORKFLOW CONTRACT — WF-OR-01

## Identity
- workflow_id: `WF-OR-01`
- workflow_label: Orchestrator
- local_json: `workflows/WF-OR-01_Orchestrator/workflow/`
- live_workflow_id: `KhGmNpi0ZDmrnz8W`

## Contract sources
- `workflows/WF-OR-01_Orchestrator/docs/`
- `workflows/WF-OR-01_Orchestrator/scripts/or_logic.py`
- `workflows/WF-OR-01_Orchestrator/tests/test_families.py`
- `docs/architecture/n8n_Workflow_Mapping.md` §OR

## Inputs
- required_inputs:
  - `execution_context_id` (uuid)
  - `thread_id` (uuid)
  - `user_id` (uuid)
  - `user_message{ text, origin, external_message_id }`
  - `idempotency_key`
- optional_inputs:
  - `locale`
  - `prior_turn_summary`

## Core behavior
- route_rules:
  - OR classifies intent (brain layer), extracts entities, decides next stage (`WF-PL-01`).
  - No branching on intent — always routes to PL as long as intent is resolvable.
  - Unresolvable intent → error envelope (handled by OR_Return_Result).
- output_contract:
  - `OR_Return_Result` envelope: `intent_classification{ intent, confidence, sub_intents[] }`, `normalized_entities{...}`, `allowed_next_stage='WF-PL-01'`, `result_type='handoff'`.

## Persistence
- db_touchpoints:
  - reads `execution_contexts`
  - no writes
- required_db_assertions:
  - `execution_contexts` row for the given `execution_context_id` exists and is readable.
  - no new writes by OR itself.

## Notes
- inferred_fields_present: yes — envelope fields captured live.
- unresolved_items:
  - Empty `reports/` folder; no closure/audit doc.
  - `test_families.py` fresh run failed with 150 errors — majority are tooling-reporting/artifact checks (same pattern as EC). Contract families verified previously at 650/650.
  - No `Execute Workflow` connector out (canonical edge OR→PL not active).
