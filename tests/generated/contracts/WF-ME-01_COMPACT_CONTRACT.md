# COMPACT WORKFLOW CONTRACT — WF-ME-01

## Identity
- workflow_id: `WF-ME-01`
- workflow_label: Module Execution
- local_json: `workflows/WF-ME-01_Module_Execution/workflow/`
- live_workflow_id: `uq26nh1grIpnHju0`

## Contract sources
- `workflows/WF-ME-01_Module_Execution/docs/`
- `workflows/WF-ME-01_Module_Execution/scripts/me/me_logic.py`
- `workflows/WF-ME-01_Module_Execution/tests/test_families.py`
- `docs/architecture/Module_Spec_*.md` (per-module)

## Inputs
- required_inputs:
  - `execution_context_id`, `thread_id`, `user_id`, `idempotency_key`
  - `module_name` (e.g., `task_module` — only this is supported in live-capable mode)
  - `module_input{}` (module-specific)
- optional_inputs:
  - `priority`, `intent`, `entities`

## Core behavior
- route_rules:
  - `ME_Input` is an `executeWorkflowTrigger` (callable-ready).
  - Dispatches on `module_name`. Only `task_module` has a live-capable path; other module names return an error envelope with `status_kind='failure'`.
  - `task_module` supports `action ∈ { create, update, complete, delete }`.
- output_contract:
  - `ME_Return_Result` envelope: `module_name`, `module_result{ status_kind, result_type, payload, error? }`, `domain_writes_performed[]`, `allowed_next_stage='WF-RA-01'`.

## Persistence
- db_touchpoints:
  - reads `execution_contexts`
  - writes `tasks` (create / update / complete / delete) when `module_name='task_module'`
- required_db_assertions:
  - create → one row inserted with `origin='claude_test'`.
  - update → target row mutated.
  - complete → `completed_at IS NOT NULL`.
  - delete → row removed or `deleted_at` set.
  - retry with same `idempotency_key` does not double-insert.

## Notes
- inferred_fields_present: yes — callable-ready, prior 650/650 PASS + closure 10/10.
- unresolved_items:
  - `test_families.py` fresh run 2026-04-19: AssertionError "Expected SQL files" — test harness expects `sql/` files that are not present in current layout.
  - Non-`task_module` modules are stubbed (contract declares failure envelope, which is correct).
  - ME is already callable — no refactor needed for Phase 3 connector activation.
