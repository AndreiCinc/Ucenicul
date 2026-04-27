# CHAIN_MAPPING — WF-DI-01 → WF-ME-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: live `allowed_next_stage='WF-ME-01'` emitted by `DI_Build_Dispatch_Payload` + `ME_Input` is already an `executeWorkflowTrigger` (callable-ready).
- connector_state_in_live: **none** (source has no `Execute Workflow` out, but target is callable).

## Live evidence
- `WF-DI-01`: `DI_Build_Dispatch_Payload` emits `allowed_next_stage='WF-ME-01'`. `DI_Return_Result = return items;`.
- `WF-ME-01` (`uq26nh1grIpnHju0`): `ME_Input` is `executeWorkflowTrigger` (**callable-ready**). Only `task_module` is supported in live-capable mode. `ME_Return_Result` emits `allowed_next_stage='WF-RA-01'`.

## Connector plan
- mechanism: `Execute Workflow` (synchronous; loop over `dispatch_payload[]` if DI fans out to multiple modules).
- source node to add: `DI_Dispatch_To_ME_01_SUBCALL` between `DI_Build_Dispatch_Payload` and `DI_Return_Result`. Split over `dispatch_payload[]` so each item is one subcall.
- target entry: already `ME_Input` executeWorkflowTrigger — no refactor needed.

## Field mapping (source → target, per dispatch item)
| Source field (`DI_Build_Dispatch_Payload` envelope) | Target field (`ME_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `execution_context_id` | `execution_context_id` | pass-through | — | yes | |
| `thread_id` | `thread_id` | pass-through | — | yes | |
| `user_id` | `user_id` | pass-through | — | yes | |
| `idempotency_key` + `.${module_name}` | `idempotency_key` | `${parent}.${module}` | derived | yes | per-module idempotency |
| `dispatch_payload[i].module_name` | `module_name` | pass-through | — | yes | must be in ME-supported list |
| `dispatch_payload[i].module_input` | `module_input` | pass-through | `{}` | yes | module-specific payload |
| `dispatch_payload[i].priority` | `priority` | pass-through | `"normal"` | no | |
| `intent`, `entities` | pass-through | — | — | no | optional but recommended |
| `allowed_next_stage='WF-ME-01'` | `gate_check` | assert | — | yes | |

## DB assertions (on synthetic chain run)
- When `module_name = 'task_module'`:
  - If `module_input.action = 'create'`: exactly one row inserted into `tasks` with `origin='claude_test'` and `test_run_id='run_2026-04-19_autonomous_test_e2e'`.
  - If `module_input.action = 'update'`: row updated; prior snapshot in audit table if present.
  - If `module_input.action = 'complete'`: `completed_at IS NOT NULL`.
  - If `module_input.action = 'delete'`: row removed (or `deleted_at` set).
- When `module_name ≠ 'task_module'`: no DB write, envelope-only.

## Cleanup
- `DELETE FROM tasks WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';`

## Remaining unknowns
- Full list of ME-supported modules (beyond `task_module`) in live mode.
- Whether DI fans out by default or requires an explicit split (to be confirmed in Phase 2 contract extraction).
