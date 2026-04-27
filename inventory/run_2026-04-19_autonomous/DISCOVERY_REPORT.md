# DISCOVERY_REPORT

Run ID: `run_2026-04-19_autonomous`
Date: 2026-04-19
Discovery-first pass. Repository reality is stronger than the seed manifest.

## 1. Evidence channels used

| Channel | Source | Strength |
|---|---|---|
| Physically present workflow folders | `workflows/` listing | strong |
| Workflow-local READMEs | `workflows/<WF>/README.md` | strong |
| Canonical workflow JSONs | `workflows/<WF>/workflow/*.json` | strong |
| Per-WF reports (AUDIT/BUILD/CLOSURE/FIX/STATE) | `workflows/<WF>/reports/` | strong |
| Top-level workflows/README.md (active index) | `workflows/README.md` | strong (authoritative for active set) |
| Canonical standard | `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` | strong (this is the locked standard) |
| Coverage audit | `inventory/WORKFLOW_COVERAGE_AUDIT.md` | strong (consolidated 2026-04-19 audit) |
| Superseded plan (migration roadmap) | `inventory/WORKFLOW_STANDARDIZATION_PLAN.md` | secondary (SUPERSEDED header present) |
| Final baseline | `FINAL_CANONICAL_BASELINE.md` | strong |
| Seed manifest | `_claude_operator_pack/EXPECTED_WORKFLOW_MANIFEST.md` | weak — seed only |

## 2. Physically present entries under `workflows/`

### 2.1 Workflow folders (standard skeleton, `WF-XX-01_<Name>/` shape)

| Folder | WF Code | Canonical JSON present | Extra JSONs in workflow/ | docs/ populated | reports/ populated | Notes |
|---|---|---|---|---|---|---|
| `WF-TR-01_Thread_Resolver` | WF-TR-01 | yes (`WF-TR-01_Thread_Resolver.json`, 45 645 B) | `patches/WF-TR-01_PATCHED_switch_fix.json` (overlay patch, has README) | yes (contracts/, handoffs/, MCP sheet, IMPORT, TEST_AFTER_IMPORT) | partial (REMEDIATION, TEST_REPORT) | MCP trigger workflow; Thread Resolver |
| `WF-EC-01_Execution_Context` | WF-EC-01 | yes (`WF-EC-01_Execution_Context.json`, 14 498 B) | none | yes (NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN, CLOSURE_CONTRACT, CLOSURE_PLAN, LIVE_REALITY_CHECK, STAGE) | yes (AUDIT, BUILD, CLOSURE, FIX_LOG, POST_IMPORT_AUDIT) | Execution Context (init) |
| `WF-OR-01_Orchestrator` | WF-OR-01 | yes (`WF-OR-01_Orchestrator_Input_Handoff.json`, 14 741 B) | `WF-OR-01_blueprint.json` (14 216 B, **FULL dup** — not slim metadata) | partial (NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN) | empty | Orchestrator |
| `WF-PL-01_Plan_Generation` | WF-PL-01 | yes (`WF-PL-01_Plan_Generation.json`, 21 035 B) | `WF-PL-01_blueprint.json` (20 563 B, **FULL dup**) | partial (NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN, STAGE) | yes (AUDIT, BUILD, CLOSURE, CURRENT_STAGE, FIX_LOG, STATE json) | Plan Generation; closed @ 10/10 per STATE |
| `WF-DI-01_Dispatcher` | WF-DI-01 | yes (`WF-DI-01_Dispatcher.json`, 19 109 B) | `WF-DI-01_blueprint.json` (18 889 B, **FULL dup**) | partial (ROUTE_MAP, STAGE, STAGE_LOCK, NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN) | yes (AUDIT, BUILD, CLOSURE, CURRENT_STAGE, FIX_LOG, STATE json) | Dispatcher |
| `WF-ME-01_Module_Execution` | WF-ME-01 | yes (`WF-ME-01_Module_Execution.json`, 30 066 B) | `WF-ME-01_blueprint.json` (10 134 B, partial — may be slim) | yes (ROUTE_MAP, STAGE, STAGE_LOCK, NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN, TEST_MATRIX) | yes (AUDIT, BUILD, CLOSURE, CURRENT_STAGE, FIX_LOG) | Module Execution |
| `WF-RA-01_Result_Aggregator` | WF-RA-01 | yes (`WF-RA-01_Result_Aggregator_LIVE.json`, 17 854 B) | `drafts/` subfolder | yes (ROUTE_MAP_ACTIVATED, STAGE, ACTIVE_STAGE_LOCK, NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN, TEST_MATRIX) | yes (AUDIT, BUILD, CLOSURE, CURRENT_STAGE, FINAL_STAGE_POSTURE, FIX_LOG) | Result Aggregator; LIVE suffix in JSON name |
| `WF-SU-01_State_Persistence_Updater` | WF-SU-01 | yes (`WF-SU-01_State_Persistence_Updater.json`, 25 638 B) | `SU_PINDATA_ENVELOPES.json` (5 362 B, fixture/pindata), `SU_Build_Downstream_Envelope_TOLERANT_JSCODE.js` (code node export) | partial (NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN, TEST_MATRIX) | yes (CLOSURE, STATE json, SU_LIVE_EXECUTIONS, SU_RESULTS, VERIFIER_DELIVERY) | State Persistence Updater; naming drift in `inventory/WORKFLOW_COVERAGE_AUDIT.md` already resolved |
| `WF-MO-01_Message_Out_Output_Gateway` | WF-MO-01 | yes (`WF-MO-01_Message_Out.json`, 13 850 B) | `WF-MO-01_blueprint.json` (1 058 B, **slim metadata — compliant**) | yes (NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN, TEST_MATRIX, `ucenicul_claude_handoff_hardened/` bundle) | partial (CLAUDE_PROMPT, README_APPLY_FIRST, SHA256SUMS — no AUDIT/BUILD/CLOSURE) | Message Out / Output Gateway (CRITICAL tier by role) |
| `WF-RC-01_Response_Composer` | WF-RC-01 | yes (`WF-RC-01_Response_Composer.json`, 17 940 B) | `WF-RC-01_blueprint.json` (379 B, **slim metadata — compliant**) | yes (ROUTE_MAP_ACTIVATED, STAGE, ACTIVE_STAGE_LOCK, NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN, TEST_MATRIX, AUDIT, BUILD, CLOSURE, CURRENT_STAGE, FIX_LOG, STATE json — STATE is in docs/ not state/) | partial (README_APPLY_FIRST, SHA256SUMS — no canonical AUDIT/BUILD in reports/ folder because reports-shaped docs live in docs/) | Response Composer |

### 2.2 Non-workflow entries

| Folder | Type | Disposition |
|---|---|---|
| `_ARCHIVED_Executor_Closer_stub/` | archived stub (vestigial mount-locked) | ARCHIVED_ONLY per its own README; excluded from active index by `workflows/README.md` §"Non-workflow entries" |
| `contracts/` | shared legacy contracts (ThreadResolutionContracts.md) | foreign/shared — also present under `WF-TR-01_Thread_Resolver/docs/contracts/` (stronger local copy) |
| `fixtures/` | shared legacy fixtures | foreign/shared — also present under `WF-TR-01_Thread_Resolver/tests/fixtures/` (stronger local copy) |
| `scripts/` | shared legacy scripts | foreign/shared — likely to be workflow-scoped; out of scope for this run |
| Top-level `.md` files | legacy flat docs predating folder standardization | stale/historical — superseded by the per-WF trees; out of scope for this run |

## 3. Mapping from seed manifest to repository evidence

| Seed WF | Folder in `workflows/` | Classification |
|---|---|---|
| WF-TR-01 | `WF-TR-01_Thread_Resolver/` | PRESENT_IN_REPO |
| WF-EC-01 | `WF-EC-01_Execution_Context/` | PRESENT_IN_REPO |
| WF-OR-01 | `WF-OR-01_Orchestrator/` | PRESENT_IN_REPO |
| WF-PL-01 | `WF-PL-01_Plan_Generation/` | PRESENT_IN_REPO |
| WF-DI-01 | `WF-DI-01_Dispatcher/` | PRESENT_IN_REPO |
| WF-ME-01 | `WF-ME-01_Module_Execution/` | PRESENT_IN_REPO |
| WF-RA-01 | `WF-RA-01_Result_Aggregator/` | PRESENT_IN_REPO |
| WF-SU-01 | `WF-SU-01_State_Persistence_Updater/` | PRESENT_IN_REPO |

All eight seed workflows are present with canonical name, canonical workflow JSON, and a full standard subfolder skeleton. None are `MISSING_FROM_REPO`.

## 4. Workflows discovered beyond the seed set

| WF | Folder | Classification | Note |
|---|---|---|---|
| WF-MO-01 | `WF-MO-01_Message_Out_Output_Gateway/` | PRESENT_IN_REPO (out of seed manifest scope) | Real active workflow per `inventory/WORKFLOW_COVERAGE_AUDIT.md` §B; populated |
| WF-RC-01 | `WF-RC-01_Response_Composer/` | PRESENT_IN_REPO (out of seed manifest scope) | Real active workflow per audit; populated |

Both are in the canonical standard's scope (`§1 applies to all 10 target-architecture workflows`). They are included in this run because repository evidence is strong and because the audit document ties them into the pipeline (WF-RC-01 downstream of WF-SU-01; WF-MO-01 terminal).

The seed manifest's 8-workflow list is therefore **weaker** than the repository's 10-workflow reality. Per the discovery-first rule, the run proceeds against all 10.

## 5. Candidates seen but not adopted as executable scope

| Candidate | Source | Classification | Reason |
|---|---|---|---|
| WF-00 Morning Briefing | `inventory/WORKFLOW_COVERAGE_AUDIT.md` §B (cron in live n8n) | REFERENCED_ONLY | No repo folder exists; no evidence of staged scaffold under `workflows/`. Out of this run's seed scope. |
| WF-01 Message Receiver (inactive) | `inventory/WORKFLOW_COVERAGE_AUDIT.md` §B | REFERENCED_ONLY | No repo folder; marked inactive in n8n. Out of this run's seed scope. |
| `brain_main_inbound_mvp_v6_preprocessor_fixed` monolith | `inventory/WORKFLOW_COVERAGE_AUDIT.md` §B | OUT_OF_SCOPE | Monolith workflow targeted for separate orientation doc (`docs/archive/brain_main_monolith_orientation.md`). Not a modular WF. |
| `DEPRECATED__WF-MO-01_langchain_stub` | n8n side, per audit | OUT_OF_SCOPE | Deprecated in n8n; has no repo folder. Out of scope for docs reconciliation. |
| `_ARCHIVED_Executor_Closer_stub/` | `workflows/` | ARCHIVED_ONLY | Its own README states it is vestigial and not a workflow. The WF-EC-01 code is uniquely owned by `WF-EC-01_Execution_Context/`. Not queued for per-workflow processing; referenced in this discovery report only. |

## 6. Final discovery verdict

`DISCOVERY_COMPLETE`

- 10 PRESENT_IN_REPO executable targets: WF-TR-01, WF-EC-01, WF-OR-01, WF-PL-01, WF-DI-01, WF-ME-01, WF-RA-01, WF-SU-01, WF-MO-01, WF-RC-01.
- 0 MISSING_FROM_REPO against the seed.
- 2 additional in-repo targets beyond the seed (WF-MO-01, WF-RC-01) — included in execution queue.
- 1 ARCHIVED_ONLY entry (`_ARCHIVED_Executor_Closer_stub`) — documented only.
- 2 REFERENCED_ONLY candidates (WF-00, WF-01) — noted, not queued.
- 1 OUT_OF_SCOPE monolith.

All physical workflow folders already follow the canonical `WF-XX-01_<Name>/` naming and the standard subfolder skeleton. The primary compliance gap is at artifact level (state/ subfolder missing across all 10 WFs; several missing subfolder READMEs; duplicate-full-JSON "blueprint" files for ORCH/PL/DI/ME), not at discovery level.
