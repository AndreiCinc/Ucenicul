# workflows/

One folder per workflow. Each `WF-<CODE>-01_<Name>/` contains the standard skeleton:

| Subfolder | Content |
|---|---|
| `workflow/` | n8n blueprint JSONs (the canonical artifact) |
| `docs/` | node maps, connection maps, import patch plans, test matrices, stage docs, contracts, handoffs |
| `sql/` | workflow-specific SQL |
| `scripts/` | workflow-specific Python / JavaScript logic |
| `tests/` | test families, results, fixtures |
| `reports/` | AUDIT / BUILD / CLOSURE / FIX_LOG / WORK_LOG / POST_IMPORT_AUDIT / REMEDIATION / TEST_REPORT / TEST_AFTER_IMPORT / PENDING_WIRING |
| `assets/` | UI assets, screenshots, other binaries |

## Active workflow folders

| Code | Folder | Role (matches live n8n name) | Skeleton | Populated? |
|---|---|---|---|---|
| WF-DI-01 | [WF-DI-01_Dispatcher](./WF-DI-01_Dispatcher/) | Dispatcher | standard | scaffold |
| WF-EC-01 | [WF-EC-01_Execution_Context](./WF-EC-01_Execution_Context/) | Execution Context | standard | scaffold |
| WF-ME-01 | [WF-ME-01_Module_Execution](./WF-ME-01_Module_Execution/) | Module Execution | standard | scaffold |
| WF-MO-01 | [WF-MO-01_Message_Out_Output_Gateway](./WF-MO-01_Message_Out_Output_Gateway/) | Message Out / Output Gateway | standard | **populated** (pre_live_ready) |
| WF-OR-01 | [WF-OR-01_Orchestrator](./WF-OR-01_Orchestrator/) | Orchestrator | standard | scaffold |
| WF-PL-01 | [WF-PL-01_Plan_Generation](./WF-PL-01_Plan_Generation/) | Plan Generation | standard | scaffold |
| WF-RA-01 | [WF-RA-01_Result_Aggregator](./WF-RA-01_Result_Aggregator/) | Result Aggregator | standard | scaffold |
| WF-RC-01 | [WF-RC-01_Response_Composer](./WF-RC-01_Response_Composer/) | Response Composer | standard | **populated** (pre_live_ready) |
| WF-SU-01 | [WF-SU-01_State_Persistence_Updater](./WF-SU-01_State_Persistence_Updater/) | State / Persistence Updater | standard | scaffold |
| WF-TR-01 | [WF-TR-01_Thread_Resolver](./WF-TR-01_Thread_Resolver/) | Thread Resolver | standard | scaffold |

**Population status legend:**
- `scaffold` — folder exists with 7 canonical subfolders and a status-card README; no blueprint/docs/scripts/sql/tests content yet.
- `populated` — all subfolders carry real content (blueprint JSON in `workflow/`, shell docs in `docs/`, SQL in `sql/`, off-node logic in `scripts/`, off-node tests in `tests/`, pack artifacts in `reports/`). Pack posture (e.g. `pre_live_ready`, `live_closed`) is tracked in the folder's own README status card.

All 10 target-architecture workflows (DI, EC, ME, MO, OR, PL, RA, RC, SU, TR) have a repo folder. RC-01 and MO-01 are populated (handoff packs re-folded into canonical layout on 2026-04-19). The remaining 8 are scaffolds — full population is scheduled per `inventory/WORKFLOW_COVERAGE_AUDIT.md` §F.3 / task #24.

## Non-workflow entries

- `_ARCHIVED_Executor_Closer_stub/` — vestigial folder from an earlier naming mismatch. Not a workflow. Not part of the active index. Retained because the mount cannot delete it. See its own `README.md` for details.

## Notes for agents loading this folder

- Every entry in the active table above has a unique WF code. No two active folders share a code.
- Folders starting with `_` (e.g. `_ARCHIVED_...`) are not workflows and should be skipped by any index keyed on the `WF-<CODE>-01` pattern.
- Folder name MUST match the live n8n workflow name modulo punctuation, using underscores (never spaces, never dashes as separators):
  - `WF-RC-01 Response Composer` (n8n) → `WF-RC-01_Response_Composer` (repo)
  - `WF-MO-01 Message Out / Output Gateway` (n8n) → `WF-MO-01_Message_Out_Output_Gateway` (repo)
  - `WF-SU-01 State / Persistence Updater` (n8n) → `WF-SU-01_State_Persistence_Updater` (repo)
  - Naming drift is audited by the `wf-audit` skill and auto-flagged.
- Docs layout per workflow may be either FLAT (handoff bundle files directly in `docs/`, like RC-01) or NESTED (wrapped in `docs/ucenicul_claude_handoff_hardened/`, like MO-01). Both are canonically valid.
- `reports/SHA256SUMS.txt` entries may reference pre-fold paths (e.g. `workflows/WF-XX-01_*.json`); this is historical. Post-fold file contents are unchanged; `wf-sync` re-anchors paths on next run.
