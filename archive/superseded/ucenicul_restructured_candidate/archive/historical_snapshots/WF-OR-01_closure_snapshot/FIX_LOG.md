# Fix Log

## Stage
WF-OR-01

## Fix cycles

### Cycle 1 — initial activation pack
- Problem: the first `WF-OR-01` pack was documentary-only and lacked workflow blueprint, canonical SQL, Python logic port, and a heavy proof suite.
- Root cause: documentary activation solved the pointer problem, not implementation readiness, so too much work would have been rediscovered during live stage execution.
- Failure classification:
  - tool: n/a
  - failure_class: none
  - degraded_label: none
  - preset_used: reporting preset + runtime-proof preset
  - strategy_banned_now: no
- Fix applied:
  1. Added native workflow blueprints for `WF-OR-01`.
  2. Added node map, connection map, and import patch plan.
  3. Added canonical SQL pack under `workflows/sql/or/`.
  4. Added `workflows/scripts/or/or_logic.py`.
  5. Added an initial 500-test proof suite under `workflows/tests/or/test_families.py`.
  6. Executed the suite and persisted results.
- Verification:
  - live re-read: not yet applicable for this fix cycle
  - db check: not yet applicable for this fix cycle
  - runtime check: script-level only — **500 / 500 PASS**
  - snapshot_before_id: not yet created for this stage
  - snapshot_after_id: not yet created for this stage
  - rollback_source_if_any: not needed; all artifacts are additive on disk
- Outcome: PASS

### Cycle 2 — EC FLAT shape adaptation + required family rename + SQL contract probe
- Problem: the initial OR validator expected only a payload-wrapped EC success envelope, but the live `EC_Return_Result` node actually emits a FLAT shape (`id`/`tenant_id`/`thread_id`/`trigger_message_id` at top level with `status_kind` and `status` and no `payload` wrapper). The test suite also did not yet carry the canonical required family names, and there was no `01_schema_inspect.sql` probe.
- Root cause: contract was inferred from architecture docs before the live WF-EC-01 workflow shape was re-read; the heavy-tests contract had been delivered with stage-internal family names instead of the ones specified by the autonomous-executor directive.
- Failure classification:
  - tool: n/a
  - failure_class: contract_drift_between_stages
  - degraded_label: none
  - preset_used: reporting preset + runtime-proof preset
  - strategy_banned_now: no
- Fix applied:
  1. Rewrote `OR_Validate_EC_Result` in both `workflows/scripts/or/or_logic.py` and the live n8n JSON so it accepts **both** the wrapped envelope and the flat `EC_Return_Result` shape; the flat path synthesizes `idempotency_key` as `"{tenant_id}:{trigger_message_id}:exec_ctx:v1"` and defaults `ttl_seconds` to `900`, carrying explicit warnings into the handoff payload.
  2. Authored `workflows/sql/or/01_schema_inspect.sql` as a read-only `information_schema` probe to confirm the live `execution_contexts` columns, the `CHECK` constraint that permits `'initialized'`, and the global UNIQUE on `idempotency_key`.
  3. Rewrote `workflows/tests/or/test_families.py` to cover the canonical required family names — `input_validation`, `happy_path`, `invalid_input`, `replay_idempotency`, `cross_tenant_isolation`, `ec_to_or_handoff`, `node_payload_builder`, `node_result_formatter`, `sql_contract_validation`, `reporting_and_tooling_contract` — plus three supplementary families (`extract_handoff_input`, `error_payload_builder`, `blueprint_structure`) for a total of 13 families x 50 tests = 650 tests.
  4. Added a `FORBIDDEN_WRITE_PATTERNS` contract to the SQL family that rejects any write against `tasks`, `reminders`, `memory_items`, `rag_memories`, `messages`, or `public.execution_contexts` (the stage-safe `execution_contexts_claude_mcp` fallback is permitted).
  5. Added a `reporting_and_tooling_contract` family that asserts the closure report carries no false `CLOSED at 10/10` claim and that the route map shows `WF-OR-01 ACTIVE` with `WF-PL-01 PLANNED_NEXT`.
  6. Documented the n8n inline-interpolation deviation for `OR_Load_Execution_Context` in `workflows/WF-OR-01_IMPORT_PATCH_PLAN.md`, per the PostgreSQL binding policy in `docs/n8n_Workflow_Mapping.md` Section 5.
- Verification:
  - live re-read: still pending — this cycle was source-pack only
  - db check: still pending — this cycle was source-pack only
  - runtime check: script-level only — **650 / 650 PASS** (above the required 500-test / 10-family minimum)
  - snapshot_before_id: not yet created for this stage
  - snapshot_after_id: not yet created for this stage
  - rollback_source_if_any: not needed; all artifacts remain additive or replace superseded source-pack files only
- Outcome: PASS (script-level), live proof still pending before closure.

### Cycle 3 — V5 live FAIL: cross-tenant isolation gap in OR_Build_Handoff_Payload
- Problem: after live import, V1 (shell integrity), V2 (invalid input), V3 (happy path), V4 (replay stability) and V6-equivalent (upstream smoke handoff using FLAT EC_Return_Result shape) all PASSED end-to-end on the live engine against the real `public.execution_contexts` row. **V5 (cross-tenant isolation) FAILED on the live engine.** Probe input used the real `execution_id = a7ae786a-9f64-46b8-b02a-3df62080a8f7` with a bogus `tenant_id = bbbbbbbb-0000-0000-0000-000000000002`. The DB query correctly returned zero rows. `OR_Verify_Context_Match` correctly emitted `{_valid: 'false', error_code: 'CONTEXT_MISMATCH', missing_fields: ['execution_context']}`. However, `OR_Build_Handoff_Payload` ignored the `_valid` flag and unconditionally emitted `status_kind: 'success'`, `result_type: 'handoff'`, `allowed_next_stage: 'WF-PL-01'`, `planning_allowed: true`, with the literal string `"undefined"` coerced into every ID field (`tenant_id`, `thread_id`, `execution_id`, `trigger_message_id`, `idempotency_key`, `execution_status`). Downstream `WF-PL-01` would have received a poisoned green-light handoff from a cross-tenant probe. Execution ids: manual V2 = n8n execution `700`; production V3/V4/V5 = n8n executions `701`/`702`/`703`.
- Root cause: script-level harness covered this correctly via `run_full_pipeline` in `workflows/scripts/or/or_logic.py` (which routes `verification.ok == False` through `build_error_payload`), but the live n8n graph placed `OR_Verify_Context_Match` → `OR_Build_Handoff_Payload` directly with no Switch between them, and the live `OR_Build_Handoff_Payload` JS body did not mirror the Python guard. This is exactly the drift mode the autonomous-executor directive exists to catch: **script-level PASS ≠ live PASS**. It did not surface in the pure Python tests because `ec_to_or_handoff` tests invoke `run_full_pipeline`, not the raw `build_handoff_payload` against a `_valid: 'false'` shaped input.
- Failure classification:
  - tool: n/a (node-graph contract gap, not an MCP failure)
  - failure_class: cross_stage_isolation_breach_on_error_path
  - degraded_label: live_build_node_ignored_verify_flag
  - preset_used: reporting preset + runtime-proof preset
  - strategy_banned_now: no new strategy banned; `mcp__n8n__patch_workflow_nodes` remains banned and was not attempted; `SDK update_workflow(code)` remains banned and was not attempted. Per the user directive, fix is applied in the source JSON and the user will re-import.
- Fix applied:
  1. Hardened `OR_Build_Handoff_Payload.parameters.jsCode` in `workflows/WF-OR-01_Orchestrator_Input_Handoff.json` to a v1.2 fail-closed version that short-circuits on `$json._valid === 'false'` and returns the canonical error envelope `{status_kind: 'failed', result_type: 'error', module_name: 'orchestrator_input_handoff', error: {code: $json.error_code || 'CONTEXT_MISMATCH', message: $json.error_message || 'Context verification failed.', missing_fields: Array.isArray($json.missing_fields) ? $json.missing_fields : []}}`.
  2. Bumped `versionId` in the source JSON to `wf-or-01-source-pack-v1.2-fail-closed` so the re-import is distinguishable.
  3. Left `workflows/scripts/or/or_logic.py` untouched — `run_full_pipeline` already routes `CONTEXT_MISMATCH` to `build_error_payload`; the drift was live-n8n-only.
  4. Re-ran the 650-test harness against the patched source JSON: **650 / 650 PASS** in 0.37s (`blueprint_structure` family still confirms all 10 required nodes plus the connection shape).
  5. Updated `STATE.json` to `active_with_next_action`, score `8.5 / 10`, `hard_blockers` carrying the live re-run requirement, and the full live-runtime evidence block.
- Verification:
  - live re-read: patched source is on disk at `workflows/WF-OR-01_Orchestrator_Input_Handoff.json` (versionId `wf-or-01-source-pack-v1.2-fail-closed`). Live workflow still carries the v1.1 pre-fix `OR_Build_Handoff_Payload` body — re-import pending.
  - db check: post-test scan of `public.execution_contexts` on both the real and bogus tenants shows **zero new rows from any of executions 700–703**; WF-OR-01 remains live-confirmed read-only on the domain table.
  - runtime check: V1 / V2 / V3 / V4 / V6-equivalent = PASS on live engine. V5 = FAIL on live engine (documented above). Re-run after re-import will re-test V5 and V4-regression.
  - snapshot_before_id: n/a — shell was freshly created by user import rather than replaced.
  - snapshot_after_id: n/a — no live mutation applied in this cycle; source-only patch.
  - rollback_source_if_any: `wf-or-01-source-pack-v1` (pre-fix) still visible in git-equivalent on-disk history if needed.
- Outcome: SOURCE FIXED + AWAITING USER RE-IMPORT. Stage cannot close at 10/10 until the user re-imports the patched JSON and V5 re-runs PASS on the live engine.

## Next executable action
User re-imports `workflows/WF-OR-01_Orchestrator_Input_Handoff.json` (versionId `wf-or-01-source-pack-v1.2-fail-closed`) into the existing WF-OR-01 shell (`id = KhGmNpi0ZDmrnz8W`). Claude will then: (a) live-read OR_Build_Handoff_Payload to confirm the v1.2 guard is present, (b) re-run V5 cross-tenant probe, (c) re-run V4 replay as regression, (d) re-run the post-test DB drift check, (e) close at 10/10 or emit a new `BLOCKED_WITH_EVIDENCE` cycle.
