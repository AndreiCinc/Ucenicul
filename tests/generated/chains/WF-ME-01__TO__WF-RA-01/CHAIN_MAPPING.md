# CHAIN_MAPPING — WF-ME-01 → WF-RA-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: live `allowed_next_stage='WF-RA-01'` emitted by `ME_Return_Result` + `RA_Input` is `executeWorkflowTrigger` (callable-ready).
- connector_state_in_live: **none** (source has no `Execute Workflow` out, but target is callable).

## Live evidence
- `WF-ME-01`: `ME_Return_Result` emits `allowed_next_stage='WF-RA-01'`.
- `WF-RA-01` (`5RcNLtxNjAHJsZPE`): `RA_Input` is `executeWorkflowTrigger` (**callable-ready**). `RA_Build_Downstream_Envelope` emits `allowed_next_stage='WF-SU-01'`.

## Connector plan
- mechanism: `Execute Workflow` (synchronous; one call per module result, or a single aggregated call if RA is designed to batch).
- source node to add: `ME_Dispatch_To_RA_01_SUBCALL` between `ME_Return_Result` path and its terminal return; gated by `status_kind IN ('success', 'partial', 'failure')` so RA always receives the module outcome.
- target entry: already `RA_Input` executeWorkflowTrigger — no refactor needed.

## Field mapping (source → target)
| Source field (`ME_Return_Result` envelope) | Target field (`RA_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `execution_context_id` | `execution_context_id` | pass-through | — | yes | |
| `thread_id` | `thread_id` | pass-through | — | yes | |
| `user_id` | `user_id` | pass-through | — | yes | |
| `idempotency_key` | `idempotency_key` | pass-through | — | yes | |
| `module_name` | `module_name` | pass-through | — | yes | |
| `module_result.status_kind` | `module_result.status_kind` | pass-through | — | yes | success / partial / failure |
| `module_result.result_type` | `module_result.result_type` | pass-through | — | yes | e.g., `task_created`, `memory_fetched` |
| `module_result.payload` | `module_result.payload` | pass-through | `{}` | yes | |
| `module_result.error?` | `module_result.error` | pass-through | `null` | no | only on failure |
| `domain_writes_performed[]` | `domain_writes_performed` | pass-through | `[]` | no | RA aggregates these |
| `allowed_next_stage='WF-RA-01'` | `gate_check` | assert | — | yes | |

## DB assertions (on synthetic chain run)
- RA reads `module_results` (or trusts the envelope). No DB write from RA itself on the edge.
- If ME just wrote `tasks`, that row remains intact after RA processes the envelope.

## Cleanup
- Inherit from DI→ME edge (tasks cleanup). RA does not add writes.

## Remaining unknowns
- Whether RA pulls `module_results` from DB or trusts envelope only — Phase 2 contract extraction to pin.
