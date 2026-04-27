# WF-PL-01 — Import & Patch Plan

> This plan tells the live-build operator (Claude or human) exactly how to move the blueprint at `workflows/WF-PL-01_Plan_Builder.json` into a live `WF-PL-01` shell without falling into the SDK-reconstruction trap that blocked EC-01.
>
> Inherits the lessons from `BUILD_REPORT.md` (EC-01) §5 "Write path attempted" and `12_TOOL_FAILURE_MATRIX.md` §3.

## 0. Preconditions (DO NOT SKIP)

Do NOT start this plan until ALL are true:

1. `WF-EC-01` is CLOSED at 10/10 (see `CLOSURE_REPORT.md`).
2. `WF-OR-01` is CLOSED at 10/10 (see its CLOSURE_REPORT when it exists).
3. `STATE.json.advance_allowed` has been set `true` for the OR→PL transition.
4. User has resolved HDR-1..HDR-5 in `06_STAGE_WF-PL-01.md` or has explicitly accepted their defaults.
5. `execution_plans` table OR its `_claude_mcp` fallback exists and has been verified by live `information_schema` read (see `workflows/sql/pl/01_schema_inspect.sql`).
6. The operator has read `04_N8N_MCP_PLAYBOOK.md`, `11_DECISION_PRESETS.md`, `12_TOOL_FAILURE_MATRIX.md`, `17_ACTIVE_STAGE_LOCK.md`.

## 1. Write path — canonical

**Import method:** file JSON upload through n8n UI (same path used for WF-TR-01 per EC-01 BUILD_REPORT §3).

**Why NOT `update_workflow(code)` SDK path:**
- Per `BUILD_REPORT.md` (EC-01) §5 + §9: the SDK parser returned `valid: true, nodeCount: 0` for raw JSON embedded as object literals. Classified `unsafe_for_current_stage`.
- `12_TOOL_FAILURE_MATRIX.md` §3 + §4: false-success tool path is classified degraded and must be replaced with canonical JSON patch/import discipline.
- `11_DECISION_PRESETS.md` §4: after MCP/SDK degraded path observed, switch to canonical JSON patch strategy.

**Pre-import snapshot (mandatory per `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md`):**
- MCP read of the existing `WF-PL-01` shell (must exist as user-placeholder).
- Save JSON to `workflows/snapshots/WF-PL-01_before_<timestamp>.json`.
- Record: workflow id, version id (active + draft), node count, connection count, active flag.

## 2. Import procedure (UI path — live operator only)

Per n8n UI:
1. Open the live `WF-PL-01` shell in the browser.
2. "Import from file" → select `workflows/WF-PL-01_Plan_Builder.json`.
3. n8n will preserve the workflow record id but replace nodes + connections with the blueprint content.
4. **Attach credentials manually**: the Postgres node (`PL_Upsert_Plan`) requires a Postgres credential. Per EC-01 BUILD_REPORT §3 canonical shape, the blueprint JSON does NOT ship a `credentials` block. Attach via UI after import. Expected credential id name: same as WF-EC-01 (user's standard `claude_mvp` Postgres credential or equivalent).
5. "Save" (not "Save and Activate" — see §4 below).

## 3. Post-import verification (mandatory — do this before running anything)

Per `04_N8N_MCP_PLAYBOOK.md` "Mandatory sequence for any workflow edit":

- [ ] MCP re-read the workflow.
- [ ] Confirm node count: **8** (`PL_Trigger`, `PL_Validate_Input`, `PL_Route_Valid`, `PL_Build_Plan_Envelope`, `PL_Validate_Plan_Envelope`, `PL_Upsert_Plan`, `PL_Return_Result`, `PL_Return_Error`).
- [ ] Confirm connection count: **6** outgoing edges total
  - PL_Trigger → PL_Validate_Input
  - PL_Validate_Input → PL_Route_Valid
  - PL_Route_Valid[0] → PL_Build_Plan_Envelope
  - PL_Route_Valid[1] → PL_Return_Error
  - PL_Build_Plan_Envelope → PL_Validate_Plan_Envelope
  - PL_Validate_Plan_Envelope → PL_Upsert_Plan
  - PL_Upsert_Plan → PL_Return_Result
  (7 edges — one more than 6; re-count during verification and correct this checklist if needed)
- [ ] Confirm `PL_Upsert_Plan` has the Postgres credential attached AND `queryParams` intact.
- [ ] Confirm node `id`s match the blueprint (pl-trigger-001 through pl-return-error-008) for traceability.
- [ ] Save after-snapshot at `workflows/snapshots/WF-PL-01_after_<timestamp>.json`.
- [ ] Compute structural delta vs before-snapshot; record in `BUILD_REPORT.md` (renamed from the suffixed prep version).

**Failure handling:**
- If node count < 8: blank-workflow risk. Restore from before-snapshot per `12_TOOL_FAILURE_MATRIX.md` §4. Do not retry the same import path without investigation.
- If connection count mismatch: inspect JSON for connection-block typos; re-import with corrected JSON.
- If credentials did not bind: attach via UI, save, re-read, re-verify.

## 4. Runtime V1–V6 sequence (after §3 passes)

Run V1–V6 in this order, each producing its own live evidence block in `BUILD_REPORT.md`:

### V1 — shell integrity
MCP read → node count 8, connections 7 (per above), active/draft state understood.

### V2 — input validation (negative paths)
Feed invalid inputs via manual trigger chat payload:
- omit `execution_id` → error envelope with `failure_class: invalid_input`
- omit `idempotency_key` → error envelope
- empty `orchestrator_decision.module_order` → error envelope
- module name = `"frontend_module"` → error envelope

### V3 — happy path
Use fixture input from `workflows/sql/pl/06_fixture_pack_claude_mcp.sql` §"V3 happy-path payload".
Expected: row inserted in `execution_plans`, `execution_contexts.current_plan_ref` updated, output envelope with 2 steps, `validation.graph_valid = true`, `replayed = false`.

### V4 — idempotency / replay
Replay same `(execution_id, idempotency_key)` — expect same plan_id, `replayed = true`, no duplicate row in `execution_plans`.

### V5 — cross-tenant isolation
Send same payload under `tenant_id = B` — expect distinct plan row, and `SELECT … WHERE tenant_id = A` does NOT return it.

### V6 — OR→PL smoke handoff
Feed a real OR-01 output envelope (once OR-01 is live-green). Expected: PL-01 accepts it without field-rename patches.

## 5. Activation path

- Only activate (`active: true`) after V1–V6 all pass.
- Activation triggers downstream wiring — DI-01 shell (when that stage exists) must have a read path from `execution_plans` BEFORE PL-01 is activated live.

## 6. Rollback path

If any V1–V6 step fails materially:
1. Set workflow `active: false`.
2. Restore `WF-PL-01` from `workflows/snapshots/WF-PL-01_before_<timestamp>.json`.
3. Log the failing step class in `FIX_LOG.md` (renamed from prep).
4. Analyze in isolation via `pl_logic.py` (pure-logic oracle) — if pl_logic matches expectation and the n8n node does not, the node JS needs patching.
5. Do NOT advance `STATE.json.advance_allowed` until the fix is live-proven.

## 7. Differential oracle: `pl_logic.py`

For any V3–V6 discrepancy, run the same input through `workflows/scripts/pl/pl_logic.py::build_plan_envelope()` and `validate_plan_envelope()` to isolate "node JS bug" vs "upstream payload bug" vs "schema bug". The pure-logic port is authoritative for envelope construction and validation rules; the n8n JS is a port of it and should match byte-for-byte on the envelope (modulo `created_at` timestamp).

## 8. Shell-creation protocol (if `WF-PL-01` shell does not exist yet)

If the user has not yet created a `WF-PL-01` shell:
- Operator asks the user to create one via the n8n UI (workflow name must be EXACTLY `WF-PL-01`).
- Once the shell id is known, record it in `BUILD_REPORT.md`.
- Do NOT create the shell via MCP. The shell-ownership convention is that the user creates the record; Claude populates it.

## 9. Credential mapping checklist

| Node | Credential type | Expected id-hint | Post-import action |
|---|---|---|---|
| PL_Upsert_Plan | Postgres | same as WF-TR-01 / WF-EC-01 | attach via UI |

## 10. Minimum live-build duration estimate

- Pre-import snapshot: 2 min
- UI import + credential attach: 5 min
- Post-import verification: 5 min
- V1: 2 min
- V2: 5 min (4 negative cases)
- V3: 5 min (happy path + DB read-back)
- V4: 3 min (replay)
- V5: 5 min (cross-tenant setup + isolation proof)
- V6: 10 min (fixture construction, handoff test)
- Audit write-up: 15 min

Total: ~1 hour if no fix-loops. Budget 2 hours to include one fix cycle.
