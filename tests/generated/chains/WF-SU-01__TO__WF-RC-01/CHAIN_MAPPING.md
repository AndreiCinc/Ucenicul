# CHAIN_MAPPING — WF-SU-01 → WF-RC-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: live `allowed_next_stage='WF-RC-01'` + `response_generation_allowed=true` emitted by `SU_Build_Downstream_Envelope`. This edge did not exist in the prior ledger; the corrected chain places SU before RC.
- connector_state_in_live: **none**.

## Live evidence
- `WF-SU-01`: `SU_Build_Downstream_Envelope` emits `allowed_next_stage='WF-RC-01'`, `response_generation_allowed=true`.
- `WF-RC-01` (`TClXgmO8H8zsSwMb`): `RC_Build_Output_Envelope` emits `allowed_next_stage='MESSAGE_OUT'`. Entry trigger unverified for callable readiness.

## Connector plan
- mechanism: `Execute Workflow` (synchronous).
- source node to add: `SU_Dispatch_To_RC_01_SUBCALL` after `SU_Build_Downstream_Envelope`; gated by `response_generation_allowed === true && allowed_next_stage === 'WF-RC-01'`.
- target entry: `RC_Input` must be (or become) an `executeWorkflowTrigger`.

## Field mapping (source → target)
| Source field (`SU_Build_Downstream_Envelope`) | Target field (`RC_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `execution_context_id` | `execution_context_id` | pass-through | — | yes | |
| `thread_id` | `thread_id` | pass-through | — | yes | |
| `user_id` | `user_id` | pass-through | — | yes | |
| `idempotency_key` | `idempotency_key` | pass-through | — | yes | |
| `aggregated_result.payload` | `module_results` | pass-through | `{}` | yes | content feeding response composition |
| `domain_writes_performed[]` | `domain_writes_performed` | pass-through | `[]` | yes | RC references this for confirmation text |
| `user_facing_summary?` | `user_facing_summary` | pass-through | `null` | no | |
| `response_generation_allowed=true` | `gate_check` | assert | — | yes | hard gate on RC invocation |
| `allowed_next_stage='WF-RC-01'` | `gate_check` | assert | — | yes | |

## DB assertions (on synthetic chain run)
- No DB write by SU for this edge (SU's writes are earlier in its own flow).
- No DB write by RC — envelope-only. Smoke verification: RC emits `allowed_next_stage='MESSAGE_OUT'` and a non-empty `response_text`.

## Cleanup
- Nothing edge-specific.

## Remaining unknowns
- RC callable readiness (trigger node type).
- Whether RC reads `threads` to obtain chat context or trusts the envelope — Phase 2 contract extraction to pin.
