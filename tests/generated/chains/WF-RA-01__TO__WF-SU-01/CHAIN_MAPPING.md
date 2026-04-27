# CHAIN_MAPPING — WF-RA-01 → WF-SU-01

## Decision
- decision_code: `EDGE_CONFIRMED_AS_CANONICAL`
- edge_type: `primary`
- precedence_basis: live `allowed_next_stage='WF-SU-01'` emitted by `RA_Build_Downstream_Envelope` + `SU_Input` is `executeWorkflowTrigger` (callable-ready).
- connector_state_in_live: **none** (source has no `Execute Workflow` out, but target is callable).
- supersedes_prior_classification: Prior ledger listed this edge as **side-effect**; live evidence demonstrates it is the **primary** handoff from RA. The ledger has been corrected.

## Live evidence
- `WF-RA-01`: `RA_Build_Downstream_Envelope` emits `allowed_next_stage='WF-SU-01'`. `RA_Input` is `executeWorkflowTrigger`.
- `WF-SU-01` (`ENiYNfL3ul8AmmCB`): `SU_Input` is `executeWorkflowTrigger` (**callable-ready**). `SU_Build_Downstream_Envelope` emits `allowed_next_stage='WF-RC-01'`, `response_generation_allowed=true`.

## Connector plan
- mechanism: `Execute Workflow` (synchronous).
- source node to add: `RA_Dispatch_To_SU_01_SUBCALL` after `RA_Build_Downstream_Envelope`; gated by `allowed_next_stage === 'WF-SU-01'`.
- target entry: already `SU_Input` executeWorkflowTrigger — no refactor needed.

## Field mapping (source → target)
| Source field (`RA_Build_Downstream_Envelope`) | Target field (`SU_Input`) | Transform | Default | Required | Notes |
|---|---|---|---|---|---|
| `execution_context_id` | `execution_context_id` | pass-through | — | yes | |
| `thread_id` | `thread_id` | pass-through | — | yes | |
| `user_id` | `user_id` | pass-through | — | yes | |
| `idempotency_key` | `idempotency_key` | pass-through | — | yes | |
| `aggregated_result.status_kind` | `aggregated_result.status_kind` | pass-through | — | yes | rolled-up module outcomes |
| `aggregated_result.result_type` | `aggregated_result.result_type` | pass-through | — | yes | |
| `aggregated_result.payload` | `aggregated_result.payload` | pass-through | `{}` | yes | |
| `domain_writes_requested[]` | `write_classes[]` | 1:1 map to SU write classes | `[]` | no | drives SU write routing |
| `memory_updates[]` | `memory_updates[]` | pass-through | `[]` | no | rag_memories, etc. |
| `allowed_next_stage='WF-SU-01'` | `gate_check` | assert | — | yes | |

## DB assertions (on synthetic chain run)
- SU is the write-heavy workflow. For each `write_class` present:
  - `execution_contexts` — update timestamps / status; row count unchanged.
  - `threads` — upsert thread record or update `last_message_at`.
  - `tasks` — create / update / complete / delete per aggregated intent.
  - `reminders` — insert if reminder requested.
  - `messages` — insert message record if applicable.
  - `rag_memories` — insert memory rows if memory_updates present.
- All writes carry `origin='claude_test'` and `test_run_id='run_2026-04-19_autonomous_test_e2e'`.

## Cleanup
```sql
DELETE FROM rag_memories   WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';
DELETE FROM messages       WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';
DELETE FROM reminders      WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';
DELETE FROM tasks          WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';
DELETE FROM threads        WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';
DELETE FROM execution_contexts WHERE test_run_id = 'run_2026-04-19_autonomous_test_e2e';
```

## Remaining unknowns
- Exact SU JS write-class routing (live uses JS scripts, not Python).
- Whether SU reads `execution_contexts` before writing, or trusts the envelope.
