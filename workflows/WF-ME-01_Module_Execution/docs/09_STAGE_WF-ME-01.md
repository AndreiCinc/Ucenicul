# 09_STAGE_WF-ME-01 — Module Execution

> **Lifecycle note.** This stage contract originated as the pre-live source-pack document.
> It is retained here as the canonical scope/contract reference, but the latest supplied
> lifecycle evidence closes WF-ME-01 at 10/10 on the `wf-me-01-source-pack-v1.3-cross-tenant-guard` shell.


## Stage identity
- Stage code: WF-ME-01
- Stage name: Module Execution
- Upstream stage: WF-DI-01
- Downstream stage: WF-RA-01
- Status: CLOSED_AT_10_OF_10 (latest supplied closure evidence)
- Score cap before live proof: 8.5 / 10

## Mission
Execute a single canonical dispatcher envelope and return exactly one canonical `module_result`
without crossing module boundaries, without composing a user response, and without claiming
aggregator semantics.

## Strict stage scope
WF-ME-01 must:
1. accept canonical successful dispatch envelopes from WF-DI-01
2. validate execution preconditions and guard flags
3. route by `module_name`
4. execute the selected module path
5. return one canonical `module_result`
6. fail closed on invalid envelope / unsupported module / unsupported action / tenant mismatch

WF-ME-01 must NOT:
- aggregate module results
- compose final user response
- call modules from modules
- skip dispatcher guards
- invent planner outputs
- bypass tenant scoping
- claim downstream persistence or memory promotion ownership

## Initial live-capable scope
This source pack enables **task_module first**.

Explicitly supported in live-capable mode:
- `task_module.create_task`
- `task_module.list_tasks`
- `task_module.update_task`
- `task_module.complete_task`
- `task_module.delete_task`

Explicitly unsupported in this stage version:
- `reminder_module`
- `memory_module`
- `improvement_module`
- `watcher_module_basic`
- `response_module`

Unsupported modules must fail closed with canonical `UNSUPPORTED_MODULE`.

## Canonical input contract
Top-level required fields:
- `status_kind = success`
- `result_type = dispatch`
- `execution_context_id`
- `thread_id`
- `tenant_id`
- `dispatcher_input`

`dispatcher_input` required fields:
- `dispatch_allowed = true`
- `module_execution_started = false`
- `response_generation_allowed = false`
- `domain_writes_performed = false`
- `step`

`step` required fields:
- `step_id`
- `module_name`
- `purpose`
- `inputs`
- `execution_mode`

## Canonical output contract
Success:
- `status_kind = success`
- `result_type = module_result`
- `execution_context_id`
- `thread_id`
- `tenant_id`
- `module_result`
- `module_execution_started = true`
- `domain_writes_performed = false` in pre-write/off-node mode
- `response_generation_allowed = false`

Error:
- `status_kind = error`
- `result_type = module_error`
- canonical error object

## Required DB reads
- execution_contexts by `execution_context_id + tenant_id`
- task candidates by `tenant_id + task_id/title_match` where relevant

## Required DB writes
Allowed only inside task_module action paths:
- create task
- update task
- complete task
- delete task

No writes are allowed outside the selected task action path.

## V1–V6 target
- V1 shell integrity
- V2 invalid dispatch input
- V3 happy path task create/list/update/complete/delete
- V4 unsupported module fail-closed
- V5 cross-tenant / context mismatch fail-closed
- V6 DB drift and write-scope verification

## Acceptance posture
This pack is pre-live only.
Closure requires live import, live runtime proof, and post-test DB drift verification.