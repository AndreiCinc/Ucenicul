# CHAIN_MAPPING — WF-EC-01 → WF-OR-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: architecture (P3) — OR's contract says it reads `execution_contexts`; EC is the sole writer. Envelope handoff required because OR needs the freshly-committed row.
- connector_state_in_live: **none**.

## Live evidence
- `WF-EC-01` (`v9jih4jqeXpOJOiH`): `EC_Return_Result` emits `module_name='execution_context_init'`, `result_type='state'`; writes `execution_contexts` (upsert). No `Execute Workflow` node.
- `WF-OR-01` (`KhGmNpi0ZDmrnz8W`): emits `allowed_next_stage='WF-PL-01'`. Entry trigger unverified for callable readiness.

## Connector plan
- mechanism: `Execute Workflow` (synchronous).
- source node to add: `EC_Dispatch_To_OR_01_SUBCALL` after the DB upsert, before `EC_Return_Result`.
- target entry: `OR_Input` must be (or become) an `executeWorkflowTrigger`.

## Field mapping (source → target)
| Source field (`EC_Return_Result` envelope) | Target field (`OR_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `execution_context.execution_context_id` | `execution_context_id` | pass-through | — | yes | OR joins on this |
| `execution_context.thread_id` | `thread_id` | pass-through | — | yes | |
| `execution_context.user_id` | `user_id` | pass-through | — | yes | tenant boundary |
| `execution_context.origin` | `origin` | pass-through | — | yes | |
| `execution_context.idempotency_key` | `idempotency_key` | pass-through | — | yes | continues downstream |
| `user_message` (full object) | `user_message` | pass-through | — | yes | |
| `thread` (full object) | `thread` | pass-through | — | yes | |
| `meta.result_type='state'` | `upstream_result_type` | pass-through | `"state"` | no | audit |

## DB assertions (on synthetic chain run)
- Before subcall: exactly one row exists in `execution_contexts` for the synthetic `idempotency_key`.
- OR produces no DB writes — assertion is envelope-only (target emits `allowed_next_stage='WF-PL-01'`).

## Cleanup
- No writes from OR; cleanup inherited from EC edge.

## Remaining unknowns
- OR callable readiness (trigger node type).
- Whether OR tolerates receiving the envelope without a separate DB re-read (it should — envelope carries the full context).
