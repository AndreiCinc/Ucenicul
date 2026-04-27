# 10_STAGE_WF-RA-01 — Result Aggregator

## Stage identity
- Stage code: WF-RA-01
- Stage name: Result Aggregator
- Upstream stage: WF-ME-01
- Downstream stage: WF-SU-01
- Status: CLOSED (live_closed)
- Score: 10 / 10 (full live E2E)
- Closure cycle: Cycle 5 (user-assisted pinData path, executions 736/737/738)

## Mission
Aggregate one canonical batch of `module_result` objects into one canonical `aggregated_result`
without executing new business logic, without composing a user response, and without claiming
state-update ownership.

## Strict stage scope
WF-RA-01 must:
1. accept canonical successful module-result batches from WF-ME-01 or the ME fan-in layer
2. validate aggregation preconditions and guard flags
3. validate tenant / execution_context / thread alignment across results
4. compute canonical rollup status and summary
5. preserve step-level evidence and follow-up requests
6. return exactly one canonical `aggregated_result`
7. fail closed on invalid envelope / mismatched context / malformed module results

WF-RA-01 must NOT:
- execute modules
- perform domain writes
- promote memory
- compose final user response
- invent missing module results
- bypass tenant scoping
- skip failed results silently

## Canonical input contract
Top-level required fields:
- `status_kind = success`
- `result_type = module_batch`
- `execution_context_id`
- `thread_id`
- `tenant_id`
- `aggregation_input`

`aggregation_input` required fields:
- `aggregation_allowed = true`
- `response_generation_allowed = false`
- `module_execution_completed = true`
- `domain_writes_performed = false`
- `module_results` (non-empty list)
- `expected_step_ids` (non-empty list)

Each `module_result` must contain:
- `module_name`
- `step_id`
- `result_type`
- `status`
- `summary`
- `actions_executed`
- `artifacts`
- `observations`
- `proposals`
- `confidence`
- `needs_followup`
- `followup_requests`

Permitted statuses:
- success
- partial
- failed
- no_action

## Canonical output contract
Success:
- `status_kind = success`
- `result_type = aggregated_result`
- `execution_context_id`
- `thread_id`
- `tenant_id`
- `aggregated_result`
- `state_update_allowed = true`
- `response_generation_allowed = false`
- `domain_writes_performed = false`
- `allowed_next_stage = WF-SU-01`

Error:
- `status_kind = error`
- `result_type = aggregation_error`
- canonical error object

## Rollup semantics
- all `success` => rollup `success`
- any `failed` with any non-failed => rollup `partial`
- all `failed` => rollup `failed`
- any `partial` and no `failed` => rollup `partial`
- all `no_action` => rollup `no_action`

## Required DB reads
- execution_contexts by `execution_context_id + tenant_id`
- optional plan metadata by `execution_context_id` where live shell needs step cross-check

## Required DB writes
None in WF-RA-01.

## V1–V6 target
- V1 shell integrity
- V2 invalid aggregation input
- V3 happy path single + parallel aggregation
- V4 malformed module result / missing step coverage
- V5 cross-tenant / context mismatch fail-closed
- V6 DB drift verification (read-only)

## Acceptance posture
This pack is **live-closed**. V1–V6 are all live-verified; V3/V4/V5 have full E2E live proof through the n8n shell (executions 736/737/738, Cycle 5). DB drift 0/0/0/0/0 after closure. Advance to WF-SU-01 is allowed.
