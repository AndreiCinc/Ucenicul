# Fix Log

## Stage
WF-EC-01

## Fix cycle
4

---

## Cycle 1 (historical)

### Problem
The only observed workflow write path for the active stage required SDK-style code and did not safely persist native n8n workflow structure.

### Root cause
The available write surface accepted raw native n8n JSON as "valid" but did not materialize a real node graph, creating false-success behavior and making the path unsafe for shell-preserving workflow updates.

### Failure classification
- tool: workflow update surface
- failure_class: F2 false success
- degraded_label: unsafe_for_current_stage
- preset_used: MCP / SDK degraded-path preset
- strategy_banned_now: yes

### Fix applied
1. Stopped the failing SDK exploration path.
2. Preserved the live `WF-EC-01` shell unchanged.
3. Reclassified the stage as `BLOCKED_WITH_EVIDENCE`.
4. Hardened the state/report outputs so the blocked stage remains handoff-safe.

### Verification
- live re-read: confirmed shell still exists and was not damaged
- db check: confirmed `execution_contexts` remains usable and unchanged by this fix cycle
- runtime check: not applicable because no persisted workflow implementation exists yet
- snapshot_before_id: `snapshot_WF-EC-01_before_2026-04-17_build_probe`
- snapshot_after_id: `snapshot_WF-EC-01_after_2026-04-17_build_probe`
- rollback_source_if_any: not needed; no destructive write persisted

### Outcome
PASS

---

## Cycle 2 (historical — additive work)

### Problem
Cycle 1 left the stage at `BLOCKED_WITH_EVIDENCE` at score 7.5, but a substantial amount of non-blocked work remained undone: the native blueprint was not on disk, canonical SQL was not authored, node-level jsCode was not independently provable off-node, and no ≥30-tests-per-family proof suite existed. Without these, a future holder of a verified native JSON write surface would have to re-derive the stage from scratch.

### Root cause
Prior work had conflated "no verified live write surface" with "nothing else to do". In fact, everything upstream of live import — JSON authoring, SQL canonicalization, node-logic portability, script-level proofs — is independent of the live write surface and could be completed and verified without it.

### Failure classification
- tool: n/a (this cycle is additive work, not a failed call)
- failure_class: none
- degraded_label: n/a
- preset_used: n/a
- strategy_banned_now: no (the SDK ban from cycle 1 remains in force)

### Fix applied
1. Authored the canonical native n8n blueprint JSON at `workflows/WF-EC-01_Execution_Context.json` (with duplicate at `workflows/WF-EC-01_blueprint.json`).
2. Authored node map, connection map, and import/patch plan documents.
3. Authored canonical SQL: schema inspect, upsert, load, fixtures create, fixtures cleanup, behavior probe.
4. Ported EC node jsCode to pure Python at `workflows/scripts/ec/ec_logic.py` (validation, payload builder, result shaper, error shaper).
5. Built a 300-test harness at `workflows/tests/ec/test_families.py` covering 10 families × 30 tests: input_validation, happy_path, idempotency, cross_tenant, tr_ec_handoff, node_validation, node_payload_builder, node_result_formatter, node_error_formatter, tooling_reporting.
6. Executed the harness and persisted `results.json` and `results.md`.

### Verification
- script-level test execution: **300 / 300 pass**; `workflows/tests/ec/results/results.md` shows zero failures across all 10 families
- structural asserts against blueprint JSON (via harness): 8 nodes present, switch `dataType=boolean`, `alwaysOutputData: true` on both Postgres nodes, `availableInMCP: true`
- SQL canonical text present and correctly parameterized (verified by harness content checks)
- Python port of node logic exercised directly across 120 contract tests (4 node jsCode functions × 30 each)
- live re-read: shell unchanged, workflow id `v9jih4jqeXpOJOiH` stable
- db check: `execution_contexts` unchanged by this cycle (no fixtures were persisted; only SQL text was authored)
- runtime check: still not applicable at live-workflow layer (requires native JSON write surface)
- snapshot_before_id: `snapshot_WF-EC-01_after_2026-04-17_build_probe`
- snapshot_after_id: `snapshot_WF-EC-01_after_2026-04-17_script_proofs`
- rollback_source_if_any: not needed; all artifacts are additive on-disk files

### Outcome
PASS (script-level); live runtime remains blocked by absence of a verified native JSON write surface.

### Post-cycle observation
During this cycle a secondary schema issue was also discovered and patched: `public.messages.organization_id` is NOT NULL. The initial `10_fixtures_create.sql` omitted it and the whole batch rolled back. The SQL was patched to inherit `organization_id` from the owning tenant via subquery. This patch was verified by running the fixture insert live in cycle 3 (pre-cleanup).

---

## Cycle 3 (current — live runtime verification + switch routing fix)

### Problem
After the user manually imported the on-disk blueprint JSON into the live shell via the n8n UI (the only verified write surface for this stage), the initial end-to-end invalid-input probe (execution 686) did not reach `EC_Return_Error`. The switch node (`EC_Route_Valid`) emitted `main: [[], []]` — both outputs empty — so the graph never selected either branch.

### Root cause
Switch node (`n8n-nodes-base.switch` v2) was configured with `dataType: "boolean"` but `value1` was authored as an expression that evaluates to a real boolean (`=={{ $json._valid === "true" || $json._valid === true }}`), while the rules' `value2` were stored as strings `"true"`/`"false"`. Under n8n's strict boolean↔string comparison when `dataType=boolean`, this pairing (a real boolean on the left, a string on the right) matches neither rule, so the switch drops the item on both outputs.

The script-level test suite did NOT catch this because those tests exercised `EC_Validate_Input`'s pure logic (does it emit `_valid: "false"` when tenant_id is missing?) — they did NOT exercise the live switch's routing semantics. This is the kind of bug that only surfaces at live runtime.

### Failure classification
- tool: n8n switch node (v2) configuration
- failure_class: F4 hidden routing drop (engine-specific comparison semantics mismatch)
- degraded_label: not_reproduced_at_script_level
- preset_used: n/a (live runtime probe)
- strategy_banned_now: no — the correct pattern (`value1` emits string, `dataType=boolean` coerces) is documented and on-disk

### Fix applied
1. Attempted 3 variants of programmatic patch via `mcp__n8n__patch_workflow_nodes`:
   - `replace` op on the parameters object → rejected: "replace target is not a string"
   - `set` op with dotted paths → rejected: `request/body/settings must NOT have additional properties`
   - `set` op with `assignTop` wrapper → rejected: `request/body/nodes/3 must NOT have additional properties`
   - Conclusion: n8n's PUT validator rejects top-level fields that the GET response carries (e.g., `timeSavedMode`, `alwaysOutputData`, `notes`), making the current `patch_workflow_nodes` tool unsafe for this stage.
2. User performed the fix in the n8n UI: changed `EC_Route_Valid.value1` from `"={{ $json._valid === \"true\" || $json._valid === true }}"` to `"={{ $json._valid }}"`. With `dataType=boolean`, n8n now coerces the string `"true"`/`"false"` and matches the correct rule.
3. Claude mirrored the fix in the on-disk blueprint:
   - `workflows/WF-EC-01_Execution_Context.json` — `value1` updated to raw string expression; notes bumped to v1.1 with post-live-fix commentary
   - `workflows/WF-EC-01_blueprint.json` — same
4. Re-ran invalid-input probe (execution 687) — full trace reached `EC_Return_Error` with canonical shape.

### Verification
- live runtime (V5 post-fix):
  - execution 687 via chat trigger with `chatInput: "invalid probe after fix"`
  - `When chat message received` → `EC_Validate_Input` (emits `_valid: "false"`) → `EC_Route_Valid` (routes to output 1, false branch) ✅ → `EC_Return_Error`
  - `lastNodeExecuted: EC_Return_Error`, status success
  - canonical error shape emitted: `{status: "failed", error.code: "INVALID_INPUT", missing_fields: [...], module_name: "execution_context_init", result_type: "error", status_kind: "failed"}`
  - 0 DB side-effects confirmed
- live shell re-read: versionCounter 22, versionId `7fa2f135-…`, 9 nodes + 8 connections intact
- db state: `stage_local_ec_rows=0` post-cleanup; carry-forward TR evidence preserved; tenant_2 kept per cleanup design
- on-disk consistency: blueprint mirrors live; re-import is idempotent
- snapshot_before_id: `snapshot_WF-EC-01_before_2026-04-17_manual_import`
- snapshot_after_id: `snapshot_WF-EC-01_after_2026-04-17_switch_fix`
- rollback_source_if_any: not needed (fix is additive and mirrored on disk)

### Outcome
PASS on V1/V2/V3/V4/V5/V6 live; V2e (end-to-end happy path) DEFERRED behind MCP PUT-schema limitation (cannot safely inject UI pinData programmatically). See `workflows/POST_IMPORT_AUDIT_WF-EC-01.md` §3.V2e for the UI steps that would close V2e.

### Next step (handled in cycle 4)
V2e closed in cycle 4 via dual-trigger pinData.

---

## Cycle 4 (current — V2e closure + extended runtime suite)

### Problem
Cycle 3 left the stage at 9.5/10 with V2e (happy path end-to-end through the n8n engine) deferred. The deferral was rooted in two concrete barriers:
1. `mcp__n8n__patch_workflow_nodes` PUT-schema mismatch prevented programmatic pinData injection.
2. Chat trigger delivers `chatInput` as a free-form string and cannot drive structured-input modules directly.

### Root cause of cycle-3 deferral
A third, previously unobserved barrier was identified in cycle 4: `mcp__f2e8be41-…__execute_workflow` in manual mode selects the webhook-registered trigger as the start node (chat trigger, which has a `webhookId`). Manual-trigger-only pinData is therefore insufficient; the first cycle-4 attempt (execution 688) failed with `Cannot read properties of undefined (reading 'map')` precisely because chat trigger ran without pinData and without chatInput. This was the concrete mechanism that had made V2e unreachable without additional user action.

### Failure classification
- tool: `mcp__f2e8be41-…__execute_workflow` trigger-selection behavior
- failure_class: F6 tool-contract gap (manual mode starts webhook-registered trigger, not the "manual" trigger)
- degraded_label: not reproducible without dual-trigger pinData
- preset_used: n/a
- strategy_banned_now: no — dual-trigger pinData is the working pattern

### Fix applied
1. Asked user to set pinData ALSO on `When chat message received` with the same happy-path payload (`{tenant_id, thread_id, trigger_message_id, resolution_method, idempotency_key}`). User completed this step.
2. Re-ran `execute_workflow` in manual mode — execution 689 reached `EC_Return_Result` with canonical shape. V2e PASS.
3. Re-ran immediately (execution 690) — replay path PASS via upsert-conflict + canonical load.
4. Ran extended runtime suite (executions 691–699, 9 additional live runs):
   - R1 (691): fresh insert after intermediate cleanup — new id `440275dc-…`
   - R2/R3/R4 (692/693/694): sequential replays — all canonical, 0 duplicates
   - R5/R6 (695/696): production mode with invalid chatInput (bypasses pinData) → `EC_Return_Error` canonical shape, 0 DB writes
   - R7a/R7b/R7c (697/698/699): 3 concurrent executions — all idempotent
5. Final DB cleanup via `DELETE … WHERE idempotency_key LIKE 'wfec01_test_%'`. Carry-forward TR→EC evidence row (`a7ae786a-…`) preserved.

### Verification
- 11 total live executions; all with expected outcomes and engine `status: success`
- 7 happy-path executions → DB invariant: 1 row, 1 distinct id (idempotency end-to-end through n8n engine, sequential AND concurrent)
- 3 invalid-input executions (including cycle-3 V5 execution 687) → 0 DB writes, canonical error shape identical across all three
- `EC_Return_Result` output shape identical on fresh-insert path and replay path (confirming the design decision to source-of-truth the result from `EC_Load_Existing_Context`, not from the upsert node)
- Switch v2 post-fix confirmed across every execution (route 0 on valid, route 1 on invalid)
- DB post-cleanup: `stage_local_rows=0`, `any_stage_row=0`, `carry_forward_rows=1`, `total_rows=1`
- On-disk artifacts unchanged since cycle 3 (blueprint already carries the switch fix)
- snapshot_before_id: `snapshot_WF-EC-01_after_2026-04-17_switch_fix`
- snapshot_after_id: `snapshot_WF-EC-01_closed_at_10_of_10_2026-04-17`
- rollback_source_if_any: not needed

### Outcome
PASS — stage `WF-EC-01` is CLOSED at 10/10. `WF-OR-01` is unlocked.

### Next executable action
Open `WF-OR-01` (Orchestrator Input Handoff) per `00_ROUTE_MAP.md`. Carry forward the documented MCP tool limitations (patch tool unsafe, manual-mode execute selects webhook trigger, chat trigger needs adapter for structured modules).
