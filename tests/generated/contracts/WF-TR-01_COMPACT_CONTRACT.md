# COMPACT WORKFLOW CONTRACT — WF-TR-01

## Identity
- workflow_id: `WF-TR-01`
- workflow_label: Thread Resolver
- local_json: `workflows/WF-TR-01_Thread_Resolver/workflow/`
- live_workflow_id: `wI8hpSROxQI0zC9f`

## Contract sources
- `workflows/WF-TR-01_Thread_Resolver/docs/` (per-WF contract docs)
- `workflows/WF-TR-01_Thread_Resolver/tests/fixtures/` (16 fixture vectors TC-01..TC-16)
- `docs/architecture/Thread_Resolution.md` (architecture P3)

## Inputs
- required_inputs:
  - `user_message.text` (string)
  - `user_message.origin` (string, e.g. `"telegram"`)
  - `user_message.user_id` (uuid)
  - `user_message.external_message_id` (string)
- optional_inputs:
  - `user_message.language_hint`
  - `thread_context.external_chat_id`
  - `thread_context.thread_id` (if resumption)

## Core behavior
- route_rules:
  - If `thread_context.thread_id` present and active → `is_new_thread=false`, attach to existing thread.
  - Else apply thread-resolution heuristics (recency, sender match, origin) → choose or create thread.
  - Write one audit row in `thread_resolution_audit` with decision reason.
- output_contract:
  - Emit envelope: `thread_resolution{ thread_id, is_new_thread, decision_reason }`, `user_message{...}`, `meta{ module_name:'thread_resolver', result_type:'state' }`.
  - No `allowed_next_stage` emitted (terminal for TR in current live layout; downstream handoff is via architectural contract).

## Persistence
- db_touchpoints:
  - reads `messages`, `threads`
  - writes `thread_resolution_audit`
- required_db_assertions:
  - exactly one audit row inserted per invocation; `origin='claude_test'`, `test_run_id` set.
  - no duplicate `thread_resolution_audit` row when the same `external_message_id` is retried.

## Notes
- inferred_fields_present: yes — contract derived from fixtures + architecture spec; live TR-01 JSON captured in Phase 1.
- unresolved_items:
  - `tr_logic.py` does not yet exist (Python mirror of node logic); tests rely on fixtures directly.
  - `MIGRATION_messages_for_WF-TR-01.sql` pending application.
  - No `Execute Workflow` connector out (canonical edge TR→EC not active).
