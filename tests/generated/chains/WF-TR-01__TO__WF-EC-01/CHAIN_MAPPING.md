# CHAIN_MAPPING — WF-TR-01 → WF-EC-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: architecture (P3) + workflow-local readiness docs; EC cannot produce an execution context without TR's thread_id/origin payload.
- connector_state_in_live: **none** (no `Execute Workflow` present on either side).

## Live evidence
- `WF-TR-01` (`wI8hpSROxQI0zC9f`): terminates at `TR_Return_Result` after `TR_Write_Audit`. No `Execute Workflow` / `executeWorkflowTrigger` downstream.
- `WF-EC-01` (`v9jih4jqeXpOJOiH`): writes `execution_contexts` via `ON CONFLICT (idempotency_key) DO NOTHING`. First trigger node type needs verification before it can be called as a subworkflow.

## Connector plan
- mechanism: `Execute Workflow` (synchronous, wait-for-child-completion).
- source node to add: `TR_Dispatch_To_EC_01_SUBCALL` (executeWorkflow → `v9jih4jqeXpOJOiH`).
- source node placement: after `TR_Write_Audit`, before `TR_Return_Result`, or — preferably — replace `TR_Return_Result` with the subcall + pass-through so the full chain walks end-to-end.
- target entry: `EC_Input` must be (or become) an `executeWorkflowTrigger`.

## Field mapping (source → target)
| Source field (from `TR_Return_Result`) | Target field (on `EC_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `user_message.text` | `user_message.text` | pass-through | — | yes | must be present for EC to build context |
| `user_message.origin` | `user_message.origin` | pass-through | `"telegram"` when absent | yes | drives EC's `origin` column |
| `user_message.user_id` | `user_message.user_id` | pass-through | — | yes | |
| `user_message.external_message_id` | `user_message.external_message_id` | pass-through | — | yes | used to compute `idempotency_key` |
| `thread_resolution.thread_id` | `thread.thread_id` | pass-through | — | yes | |
| `thread_resolution.is_new_thread` | `thread.is_new_thread` | pass-through | `false` | no | |
| `thread_resolution.decision_reason` | `thread.decision_reason` | pass-through | — | no | audit-only |
| `idempotency_key` (if TR derives one) | `idempotency_key` | pass-through, else derive from `external_message_id` | derived | yes | must be stable across retries |

## DB assertions (on synthetic chain run)
- After target completion: exactly one row in `execution_contexts` where `idempotency_key = $syn_idempotency_key` and `origin = 'claude_test'`.
- Retry with identical payload must leave row count unchanged (ON CONFLICT DO NOTHING).

## Cleanup
- `DELETE FROM execution_contexts WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';`

## Remaining unknowns
- EC callable readiness: confirm `EC_Input` trigger type; refactor if still a generic trigger.
- Whether TR currently sets `idempotency_key` or EC derives it — to be pinned during Phase 2 compact contract extraction.
