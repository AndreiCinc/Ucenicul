# Fix Log

## Stage
WF-DI-01

## Fix cycles

### Cycle 1 — initial source-pack creation
- Problem: `WF-DI-01` had no dedicated dispatcher stage pack.
- Root cause: stage not yet materialized after `WF-PL-01` closure.
- Failure classification:
  - tool: n/a
  - failure_class: none
  - degraded_label: none
  - strategy_banned_now: no
- Fix applied:
  1. Added stage docs for `WF-DI-01`.
  2. Added workflow blueprints, node map, connection map, and import patch plan.
  3. Added canonical SQL pack.
  4. Added Python logic port.
  5. Added a 650-test suite and persisted results.
- Verification:
  - runtime check: script-level only — **650 / 650 PASS**
- Outcome: PASS (script-level)

### Cycle 2 — live V1 chat-adapter defect
- Problem: Live V1 happy path (exec 715) on the user-imported v1.0 shell rejected a valid plan envelope with `error_code: INVALID_HANDOFF_INPUT` and `missing_fields: [status_kind, result_type, payload]`.
- Root cause: `DI_Validate_Plan_Result.jsCode` used `const candidate = $json;` with no chat-trigger adapter. The n8n chat trigger delivers payloads wrapped as `{sessionId, action, chatInput: "<json string>"}`, so the validator saw the wrapper object instead of the parsed plan envelope. Same pattern class as WF-PL-01 Cycle 2.
- Failure classification:
  - tool: n/a (live runtime only — no banned tool invoked)
  - failure_class: validator_chat_adapter_missing
  - degraded_label: v1_0_shell_chat_input_not_parsed
  - strategy_banned_now: no (no ban triggered)
- Fix applied (smallest-possible, source-only):
  1. Edited only `DI_Validate_Plan_Result.jsCode` in `workflows/WF-DI-01_Dispatcher.json`.
  2. Prepended the chat-input adapter used in WF-PL-01's `PL_Validate_OR_Handoff`:
     ```js
     const input = $json;
     let candidate = input;
     if (input && typeof input.chatInput === 'string' && !input.payload && !input.status_kind) {
       try { candidate = JSON.parse(input.chatInput); } catch (e) { candidate = input; }
     }
     ```
  3. Bumped top-level `versionId` from `wf-di-01-source-pack-v1` to `wf-di-01-source-pack-v1.1-chat-adapter-fix`.
  4. Preserved: 13 nodes, 13 edges, both triggers, credential id `z9nKgToNWvIW7P8f` / `Postgres account 2`, switch routes `_valid` and `_context_ready`, `DI_Load_Execution_Context.alwaysOutputData: true`. Zero topology changes.
  5. No other node's jsCode, parameters, position, or credentials were touched.
- Verification:
  - static JSON parse: PASS
  - script-level harness unaffected: **650 / 650 PASS**
  - live runtime proof: deferred to Cycle 3
- Outcome: FIX_READY

### Cycle 3 — live V1–V6 on v1.1 shell
- User re-imported v1.1 JSON. Live re-read confirmed chat adapter present in `DI_Validate_Plan_Result.jsCode`; topology, triggers, credential, switch routing, and `alwaysOutputData` preserved.
- Verification (all live):
  - **V1 happy path (exec 716): PASS** — terminal `DI_Return_Result`, `status_kind: success`, `result_type: dispatch`, `dispatch_id: dispatch:plan-di-v1-happy-001:v1`, `allowed_next_stage: WF-ME-01`, `dispatch_guard.dispatch_allowed: true`, all other guard flags false.
  - **V2 invalid handoff input (exec 717): PASS** — non-JSON `chatInput: "hello world not json"` → adapter's try/catch falls back to raw wrapper → validator rejects with `INVALID_HANDOFF_INPUT` missing `[status_kind, result_type, payload]` → `DI_Return_Error`.
  - **V3 invalid plan (exec 718): PASS** — envelope with `dispatcher_input.dispatch_allowed: false` → validator rejects with `INVALID_PLAN` missing `[payload.dispatcher_input.dispatch_allowed]` → `DI_Return_Error`.
  - **V4 replay idempotency (exec 719): PASS** — replay of V1 envelope produced identical `dispatch_id`, identical `ready_groups`, identical per-step idempotency key `pl-fixture-v1-happy:s001:dispatch:v1`. Dispatcher is deterministic and read-only; no DB writes on replay.
  - **V5 cross-tenant isolation (exec 720): PASS** — `tenant_id: ffffff99-...` + canonical `execution_id` → DB query returned empty (no row match under WHERE tenant_id + execution_id + thread_id) → `DI_Verify_Context_Match` fail-closed with `CONTEXT_MISMATCH`. `alwaysOutputData: true` on the Postgres node was essential so downstream nodes fired on empty result set.
  - **V6 DB drift: PASS** — `public.execution_contexts` pre-test count 2, post-test count 2; pre-test hash `985d6ef34955abe59117ce7d6ff76f12`, post-test hash `985d6ef34955abe59117ce7d6ff76f12` (identical). Zero drift as the read-only stage contract requires.
- Outcome: **CLOSED AT 10/10**

## Next executable action
Activate WF-ME-01 (Module Execution). Create/apply source pack, run script harness, guide user through n8n import, run live V1–V6, verify DB drift, then close or emit BLOCKED_WITH_EVIDENCE. Carry forward the chat-adapter preamble pattern into every stage-entry validator by default.
