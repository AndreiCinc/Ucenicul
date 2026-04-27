# Fix Log

## Stage
WF-ME-01 — **CLOSED at 10/10** on `wf-me-01-source-pack-v1.3-cross-tenant-guard`. Live V1–V5 PASS (execs 729/730/731/732/733). V6 zero DB drift.

## Fix cycles

### Cycle 1 — initial source-pack application (WF-ME-01)
- Problem: `WF-ME-01` had no materialized stage artifacts on disk.
- Action: applied user-provided `wf-me-01_full_source_pack.zip` (34 files, SHA256 verified) into canonical paths: `workflows/WF-ME-01_Module_Execution.json`, `workflows/sql/me/` (12 files), `workflows/scripts/me/me_logic.py`, `workflows/tests/me/test_families.py`, `workflows/WF-ME-01_{blueprint.json,NODE_MAP.md,CONNECTION_MAP.md,IMPORT_PATCH_PLAN.md,TEST_MATRIX.md}`, and per-stage docs under `docs/ucenicul_claude_handoff_hardened/`.
- Result: PASS (source present)
- Script harness: `python3 workflows/tests/me/test_families.py` — **650 / 650 PASS** (13 families × 50 tests).

### Cycle 1b — source completion (pre-import transparency) (WF-ME-01)
- Problem: on inspection of `workflows/WF-ME-01_Module_Execution.json`, all 8 code-node `jsCode` bodies were empty stubs (`// comment\nreturn items;`). Switch expressions downstream of the Postgres nodes referenced `$json.step.*`, which would fail at runtime because after a Postgres node in n8n `$json` is the DB row, not upstream data. The validator also lacked the canonical chat-input JSON.parse adapter preamble mandated as carry-forward from WF-PL-01 / WF-DI-01.
- Failure classification:
  - tool: n/a (pre-import source inspection)
  - failure_class: skeleton_shell_would_fail_live
  - degraded_label: source_skeleton
  - strategy_banned_now: no
- Action: performed source-completion port of `workflows/scripts/me/me_logic.py` into the n8n code nodes, strictly bounded by WF-ME-01 scope lock:
  - ported `validate_dispatch_envelope` into `ME_Validate_Dispatcher_Result` with chat-adapter preamble
  - ported `build_task_{create,list,update,complete,delete}_result` into 5 task-action code nodes
  - wrote `ME_Return_Error` and `ME_Return_Result` canonical envelope builders
  - corrected switch expressions (`ME_Route_Module_Name`, `ME_Route_Task_Action`) to reference validator via `$('ME_Validate_Dispatcher_Result').first().json.step`
  - corrected `ME_Load_Task_Candidates.queryReplacement` to reference validator
  - retained parameterized `$1/$2/$3` Postgres policy per `n8n_Workflow_Mapping.md` §5
  - credential kept as `CREDENTIAL_PLACEHOLDER` with name `Postgres account 2` (same pattern as WF-DI-01)
  - bumped `versionId` to `wf-me-01-source-pack-v1.0-completed`
- Topology preservation: 15 nodes / 20 edges (verified programmatically).
- Result: PASS (JSON valid; topology preserved; all jsCode real; switch expressions cross-Postgres-safe; logic faithful to me_logic.py which is 650/650 green)
- Score-cap: 8.5/10 until live V1–V6 runtime proof on imported shell.

### Cycle 2 — Switch-node typeVersion-3.2 format fix (live-defect repair) (WF-ME-01)
- Problem: live re-read after user import of v1.0-completed confirmed all 8 jsCode bodies, Postgres credential resolution (`Postgres account 2` → `z9nKgToNWvIW7P8f`), `alwaysOutputData: true`, and `queryReplacement` all landed correctly. However, all 3 switch nodes (`ME_Route_Valid`, `ME_Route_Module_Name`, `ME_Route_Task_Action`) had their rules silently stripped on import, collapsing each to a single empty placeholder condition. Live connection count fell from 20 → 13 (7 branches dropped). Root cause: source pack used switch-`typeVersion: 3` with the legacy `conditions.string[]` (`value1/value2/operation`) shape; n8n's live switch at `typeVersion: 3` rejects that shape and rewrites the node to an empty placeholder. The known-good live shape (from WF-DI-01, closed 10/10) is `typeVersion: 3.2` with `rules.values[].conditions.conditions[]` using `leftValue/rightValue/operator.{type,operation}` and `options.fallbackOutput: "extra"` on the parent.
- Failure classification:
  - tool: n/a (live-import runtime schema mismatch)
  - failure_class: n8n_switch_schema_mismatch
  - degraded_label: switch_legacy_format
  - strategy_banned_now: no
  - carry-forward lesson: "script PASS ≠ live PASS" — same category as WF-DI-01 Cycle 2 chat-adapter defect.
- Action: rewrote all 3 switch nodes to mirror WF-DI-01's live-known-good `typeVersion: 3.2` shape.
  - `ME_Route_Valid`: 2 explicit rules (`_valid == 'true'` → output 0 `valid`; `_valid == 'false'` → output 1 `invalid`); fallback at output 2 (unused safety net).
  - `ME_Route_Module_Name`: 1 rule (`step.module_name == 'task_module'` → output 0); fallback at output 1 → `ME_Return_Error` (drives `UNSUPPORTED_MODULE`).
  - `ME_Route_Task_Action`: 5 rules on `step.inputs.action` (create_task/list_tasks/update_task/complete_task/delete_task → outputs 0–4); fallback at output 5 → `ME_Return_Error` (drives `UNSUPPORTED_ACTION`). Removed the legacy `|| 'create_task'` OR-default on rule 0 so missing actions fall through to the canonical error path rather than silently routing to create_task.
  - Bumped `typeVersion: 3 → 3.2` on all 3 switches.
  - Connections block preserved intact (20 edges); output-index mapping verified end-to-end.
  - Bumped `versionId`: `wf-me-01-source-pack-v1.0-completed` → `wf-me-01-source-pack-v1.1-switch-format-fix`.
- Topology preservation: 15 nodes / 20 edges — byte-identical at the graph level to Cycle 1b.
- Script harness re-run post-patch: **650 / 650 PASS** unchanged (the harness does not exercise n8n switch shape; pass is expected and confirms no collateral damage to Python canonical logic or jsCode ports).
- Scope: within WF-ME-01 scope lock — live-runtime compatibility fix on the same stage; no downstream-stage work.
- Result: PASS at source level. Live V1–V6 re-run PENDING on v1.1-switch-format-fix.
- Score-cap: 8.5/10 until live V1–V6 runtime proof on the patched shell.

### Cycle 3 — chatTrigger harness enablement
- Problem: live re-read of v1.1 confirmed all 3 switches retained rules intact (2/1/5) and connection count was 20, but MCP `execute_workflow` required a Schedule/Webhook/Form/Chat trigger and the pack shipped only `executeWorkflowTrigger` + `manualTrigger`.
- Action: added `@n8n/n8n-nodes-langchain.chatTrigger` (typeVersion 1.1) wired to `ME_Validate_Dispatcher_Result`. No stage logic added; the existing chat-input adapter preamble on the validator consumes `chatInput` identically. Mirrors WF-DI-01 pattern exactly.
- Topology delta: 15 → 16 nodes, 20 → 21 edges.
- `versionId`: `wf-me-01-source-pack-v1.1-switch-format-fix` → `wf-me-01-source-pack-v1.2-chat-trigger-added`
- Result: PASS. Live V1-V4 subsequently green on v1.2 (execs 723-726). V5 on v1.2 (exec 727) surfaced the cross-tenant isolation gap (see Cycle 4).

### Cycle 4 — Cross-tenant isolation guard (live-defect repair)
- Problem: V5 on v1.2 (exec 727) demonstrated that a request with spoofed `tenant_id` against an EC owned by a different tenant produced a success `module_result` with the spoofed tenant_id. Root cause: Postgres Load_EC filter correctly returned `{}` on tenant mismatch, but `alwaysOutputData: true` (required for fail-closed-empty-task-set semantics downstream) forwarded the empty row, and Route_Module_Name / Route_Task_Action switch on the validator envelope (not the EC row), so the flow proceeded through `ME_Task_Create_Result` which built a success envelope with the validator's spoofed tenant_id. Same defect class as WF-OR-01 Cycle 2.
- Failure classification: `cross_tenant_isolation_missing_in_n8n_shell` / `context_match_ungated`. Not catchable by Python harness because the defect lives in n8n's row-passthrough + downstream-route-on-validator combination.
- Action: inserted a minimal 2-node fail-closed gate between `ME_Load_Execution_Context` and `ME_Load_Task_Candidates`:
  - `ME_Check_Context_Match` (code, typeVersion 2): reads EC row from `$json` and validator envelope from `$('ME_Validate_Dispatcher_Result').first().json`; asserts `ecRow.id` present, `ecRow.tenant_id === env.tenant_id`, `ecRow.thread_id === env.thread_id`, and `String(ecRow.id) === String(env.execution_context_id)`. On failure emits `{_context_ok:'false', error_code:'CONTEXT_MISMATCH', error_message, missing_fields:[], details:{expected_*, found_*}}`. On success passes through `{_context_ok:'true', ...ecRow}`.
  - `ME_Route_Context_OK` (switch, typeVersion 3.2, canonical shape): 1 rule `{{ $json._context_ok }} == 'true'` → output 0 (outputKey `context_ok`, → `ME_Load_Task_Candidates`); `options.fallbackOutput: "extra"` → output 1 → `ME_Return_Error`. `ME_Return_Error.jsCode` already discriminates `CONTEXT_MISMATCH` from `$json.error_code` — no code-node changes needed elsewhere.
  - Connection rewiring: removed `ME_Load_Execution_Context → ME_Load_Task_Candidates`; added `ME_Load_Execution_Context → ME_Check_Context_Match → ME_Route_Context_OK → {output 0: ME_Load_Task_Candidates, output 1: ME_Return_Error}`.
  - `versionId`: `wf-me-01-source-pack-v1.2-chat-trigger-added` → `wf-me-01-source-pack-v1.3-cross-tenant-guard`.
- Topology delta: 16 → 18 nodes, 21 → 24 edges. Mirrors WF-OR-01 Cycle 2 insertion pattern.
- Script harness re-run: **650 / 650 PASS** unchanged.
- Result: PASS. Live V1–V5 on v1.3: all PASS (execs 730/731/732/733/729). V6 on v1.3: zero DB drift (ec_hash `ed9487e781cfc75856228f052cbf3a15`, tasks_hash `08b959749b4ce167e1ff42dcd24ea0f3`, identical pre- and post-).
- Closure: **WF-ME-01 closed at 10/10 on v1.3-cross-tenant-guard**.

## Prior stages (summary, archived)
- WF-OR-01, WF-PL-01, WF-DI-01, WF-ME-01 — each closed at 10/10. See per-stage `FIX_LOG__<STAGE>.md` / `CLOSURE_REPORT__<STAGE>.md` files and archived closure evidence.
