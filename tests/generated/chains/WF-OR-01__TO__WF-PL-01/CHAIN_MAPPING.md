# CHAIN_MAPPING — WF-OR-01 → WF-PL-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: live `allowed_next_stage='WF-PL-01'` emitted by `OR_Return_Result` (P1 live evidence) + architecture (P3).
- connector_state_in_live: **none**.

## Live evidence
- `WF-OR-01`: `OR_Return_Result` emits `allowed_next_stage='WF-PL-01'`, `result_type='handoff'`. No `Execute Workflow` node.
- `WF-PL-01` (`RwToPLa1ErHl2tUi`): `PL_Generate_Plan` emits `allowed_next_stage='WF-DI-01'`. Entry trigger unverified for callable readiness.

## Connector plan
- mechanism: `Execute Workflow` (synchronous).
- source node to add: `OR_Dispatch_To_PL_01_SUBCALL` before `OR_Return_Result`, gated by `result_type === 'handoff' && allowed_next_stage === 'WF-PL-01'`.
- target entry: `PL_Input` must be (or become) an `executeWorkflowTrigger`.

## Field mapping (source → target)
| Source field (`OR_Return_Result` envelope) | Target field (`PL_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `execution_context_id` | `execution_context_id` | pass-through | — | yes | |
| `thread_id` | `thread_id` | pass-through | — | yes | |
| `user_id` | `user_id` | pass-through | — | yes | |
| `idempotency_key` | `idempotency_key` | pass-through | — | yes | |
| `intent_classification.intent` | `intent` | pass-through | — | yes | drives PL routing |
| `intent_classification.confidence` | `intent_confidence` | pass-through | `0.0` | no | |
| `intent_classification.sub_intents[]` | `sub_intents` | pass-through | `[]` | no | |
| `normalized_entities` | `entities` | pass-through | `{}` | no | |
| `user_message`, `thread` | pass-through | — | — | yes | upstream context preserved |
| `allowed_next_stage='WF-PL-01'` | `gate_check` | assert equals `'WF-PL-01'` | — | yes | pre-condition for subcall |

## DB assertions (on synthetic chain run)
- No DB write by OR or PL on this edge — envelope-only. Smoke verification: target returns items with `allowed_next_stage='WF-DI-01'`.

## Cleanup
- No writes; nothing to clean.

## Remaining unknowns
- PL callable readiness.
- Whether PL requires a dereference back to `execution_contexts` or trusts the envelope.
