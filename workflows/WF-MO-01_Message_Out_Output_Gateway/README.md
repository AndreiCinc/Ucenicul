# WF-MO-01 Message Out / Output Gateway

> **Status card**
> - n8n_id: `OooZdC0DgsDR6gm0`
> - n8n_active: true
> - n8n_updatedAt: 2026-04-18T11:20:33Z
> - n8n_version: `4e0163b2-e176-40ad-ac33-a8438d7c2147`
> - node_count: 18 (7 code, 5 postgres, 3 switch, 1 telegram, 1 executeWorkflowTrigger, 1 manualTrigger)
> - repo_status: `populated` (handoff pack re-folded into canonical layout on 2026-04-19)
> - last_sync: 2026-04-19 (from `pre_live_ready` handoff pack — `reports/SHA256SUMS.txt` integrity anchor)
> - owner: TBD
> - pack_posture: `pre_live_ready` (V1–V7 live proof pending — see `reports/README_APPLY_FIRST.md`)

## Role

WF-MO-01 is the Output Gateway in the target pipeline. It receives the composed-response envelope from WF-RC-01, verifies lineage against `execution_contexts`, `threads`, and `channel_delivery_context` rows, runs a replay-guard probe against `outbound_messages` to reject duplicates, builds a provider-agnostic delivery request, dispatches through the correct channel (Telegram concrete; WhatsApp / Web stubbed via `MO_Send_Channel_PLACEHOLDER`), logs the send to `outbound_messages`, and returns a `delivery_result` envelope.

## Authority

- Target architecture: `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
- Workflow wiring: `docs/architecture/n8n_Workflow_Mapping.md`
- Module contract (output layer): `docs/architecture/Module_Spec_Output.md`
- Upstream closure evidence: `docs/ucenicul_claude_handoff_hardened/UPSTREAM_TRUTH__WF-RC-01.md`

## Inputs

Composed-response envelope from WF-RC-01:

| Field | Type | Required |
|---|---|---|
| `status_kind` | string (must be `success`) | yes |
| `result_type` | string (must be `composed_response`) | yes |
| `execution_context_id` | uuid | yes |
| `thread_id` | uuid | yes |
| `tenant_id` | uuid | yes |
| `composed_response` | object (needs `final_response_text`, `channel`, `locale`) | yes |
| `output_gateway_allowed` | boolean (must be `true`) | yes |
| `allowed_next_stage` | string (must be `MESSAGE_OUT`) | yes |
| `response_generation_allowed` | boolean (must be `true`) | yes |
| `idempotency_key` | string (from RC-01 digest) | yes |

## Outputs

Delivery-result envelope:

| Field | Type | Notes |
|---|---|---|
| `status_kind` | string | `success` (or `error` on validation / replay / provider failure) |
| `result_type` | string | `delivery_result` |
| `execution_context_id` / `thread_id` / `tenant_id` | uuid | carried through |
| `delivery_result` | object | `{ provider_delivery_succeeded, provider_message_ref, outbound_log_written, applied, blocked, warnings, channel, locale }` |
| `allowed_next_stage` | string | `DONE` (pipeline terminal) |
| `idempotency_key` | string | echoed from input (used as replay-guard key) |

Error envelopes: `result_type = 'delivery_error'` with one of `INVALID_DELIVERY_INPUT`, `DELIVERY_NOT_ALLOWED`, `LINEAGE_MISMATCH`, `REPLAY_BLOCKED`, `PROVIDER_FAILURE`.

## Flow (happy path)

1. `MO_Input` (executeWorkflowTrigger) or `MO_Manual_Test_Trigger` (manual)
2. → `MO_Validate_Composed_Response_Input` (code; schema + invariants + locale/channel defaults)
3. → `MO_Route_Valid` (switch: `_valid === true`)
4. → `MO_Load_Execution_Context` (postgres; see `sql/02_load_execution_context.sql`)
5. → `MO_Load_Thread_Context` (postgres; see `sql/03_load_thread_context.sql`)
6. → `MO_Load_Channel_Delivery_Context` (postgres; see `sql/04_load_channel_delivery_context.sql`)
7. → `MO_Replay_Guard_Probe` (postgres; see `sql/06_replay_guard_probe.sql`)
8. → `MO_Verify_Lineage_And_Replay` (code; tenant/thread cross-check + replay-guard decision)
9. → `MO_Route_Context_Ready` (switch: `_context_ready === true`)
10. → `MO_Build_Delivery_Request` (code; shapes channel-agnostic send request)
11. → `MO_Route_Channel` (switch on `composed_response.channel`)
12. → `MO_Send_Channel_PLACEHOLDER` / Telegram node (provider dispatch)
13. → `MO_Log_Outbound_Message` (postgres; see `sql/05_insert_outbound_message_log.sql`)
14. → `MO_Build_Delivery_Result` (code; merges provider success + log status into applied/blocked/warnings rollup)
15. → `MO_Return_Result` (code; final return)

Error paths: step 3 diverts to `MO_Return_Error`; step 9 diverts to `MO_Return_Context_Error`.

Replay-guard: if `MO_Replay_Guard_Probe` finds a prior send for the same `idempotency_key`, `MO_Verify_Lineage_And_Replay` marks the envelope `REPLAY_BLOCKED` and short-circuits to `MO_Return_Error`. No provider call is made.

## Subfolder tour (real inventory)

| Subfolder | Contents |
|---|---|
| `workflow/` | `WF-MO-01_Message_Out.json` (n8n blueprint, 18 nodes — canonical artifact), `WF-MO-01_blueprint.json` (shell integrity summary) |
| `docs/` | Shell docs: `WF-MO-01_NODE_MAP.md`, `WF-MO-01_CONNECTION_MAP.md`, `WF-MO-01_IMPORT_PATCH_PLAN.md`, `WF-MO-01_TEST_MATRIX.md`. Handoff bundle: `docs/ucenicul_claude_handoff_hardened/` (10 files — `00_ROUTE_MAP`, `13_STAGE`, `17_ACTIVE_STAGE_LOCK`, `AUDIT_REPORT`, `BUILD_REPORT`, `CLOSURE_REPORT`, `CURRENT_STAGE`, `FIX_LOG`, `STATE.json`, `UPSTREAM_TRUTH__WF-RC-01.md`) |
| `sql/` | 10 SQL files: `01_schema_inspect.sql`, `02_load_execution_context.sql`, `03_load_thread_context.sql`, `04_load_channel_delivery_context.sql`, `05_insert_outbound_message_log.sql`, `06_replay_guard_probe.sql`, `07_create_fallback_delivery_ledger_claude_mcp.sql`, `10_fixtures_create.sql`, `11_fixtures_cleanup.sql`, `20_read_path_probe.sql` |
| `scripts/` | `mo_logic.py` (off-node verification logic), `__init__.py` |
| `tests/` | `test_families.py` (off-node V1–V7 suite), `__init__.py`, `results/` (results.json + results.md from last off-node run) |
| `reports/` | Handoff pack artifacts: `CLAUDE_PROMPT__WF-MO-01.txt`, `README_APPLY_FIRST.md`, `SHA256SUMS.txt`. Live-run reports (AUDIT / BUILD / CLOSURE / FIX_LOG / WORK_LOG / POST_IMPORT_AUDIT / REMEDIATION / TEST_REPORT / PENDING_WIRING) go here once produced. |
| `assets/` | Diagrams / screenshots (currently empty) |

## Open gaps

- `MO_Send_Channel_PLACEHOLDER` is a stub; only Telegram send is concretely wired. WhatsApp / Web channel providers are pending — will be tracked in `reports/PENDING_WIRING.md` once live V1–V7 completes.
- Pack posture is **`pre_live_ready`** per `reports/README_APPLY_FIRST.md`. Apply order: (1) off-node `python3 scripts/mo_logic.py` or `tests/test_families.py`; (2) import blueprint; (3) bind channel-send credentials per `docs/WF-MO-01_IMPORT_PATCH_PLAN.md`; (4) run V1–V7 live.
- Upstream RC→MO handoff nodes in WF-RC-01 are disabled by default (`dispatch_to_mo_01 !== true`). Activation plan: see `workflows/WF-RC-01_Response_Composer/docs/` and the `WF-E2E-01` connector plan.
- `reports/SHA256SUMS.txt` was computed against the original pre-fold layout (paths like `workflows/WF-MO-01_Message_Out.json`). After the populate pass, paths are `workflow/WF-MO-01_Message_Out.json` etc. Contents are unchanged, so file-by-file checksums still match; manifest paths will be re-anchored by the next `wf-sync` run.

## Last updated

2026-04-19 (populate pass — re-folded pre-existing handoff pack into canonical layout)
