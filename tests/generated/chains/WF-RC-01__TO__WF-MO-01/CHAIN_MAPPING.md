# CHAIN_MAPPING — WF-RC-01 → WF-MO-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: live `allowed_next_stage='MESSAGE_OUT'` emitted by `RC_Build_Output_Envelope` + `MO_Input` is `executeWorkflowTrigger` (callable-ready) + **disabled subcall infrastructure already present** in RC.
- connector_state_in_live: **disabled infrastructure present**. `RC_Dispatch_To_MO_01_SUBCALL` is an `executeWorkflow` node pointing at `OooZdC0DgsDR6gm0` (MO), and `RC_Prepare_MO_01_Handoff` is a code node — both disabled. Gated by `dispatch_to_mo_01 === true`.

## Live evidence
- `WF-RC-01`: `RC_Build_Output_Envelope` emits `allowed_next_stage='MESSAGE_OUT'`. `RC_Dispatch_To_MO_01_SUBCALL` and `RC_Prepare_MO_01_Handoff` exist but `disabled=true`.
- `WF-MO-01` (`OooZdC0DgsDR6gm0`): `MO_Input` is `executeWorkflowTrigger` (**callable-ready**). Terminates at `MO_Return_Result` after `MO_Log_Outbound_Message`. `MO_Send_Channel_PLACEHOLDER` (Telegram node) requires live provider binding.

## Connector plan
- mechanism: `Execute Workflow` (synchronous) — already wired in JSON; needs **enable** + **gate default**.
- patch actions:
  1. Set `dispatch_to_mo_01 = true` as default on the envelope (or flip the disabled flag on the gate node).
  2. `disabled: false` on `RC_Dispatch_To_MO_01_SUBCALL`.
  3. `disabled: false` on `RC_Prepare_MO_01_Handoff`.
  4. Bind `MO_Send_Channel_PLACEHOLDER` to a real provider credential **before** the runtime smoke, OR accept `PLACEHOLDER` output and assert only on `outbound_delivery_ledger_claude_mcp` writes during synthetic runs.
- target entry: already `MO_Input` executeWorkflowTrigger — no refactor needed.

## Field mapping (source → target)
| Source field (`RC_Build_Output_Envelope` / `RC_Prepare_MO_01_Handoff`) | Target field (`MO_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `execution_context_id` | `execution_context_id` | pass-through | — | yes | |
| `thread_id` | `thread_id` | pass-through | — | yes | |
| `user_id` | `user_id` | pass-through | — | yes | |
| `idempotency_key` | `idempotency_key` | pass-through | — | yes | becomes `delivery_key` in ledger |
| `response_text` | `message_text` | pass-through | — | yes | user-facing text |
| `response_format` | `message_format` | pass-through | `"text"` | no | `text` / `markdown` / `html` |
| `thread.origin` | `channel` | pass-through | `"telegram"` | yes | routes to channel-specific sender |
| `thread.external_chat_id` | `channel_destination` | pass-through | — | yes | Telegram chat_id or equivalent |
| `attachments[]?` | `attachments` | pass-through | `[]` | no | |
| `allowed_next_stage='MESSAGE_OUT'` | `gate_check` | assert | — | yes | |

## DB assertions (on synthetic chain run)
- After MO completion: exactly one row in `outbound_delivery_ledger_claude_mcp` with `delivery_key = $syn_idempotency_key` and `origin = 'claude_test'`.
- Retry with same `idempotency_key` must not insert a duplicate (ledger enforces uniqueness).

## Cleanup
- `DELETE FROM outbound_delivery_ledger_claude_mcp WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';`
- If live provider was bound, ensure no real message was sent to a production account — use a dedicated synthetic channel or short-circuit `MO_Send_Channel_PLACEHOLDER` during synthetic runs.

## Remaining unknowns
- Whether `MO_Send_Channel_PLACEHOLDER` can stay PLACEHOLDER for synthetic runs or must be bound to a stub provider.
- Whether `dispatch_to_mo_01` should be set by the envelope or hard-defaulted in RC once the connector is enabled.
