# CHAIN_MAPPING — WF-PL-01 → WF-DI-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: live `allowed_next_stage='WF-DI-01'` emitted by `PL_Generate_Plan` (P1 live evidence).
- connector_state_in_live: **none**.

## Live evidence
- `WF-PL-01`: `PL_Generate_Plan` emits `allowed_next_stage='WF-DI-01'`. `PL_Return_Result = return items;`. No `Execute Workflow` node.
- `WF-DI-01` (`abqYINcXr3JAhGGk`): `DI_Build_Dispatch_Payload` emits `allowed_next_stage='WF-ME-01'`. Entry trigger unverified for callable readiness.

## Connector plan
- mechanism: `Execute Workflow` (synchronous).
- source node to add: `PL_Dispatch_To_DI_01_SUBCALL` between `PL_Generate_Plan` and `PL_Return_Result`, gated by `allowed_next_stage === 'WF-DI-01'`.
- target entry: `DI_Input` must be (or become) an `executeWorkflowTrigger`.

## Field mapping (source → target)
| Source field (`PL_Generate_Plan` envelope → `PL_Return_Result`) | Target field (`DI_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `execution_context_id` | `execution_context_id` | pass-through | — | yes | |
| `thread_id` | `thread_id` | pass-through | — | yes | |
| `user_id` | `user_id` | pass-through | — | yes | |
| `idempotency_key` | `idempotency_key` | pass-through | — | yes | |
| `plan.plan_id` | `plan_id` | pass-through or derive from `crypto.randomUUID()` if missing | derived | yes | |
| `plan.steps[]` | `steps` | pass-through | `[]` | yes | DI fans out on this list |
| `plan.modules[]` | `modules` | pass-through | `[]` | yes | ME-capable module whitelist |
| `plan.priority` | `priority` | pass-through | `"normal"` | no | |
| `intent`, `entities` | pass-through | — | — | yes | downstream ME needs them |
| `allowed_next_stage='WF-DI-01'` | `gate_check` | assert | — | yes | |

## DB assertions (on synthetic chain run)
- No DB write by PL. DI writes nothing on the edge itself; target smoke verifies `DI_Build_Dispatch_Payload` returned `allowed_next_stage='WF-ME-01'` and `dispatch_payload[]` is non-empty.

## Cleanup
- No writes; nothing to clean.

## Remaining unknowns
- DI callable readiness.
- Exact schema of `plan.steps[]` — to be pinned during Phase 2 contract extraction.
