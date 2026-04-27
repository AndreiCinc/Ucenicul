# COMPACT WORKFLOW CONTRACT — WF-MO-01

## Identity
- workflow_id: `WF-MO-01`
- workflow_label: Message Out / Output Gateway
- local_json: `workflows/WF-MO-01_Message_Out_Output_Gateway/workflow/`
- live_workflow_id: `OooZdC0DgsDR6gm0`

## Contract sources
- `workflows/WF-MO-01_Message_Out_Output_Gateway/docs/`
- `workflows/WF-MO-01_Message_Out_Output_Gateway/scripts/mo_logic.py`
- `workflows/WF-MO-01_Message_Out_Output_Gateway/tests/test_families.py`

## Inputs
- required_inputs:
  - `execution_context_id`, `thread_id`, `user_id`, `idempotency_key`
  - `message_text` (string)
  - `channel` (e.g., `telegram`)
  - `channel_destination` (e.g., Telegram chat_id)
- optional_inputs:
  - `message_format`, `attachments[]`

## Core behavior
- route_rules:
  - `MO_Input` is `executeWorkflowTrigger` (callable-ready).
  - Log outbound → idempotency check → send via provider → record delivery.
  - `MO_Send_Channel_PLACEHOLDER` is a Telegram node requiring live provider credentials.
- output_contract:
  - `MO_Return_Result` envelope: `{ delivery_id, delivery_status, provider_message_id, idempotency_key, ... }`.
  - Terminal workflow — no `allowed_next_stage`.

## Persistence
- db_touchpoints:
  - reads `threads` (channel destination)
  - writes `outbound_delivery_ledger_claude_mcp` (idempotency ledger)
- required_db_assertions:
  - one row inserted per unique `idempotency_key`.
  - retry with same `idempotency_key` does not insert duplicate; returns prior ledger row.

## Notes
- inferred_fields_present: yes — callable-ready; prior 650/650 PASS.
- unresolved_items:
  - `test_families.py` fresh run 2026-04-19: `ModuleNotFoundError: No module named 'workflows.scripts.mo'` — import path wrong in test file; prior run used a different layout.
  - `MO_Send_Channel_PLACEHOLDER` Telegram node needs provider credential binding for live send; synthetic runs should short-circuit.
  - MO is already callable — no refactor needed.
