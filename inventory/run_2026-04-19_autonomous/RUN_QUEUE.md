# RUN_QUEUE

Run ID: `run_2026-04-19_autonomous`
Built after discovery (per `RUN_SCOPE_QUEUE.md` Step 4) and after canonicality decisions.

## 1. Processing order (deterministic)

Order chosen by: declared tier (all STANDARD in this pass), then architectural order in the pipeline (upstream → downstream), so any WF that consumes another's output is processed after the producer. This keeps the canonical-location STATE files internally consistent when cross-referenced.

| # | WF code | Folder | Tier (for this run) | Expected verdict |
|---|---|---|---|---|
| 1 | WF-TR-01 | `WF-TR-01_Thread_Resolver` | standard | PASS_WITH_EXPLICIT_GAPS |
| 2 | WF-EC-01 | `WF-EC-01_Execution_Context` | standard | PASS_WITH_EXPLICIT_GAPS |
| 3 | WF-OR-01 | `WF-OR-01_Orchestrator` | standard | PASS_WITH_EXPLICIT_GAPS |
| 4 | WF-PL-01 | `WF-PL-01_Plan_Generation` | standard | PASS_WITH_EXPLICIT_GAPS |
| 5 | WF-DI-01 | `WF-DI-01_Dispatcher` | standard | PASS_WITH_EXPLICIT_GAPS |
| 6 | WF-ME-01 | `WF-ME-01_Module_Execution` | standard | PASS_WITH_EXPLICIT_GAPS |
| 7 | WF-RA-01 | `WF-RA-01_Result_Aggregator` | standard | PASS_WITH_EXPLICIT_GAPS |
| 8 | WF-SU-01 | `WF-SU-01_State_Persistence_Updater` | standard | PASS_WITH_EXPLICIT_GAPS |
| 9 | WF-RC-01 | `WF-RC-01_Response_Composer` | standard | PASS_WITH_EXPLICIT_GAPS |
| 10 | WF-MO-01 | `WF-MO-01_Message_Out_Output_Gateway` | standard | PASS_WITH_EXPLICIT_GAPS |

## 2. Off-queue classifications

| Candidate | Disposition | Reason |
|---|---|---|
| `_ARCHIVED_Executor_Closer_stub/` | ARCHIVED_ONLY | Documented in its own README; not an active WF. No processing. |
| WF-00 Morning Briefing | REFERENCED_ONLY | No repo folder. Seed manifest does not include it. |
| WF-01 Message Receiver | REFERENCED_ONLY | No repo folder. Seed manifest does not include it. |
| `brain_main_inbound_mvp_v6_preprocessor_fixed` (monolith) | OUT_OF_SCOPE | Monolith, not a modular WF. |
| `DEPRECATED__WF-MO-01_langchain_stub` (n8n side) | OUT_OF_SCOPE | Deprecated, no repo folder. |

No workflow is expected to reach `QUARANTINED` under the minimum-touch scope.

## 3. Per-workflow fixed remediation template

For each in-scope WF, the remediation pass does exactly these write operations in this order:

1. `state/README.md` — create per standard §6.2 template (subfolder README).
2. `state/STATE__<WF>.json` — create per standard §5.7 minimal keys + optional evidence fields seeded from existing on-disk evidence (CLOSURE_REPORT, reports/STATE, docs/STATE).
3. **Subfolder READMEs** where missing and the subfolder has files:
   - `docs/README.md` (if docs/ non-empty without README)
   - `reports/README.md` (if reports/ non-empty without README)
   - `sql/README.md` (if sql/ non-empty without README)
   - `scripts/README.md` (if scripts/ non-empty without README)
   - `tests/README.md` (if tests/ non-empty without README)
   - `workflow/README.md` (if workflow/ has >1 file or subfolders)
4. **WORKFLOW_RUN_RECORD__<WF>.md** — inside `inventory/run_2026-04-19_autonomous/` — audit + remediation + re-audit + verdict summary.

No writes happen inside any other workflow. No writes happen outside `workflows/<WF>/` for per-WF artifacts, except the per-WF run record which lives in `inventory/run_2026-04-19_autonomous/`.

## 4. Subprocess/parallel model

Sequential processing per `04_PARALLEL_SUBPROCESS_POLICY.md` fallback clause ("if the environment does not support real subprocesses, simulate the same discipline sequentially"). No parallel agent dispatch for this run because each WF's write set is small and the coordinator overhead would exceed the benefit.

## 5. Maximum remediation passes per WF

2. After the second pass, a WF that still fails canonical acceptance criteria §10 of the standard is quarantined.

## 6. Success metric

A run is `COMPLETE` when:

- discovery report exists (✓ already written),
- classification report exists (✓),
- canonicality report exists (✓),
- standardization decision exists (✓),
- run queue exists (this file, ✓),
- every row in §1 has a final verdict (`PASS`, `PASS_WITH_EXPLICIT_GAPS`, or `QUARANTINED`),
- global summary exists.

Now entering the per-workflow loop.
