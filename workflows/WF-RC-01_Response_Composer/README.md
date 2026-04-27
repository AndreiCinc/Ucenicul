# WF-RC-01 Response Composer

> **Status card**
> - n8n_id: `TClXgmO8H8zsSwMb`
> - n8n_active: true
> - n8n_updatedAt: 2026-04-18T12:34:00Z
> - n8n_version: `64135f8f-ee1a-4e5a-935d-4fc468dd1822`
> - node_count: 14 (11 code, 2 postgres, 2 switch, 1 executeWorkflow — plus 2 triggers)
> - repo_status: `populated` (handoff pack re-folded into canonical layout on 2026-04-19)
> - last_sync: 2026-04-19 (from `pre_live_ready` handoff pack — `reports/SHA256SUMS.txt` integrity anchor)
> - owner: TBD
> - pack_posture: `pre_live_ready` (V1–V6 live proof pending — see `reports/README_APPLY_FIRST.md`)

## Role

WF-RC-01 is the Response Composer in the target pipeline. It receives the state-update envelope from WF-SU-01, verifies lineage against `execution_contexts` and `threads` rows, composes the user-visible response text in the requested locale (`ro` or `en`), and emits a `composed_response` envelope with SHA256-derived idempotency key for WF-MO-01. The RC→MO handoff (nodes `RC_Prepare_MO_01_Handoff` and `RC_Dispatch_To_MO_01_SUBCALL`) is DISABLED by default and opens only when the caller sets `dispatch_to_mo_01 === true`.

## Authority

- Target architecture: `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
- Workflow wiring: `docs/architecture/n8n_Workflow_Mapping.md`
- Module contract (response layer): `docs/architecture/Module_Spec_Response.md`
- Upstream closure evidence: `docs/12_STAGE_WF-RC-01.md`, `docs/STATE__WF-RC-01.json`

## Inputs

State-update result envelope from WF-SU-01:

| Field | Type | Required |
|---|---|---|
| `status_kind` | string (must be `success`) | yes |
| `result_type` | string (must be `state_update_result`) | yes |
| `execution_context_id` | uuid | yes |
| `thread_id` | uuid | yes |
| `tenant_id` | uuid | yes |
| `state_update_result` | object (needs `status` + `summary`) | yes |
| `allowed_next_stage` | string (must be `WF-RC-01`) | yes |
| `response_generation_allowed` | boolean (must be `true`) | yes |
| `channel` | string (default `telegram`) | no |
| `locale` | string (default `ro`; supported: `ro`, `en`) | no |

## Outputs

Composed-response envelope:

| Field | Type | Notes |
|---|---|---|
| `status_kind` | string | `success` (or `error` on composition failure) |
| `result_type` | string | `composed_response` |
| `execution_context_id` / `thread_id` / `tenant_id` | uuid | carried through |
| `composed_response` | object | `{ final_response_text, response_status, includes_followups, includes_warnings, followup_count, warning_count, channel, locale }` |
| `output_gateway_allowed` | boolean | `true` |
| `allowed_next_stage` | string | `MESSAGE_OUT` |
| `response_generation_allowed` | boolean | `true` |
| `idempotency_key` | string | `compose:<execution_context_id>:<16-char sha256>` |

Error envelopes: `result_type = 'composition_error'` with one of `INVALID_RESPONSE_COMPOSITION_INPUT`, `COMPOSITION_NOT_ALLOWED`, `LINEAGE_MISMATCH`.

## Flow (happy path)

1. `RC_Input` (executeWorkflowTrigger) or `RC_Manual_Test_Trigger` (manual)
2. → `RC_Validate_State_Update_Input` (code; schema + invariants + locale/channel defaults)
3. → `RC_Route_Valid` (switch: `_valid === true`)
4. → `RC_Load_Execution_Context` (postgres; see `sql/02_load_execution_context.sql`)
5. → `RC_Load_Thread_Context` (postgres; see `sql/03_load_thread_context.sql`)
6. → `RC_Verify_Lineage` (code; tenant/thread cross-check)
7. → `RC_Route_Context_Ready` (switch: `_context_ready === true`)
8. → `RC_Build_Composition_Input` (code; shapes payload for composition)
9. → `RC_Compose_Response` (code; Romanian/English locale-aware text assembly — `scripts/rc_logic.py` for off-node equivalent)
10. → `RC_Build_Output_Envelope` (code; SHA256 digest + `allowed_next_stage='MESSAGE_OUT'`)
11. → `RC_Return_Result` (code; final return)

Error paths: step 3 diverts to `RC_Return_Error`; step 7 diverts to `RC_Return_Context_Error`.

Disabled handoff (opt-in): step 10 also connects to `RC_Prepare_MO_01_Handoff` → `RC_Dispatch_To_MO_01_SUBCALL` (executeWorkflow → WF-MO-01). Both nodes carry `disabled: true` in the blueprint until the RC→MO activation plan is executed.

## Subfolder tour (real inventory)

| Subfolder | Contents |
|---|---|
| `workflow/` | `WF-RC-01_Response_Composer.json` (n8n blueprint, 14 nodes — canonical artifact), `WF-RC-01_blueprint.json` (shell integrity summary) |
| `docs/` | Shell docs: `WF-RC-01_NODE_MAP.md`, `WF-RC-01_CONNECTION_MAP.md`, `WF-RC-01_IMPORT_PATCH_PLAN.md`, `WF-RC-01_TEST_MATRIX.md`. Handoff bundle (flat): `00_ROUTE_MAP__WF-RC-01_ACTIVATED.md`, `12_STAGE_WF-RC-01.md`, `17_ACTIVE_STAGE_LOCK__WF-RC-01.md`, `AUDIT_REPORT__WF-RC-01.md`, `BUILD_REPORT__WF-RC-01.md`, `CLOSURE_REPORT__WF-RC-01.md`, `CURRENT_STAGE__WF-RC-01.md`, `FIX_LOG__WF-RC-01.md`, `STATE__WF-RC-01.json` |
| `sql/` | 7 SQL files: `01_schema_inspect.sql`, `02_load_execution_context.sql`, `03_load_thread_context.sql`, `04_load_response_inputs.sql`, `10_fixtures_create.sql`, `11_fixtures_cleanup.sql`, `20_read_path_probe.sql` |
| `scripts/` | `rc_logic.py` (off-node composition logic — Romanian/English) |
| `tests/` | `test_families.py` (off-node V1–V6 suite), `results/` (populated after off-node runs) |
| `reports/` | Handoff pack artifacts: `README_APPLY_FIRST.md`, `SHA256SUMS.txt`. Live-run reports (AUDIT / BUILD / CLOSURE / FIX_LOG / WORK_LOG / POST_IMPORT_AUDIT / REMEDIATION / TEST_REPORT / PENDING_WIRING) go here once produced. |
| `assets/` | Diagrams / screenshots (currently empty) |

## Open gaps

- RC→MO handoff nodes are disabled. Activation plan: see `WF-E2E-01_RC01_TO_MO01_CONNECTOR_PLAN.md` referenced in the `RC_Prepare_MO_01_Handoff` code.
- Pack posture is **`pre_live_ready`** per `reports/README_APPLY_FIRST.md`. Apply order: (1) import blueprint; (2) rebind Postgres credential placeholders; (3) confirm shell integrity (14 nodes / 13 main edges / 2 triggers / 2 switches / 2 Postgres reads); (4) off-node `python scripts/rc_logic.py` or `tests/test_families.py`; (5) run V1–V6 live; (6) mark closed in `reports/CLOSURE_REPORT__WF-RC-01.md` (currently in `docs/`).
- Docs layout: RC-01 keeps the handoff bundle FLAT in `docs/`, whereas MO-01 keeps it nested under `docs/ucenicul_claude_handoff_hardened/`. Both layouts are valid per the canonical spec; `wf-audit` should accept either.
- `reports/SHA256SUMS.txt` was computed against the original pre-fold layout. Contents are unchanged, so file-by-file checksums still match; manifest paths will be re-anchored by the next `wf-sync` run.

## Last updated

2026-04-19 (populate pass — re-folded pre-existing handoff pack into canonical layout)
