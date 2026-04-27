# WORKFLOW_INVENTORY — Ucenicul Autonomous Test & E2E Mission

Run ID: `run_2026-04-19_autonomous_test_e2e`
Scope: canonical 10 workflows (frozen). `WF-TR-02` and all others are out of scope.
Evidence sources: n8n live topology (`mcp__f2e8be41-...__search_workflows`), workflow folders under `workflows/`, readiness artifacts under `inventory/run_2026-04-19_autonomous/`.

---

## 1. In-scope workflows

| WF | Live ID | Label | Local folder | Readiness verdict | Prior test evidence |
|---|---|---|---|---|---|
| WF-TR-01 | `wI8hpSROxQI0zC9f` | Thread Resolver | `workflows/WF-TR-01_Thread_Resolver` | TEST_READY_WITH_LIMITS | 16 fixture vectors TC-01..TC-16 (pre-live; no `test_families.py`) |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | Execution Context | `workflows/WF-EC-01_Execution_Context` | TEST_READY | `test_families.py` present; 300/300 pass (results.md 2026-04-17) |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | Orchestrator | `workflows/WF-OR-01_Orchestrator` | TEST_READY_WITH_LIMITS | `test_families.py` 650/650 PASS |
| WF-PL-01 | `RwToPLa1ErHl2tUi` | Plan Generation | `workflows/WF-PL-01_Plan_Generation` | TEST_READY | `test_families.py` 650/650 PASS; live exec 711–714 |
| WF-DI-01 | `abqYINcXr3JAhGGk` | Dispatcher | `workflows/WF-DI-01_Dispatcher` | TEST_READY | `test_families.py` 650/650 PASS; live exec 716–720 |
| WF-ME-01 | `uq26nh1grIpnHju0` | Module Execution | `workflows/WF-ME-01_Module_Execution` | TEST_READY | `test_families.py` 650/650 PASS; closure 10/10 |
| WF-RA-01 | `5RcNLtxNjAHJsZPE` | Result Aggregator | `workflows/WF-RA-01_Result_Aggregator` | TEST_READY | `test_families.py` 650/650 PASS; live exec 734–738 |
| WF-RC-01 | `TClXgmO8H8zsSwMb` | Response Composer | `workflows/WF-RC-01_Response_Composer` | TEST_READY_WITH_LIMITS | `test_families.py` 650/650 PASS; pre-live (score 9.7) |
| WF-MO-01 | `OooZdC0DgsDR6gm0` | Message Out / Output Gateway | `workflows/WF-MO-01_Message_Out_Output_Gateway` | TEST_READY_WITH_LIMITS | `test_families.py` 650/650 PASS; pre-live; PLACEHOLDER provider |
| WF-SU-01 | `ENiYNfL3ul8AmmCB` | State / Persistence Updater | `workflows/WF-SU-01_State_Persistence_Updater` | TEST_READY | `tests/su/test_families.py` 650/650 PASS; live exec 744–747 |

All 10 discovery outcomes: `PRESENT_IN_REPO` + `PRESENT_IN_LIVE`.

## 2. Observed live topology (raw)

Additional live workflows observed but OUT_OF_SCOPE per testing scope:
- `cD8aHWo34XWEixcy` — WF-00 Morning Briefing
- `0SsP6OLY4LbOPmzG` — WF-01: Message Receiver (inactive)
- `rooFWDryqC0YDyVa` — DEPRECATED__WF-MO-01_langchain_stub (inactive)

These are ignored for all workflow-local, edge, and full-chain testing.

## 3. DB touchpoint summary (derived)

| WF | Owned/read tables (synthetic write scope) |
|---|---|
| WF-TR-01 | reads `messages`, `threads`; writes `thread_resolution_audit` |
| WF-EC-01 | writes `execution_contexts` (upsert) |
| WF-OR-01 | reads `execution_contexts` |
| WF-PL-01 | reads `execution_contexts` |
| WF-DI-01 | reads `execution_contexts`, `module_registry` (code-derived) |
| WF-ME-01 | reads `execution_contexts`; writes `tasks` (create/update/complete/delete) |
| WF-RA-01 | reads `execution_contexts`, `module_results` |
| WF-RC-01 | reads `execution_contexts`, `threads` |
| WF-MO-01 | reads `execution_contexts`, `threads`; writes `outbound_delivery_ledger_claude_mcp` (idempotency ledger) |
| WF-SU-01 | writes `execution_contexts`, `threads`, `tasks`, `reminders`, `messages`, `rag_memories` (per declared write classes) |

## 4. Known limits / risks per WF

- **WF-TR-01** — pre-live; no `tr_logic.py`; no `test_families.py`; migration `MIGRATION_messages_for_WF-TR-01.sql` pending.
- **WF-OR-01** — empty `reports/`; no closure/audit doc.
- **WF-RC-01** — pre-live; 6 misfiled reports in `docs/`.
- **WF-MO-01** — pre-live; `MO_Send_Channel_PLACEHOLDER` requires live provider binding.
- **WF-EC-01** — `current_plan_ref` schema drift (varchar(200) vs uuid); non-blocking.
- **WF-EC-01** — custom `idempotency_key` cross-tenant caveat.
- **WF-SU-01** — JS scripts (not Python) on the harness side; nested `tests/su/`.
