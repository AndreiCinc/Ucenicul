# INVENTORY_CLASSIFICATION

Run ID: `run_2026-04-19_autonomous`
Classification scheme: `canonical` | `supporting` | `patch` | `historical` | `stale` | `foreign` | `missing_dependency` | `generated_run_artifact`
Source of truth: `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §4 (lookup order), §8 (file classification).

This is a classification pass only. No files are moved, overwritten, or deleted at this stage. The remediation pass (see `RUN_QUEUE.md`) acts on the entries labelled `missing_dependency`.

## 1. WF-TR-01 Thread Resolver

Tier hint: **STANDARD** (MCP trigger; has patches; no closure report at root; no STATE file; no live-verification proof on disk).

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | Short, adequate; matches template §6.1 minima. |
| `workflow/WF-TR-01_Thread_Resolver.json` | canonical | Implementation truth. |
| `workflow/patches/WF-TR-01_PATCHED_switch_fix.json` | patch | Overlay per the patches/ README. |
| `workflow/patches/README.md` | canonical (within its subfolder) | Explains overlay status. |
| `docs/contracts/ThreadResolutionContracts.md` | canonical (contracts) | Equivalent of `docs/WF-TR-01_CONTRACTS.md`; nested but canonical by content. |
| `docs/WF-TR-01_MCP_Technical_Sheet.md` | supporting | MCP trigger reference sheet. |
| `docs/handoffs/HANDOFF_WF-TR-01_2026-04-16.md` | historical | Dated handoff; preserved. |
| `docs/handoffs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` | historical / foreign-ish | Pertains to EC-01 init kickoff; duplicate copy lives under EC-01. Keep in place; do not relocate. |
| `docs/IMPORT_WF-TR-01.md` | historical | Pre-live import note. |
| `docs/TEST_AFTER_IMPORT_WF-TR-01.md` | historical | Post-import test note. |
| `docs/desktop.ini` | foreign (OS metadata) | Windows/OneDrive leftover. Exclude from package. |
| `docs/README.md` | missing_dependency | Subfolder contains files; per standard §3, a README is required. |
| `reports/REMEDIATION_REPORT_WF-TR-01.md` | supporting | Remediation narrative. |
| `reports/TEST_REPORT_WF-TR-01.md` | supporting | Test narrative. |
| `reports/README.md` | missing_dependency | Subfolder README missing. |
| `sql/MIGRATION_messages_for_WF-TR-01.sql` | canonical (within sql/) | Migration file. |
| `sql/README.md` | missing_dependency | Subfolder has files but no README. |
| `tests/fixtures/TC-01..TC-16*.json` | canonical (tests/) | 17 test-case fixtures. |
| `tests/README.md` | missing_dependency | Subfolder README missing (fixtures/ inside it; direct fixtures/ README also missing — tests/ README alone is sufficient). |
| `scripts/` | empty | No README needed (empty subfolder). |
| `assets/` | empty | Reserved. |
| `state/` | **missing subtree** | Required for STANDARD tier per standard §3. |
| `docs/WF-TR-01_TEST_MATRIX.md` | missing_dependency | STANDARD+ required. Explicit gap. |

## 2. WF-EC-01 Execution Context

Tier hint: **STANDARD** (has closure report; 1 trigger; no LIVE_EXECUTIONS on disk).

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | Short status card. |
| `workflow/WF-EC-01_Execution_Context.json` | canonical | Implementation truth. |
| `workflow/README.md` | missing_dependency | Single file in workflow/; README optional but recommended. Lower priority. |
| `docs/WF-EC-01_NODE_MAP.md` | supporting | CRITICAL-only artifact in the canonical standard; present but explainable at STANDARD due to EC-01 historical pre-live audit pass. Keep as supporting. |
| `docs/WF-EC-01_CONNECTION_MAP.md` | supporting | Same as above. |
| `docs/WF-EC-01_IMPORT_PATCH_PLAN.md` | supporting | CRITICAL-only at canonical standard but present from historical pass. |
| `docs/WF-EC-01_CLOSURE_CONTRACT.md` | canonical (contracts proxy) | Per-file content defines callable interface; may stand in for `WF-EC-01_CONTRACTS.md`. |
| `docs/WF-EC-01_CLOSURE_PLAN.md` | historical | Planning artifact from closure pass. |
| `docs/WF-EC-01_LIVE_REALITY_CHECK.md` | supporting | Live reality check report. |
| `docs/06_STAGE_WF-EC-01.md` | historical | Stage ledger. |
| `docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` | canonical (local) | Handoff reference; canonical here (also copied under TR-01/docs/handoffs). |
| `docs/desktop.ini` | foreign | OS leftover. |
| `docs/README.md` | missing_dependency | Subfolder has many files; README required. |
| `reports/AUDIT_REPORT_WF-EC-01.md` | supporting | Audit narrative. |
| `reports/BUILD_REPORT_WF-EC-01.md` | supporting | Build narrative. |
| `reports/CLOSURE_REPORT_WF-EC-01.md` | canonical (closure category, STANDARD+) | Closure evidence. |
| `reports/FIX_LOG_WF-EC-01.md` | canonical (FIX_LOG category) | Append-only fix log. |
| `reports/POST_IMPORT_AUDIT_WF-EC-01.md` | supporting | Post-import audit narrative. |
| `reports/README.md` | missing_dependency | Subfolder README missing. |
| `scripts/ec_logic.py` | canonical (scripts/) | Off-node logic. |
| `scripts/README.md` | missing_dependency | Subfolder README missing. |
| `sql/*.sql` (6 files) | canonical (sql/) | Postgres queries. |
| `sql/README.md` | missing_dependency | Subfolder README missing. |
| `tests/test_families.py`, `tests/results/` | canonical (tests/) | Tests and results. |
| `tests/README.md` | missing_dependency | Subfolder README missing. |
| `state/` | **missing subtree** | No state folder. STATE lives nowhere on disk for EC-01. Must create per §5.7. |
| `docs/WF-EC-01_TEST_MATRIX.md` | missing_dependency | STANDARD+ required. Explicit gap. |
| `assets/` | empty or minimal | Reserved. |

## 3. WF-OR-01 Orchestrator

Tier hint: **STANDARD** (1 trigger, switches, no closure report yet).

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | Short status card. |
| `workflow/WF-OR-01_Orchestrator_Input_Handoff.json` | canonical | Implementation truth (name diverges from template `<WF>_<Name>.json`; see Canonicality Decision §3). |
| `workflow/WF-OR-01_blueprint.json` | **stale / duplicate-canonical** | Full-JSON duplicate of implementation, not a slim metadata summary. Per standard §5.3: "a blueprint that is a byte-for-byte copy of the workflow JSON is a bug". Needs slimming OR reclassification to historical. Recorded as gap; no write in this pass (duplicate-canonical resolution requires dominance evidence — see CANONICALITY_DECISION §3). |
| `workflow/README.md` | missing_dependency | Two JSON files present — a workflow/README is required by standard §3. |
| `docs/WF-OR-01_NODE_MAP.md` | supporting | Historical from pre-standard pass. |
| `docs/WF-OR-01_CONNECTION_MAP.md` | supporting | Same. |
| `docs/WF-OR-01_IMPORT_PATCH_PLAN.md` | supporting | Same. |
| `docs/desktop.ini` | foreign | OS leftover. |
| `docs/README.md` | missing_dependency | Required. |
| `reports/` | empty | OK to have no README when empty. |
| `scripts/or_logic.py` | canonical (scripts/) | Off-node logic. |
| `scripts/README.md` | missing_dependency | Subfolder README missing. |
| `sql/*.sql` (6 files) | canonical (sql/) | Queries. |
| `sql/README.md` | missing_dependency | Subfolder README missing. |
| `tests/test_families.py`, `tests/results/` | canonical (tests/) | Tests. |
| `tests/README.md` | missing_dependency | Subfolder README missing. |
| `state/` | **missing subtree** | No state folder. |
| `docs/WF-OR-01_CONTRACTS.md` | missing_dependency | STANDARD+ required. Explicit gap. |
| `docs/WF-OR-01_TEST_MATRIX.md` | missing_dependency | STANDARD+ required. Explicit gap. |

## 4. WF-PL-01 Plan Generation

Tier hint: **STANDARD** (explicit evidence: `reports/STATE__WF-PL-01.json` → `status: closed, score: 10/10` and live-runtime proof; CRITICAL posture after closure, but CRITICAL tier is opt-in per standard §2 and not explicitly declared — preserve STANDARD-with-rich-reports classification).

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | Status card (needs to reflect closed posture; record as gap, do not edit in this pass unless it actively contradicts evidence). |
| `workflow/WF-PL-01_Plan_Generation.json` | canonical | Implementation truth (21 035 B). Matches STATE's `live_v1_1_patch.json_on_disk`. |
| `workflow/WF-PL-01_blueprint.json` | **stale / duplicate-canonical** | Full-JSON duplicate per CANONICALITY_DECISION §4. |
| `workflow/README.md` | missing_dependency | Two JSONs — README required. |
| `docs/WF-PL-01_NODE_MAP.md` | supporting | Historical. |
| `docs/WF-PL-01_CONNECTION_MAP.md` | supporting | Historical. |
| `docs/WF-PL-01_IMPORT_PATCH_PLAN.md` | supporting | Historical. |
| `docs/07_STAGE_WF-PL-01.md` | historical | Stage ledger. |
| `docs/desktop.ini` | foreign | OS leftover. |
| `docs/README.md` | missing_dependency | Required. |
| `reports/AUDIT_REPORT__WF-PL-01.md` | supporting | Audit. |
| `reports/BUILD_REPORT__WF-PL-01.md` | supporting | Build. |
| `reports/CLOSURE_REPORT__WF-PL-01.md` | canonical (closure) | Closure evidence; references 10/10 score. |
| `reports/CURRENT_STAGE__WF-PL-01.md` | supporting | Stage pointer. |
| `reports/FIX_LOG__WF-PL-01.md` | canonical (FIX_LOG) | Append-only log. |
| `reports/STATE__WF-PL-01.json` | **foreign (misfile)** | STATE is a state file, not a report. Per standard §3 it belongs in `state/STATE__WF-PL-01.json`. Queued for relocation / duplication (see §5.5 / §9 of standard). |
| `reports/README.md` | missing_dependency | Required. |
| `scripts/pl_logic.py` | canonical (scripts/) | |
| `scripts/README.md` | missing_dependency | Required. |
| `sql/*.sql` (6) | canonical (sql/) | |
| `sql/README.md` | missing_dependency | Required. |
| `tests/test_families.py`, `tests/results/` | canonical (tests/) | |
| `tests/README.md` | missing_dependency | Required. |
| `state/` | **missing subtree** | STATE exists only under reports/. Canonical location is state/. |
| `docs/WF-PL-01_CONTRACTS.md` | missing_dependency | STANDARD+ required. Explicit gap. |
| `docs/WF-PL-01_TEST_MATRIX.md` | missing_dependency | STANDARD+ required. Explicit gap. |

## 5. WF-DI-01 Dispatcher

Tier hint: **STANDARD** (mirrors PL-01 shape; STATE + CLOSURE on disk).

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | Status card. |
| `workflow/WF-DI-01_Dispatcher.json` | canonical | Implementation. |
| `workflow/WF-DI-01_blueprint.json` | **stale / duplicate-canonical** | Full-JSON duplicate. |
| `workflow/README.md` | missing_dependency | Two JSONs — required. |
| `docs/00_ROUTE_MAP__WF-DI-01.md` | supporting | Route map. |
| `docs/08_STAGE_WF-DI-01.md` | historical | Stage ledger. |
| `docs/17_STAGE_LOCK__WF-DI-01.md` | supporting | Stage lock. |
| `docs/WF-DI-01_NODE_MAP.md` | supporting | Historical. |
| `docs/WF-DI-01_CONNECTION_MAP.md` | supporting | Historical. |
| `docs/WF-DI-01_IMPORT_PATCH_PLAN.md` | supporting | Historical. |
| `docs/desktop.ini` | foreign | OS leftover. |
| `docs/README.md` | missing_dependency | Required. |
| `reports/AUDIT_REPORT__WF-DI-01.md` | supporting | |
| `reports/BUILD_REPORT__WF-DI-01.md` | supporting | |
| `reports/CLOSURE_REPORT__WF-DI-01.md` | canonical (closure) | |
| `reports/CURRENT_STAGE__WF-DI-01.md` | supporting | |
| `reports/FIX_LOG__WF-DI-01.md` | canonical (FIX_LOG) | |
| `reports/STATE__WF-DI-01.json` | **foreign (misfile)** | Canonical location is state/. |
| `reports/README.md` | missing_dependency | |
| `scripts/di_logic.py` | canonical (scripts/) | |
| `scripts/README.md` | missing_dependency | |
| `sql/*.sql` (7) | canonical (sql/) | |
| `sql/README.md` | missing_dependency | |
| `tests/test_families.py`, `tests/results/` | canonical (tests/) | |
| `tests/README.md` | missing_dependency | |
| `state/` | **missing subtree** | |
| `docs/WF-DI-01_CONTRACTS.md` | missing_dependency | STANDARD+ required. |
| `docs/WF-DI-01_TEST_MATRIX.md` | missing_dependency | STANDARD+ required. |

## 6. WF-ME-01 Module Execution

Tier hint: **STANDARD** (TEST_MATRIX already present; multiple branches).

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | |
| `workflow/WF-ME-01_Module_Execution.json` | canonical | Implementation. |
| `workflow/WF-ME-01_blueprint.json` | candidate slim-blueprint (10 134 B) vs duplicate | Needs inspection during remediation pass to decide slim vs dup. Record as `supporting` provisionally, pending inspection. |
| `workflow/README.md` | missing_dependency | Two JSONs — required. |
| `docs/00_ROUTE_MAP__WF-ME-01.md` | supporting | Route map. |
| `docs/09_STAGE_WF-ME-01.md` | historical | Stage ledger. |
| `docs/17_STAGE_LOCK__WF-ME-01.md` | supporting | |
| `docs/WF-ME-01_NODE_MAP.md` | supporting | |
| `docs/WF-ME-01_CONNECTION_MAP.md` | supporting | |
| `docs/WF-ME-01_IMPORT_PATCH_PLAN.md` | supporting | |
| `docs/WF-ME-01_TEST_MATRIX.md` | canonical (TEST_MATRIX) | STANDARD+ satisfied for test matrix. |
| `docs/desktop.ini` | foreign | |
| `docs/README.md` | missing_dependency | |
| `reports/AUDIT_REPORT__WF-ME-01.md` | supporting | |
| `reports/BUILD_REPORT__WF-ME-01.md` | supporting | |
| `reports/CLOSURE_REPORT__WF-ME-01.md` | canonical (closure) | |
| `reports/CURRENT_STAGE__WF-ME-01.md` | supporting | |
| `reports/FIX_LOG__WF-ME-01.md` | canonical (FIX_LOG) | |
| `reports/README.md` | missing_dependency | |
| `scripts/me_logic.py` | canonical (scripts/) | |
| `scripts/README.md` | missing_dependency | |
| `sql/*.sql` (12) | canonical (sql/) | |
| `sql/README.md` | missing_dependency | |
| `tests/test_families.py`, `tests/results/` | canonical (tests/) | |
| `tests/README.md` | missing_dependency | |
| `state/` | **missing subtree** | STATE not on disk; must create with conservative/minimal fields. |
| `docs/WF-ME-01_CONTRACTS.md` | missing_dependency | STANDARD+ required. |

## 7. WF-RA-01 Result Aggregator

Tier hint: **STANDARD** (CLOSURE, FINAL_STAGE_POSTURE present; may promote to CRITICAL if posture is live-verified — STATE file missing, so no explicit tier declaration).

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | |
| `workflow/WF-RA-01_Result_Aggregator_LIVE.json` | canonical | Implementation (LIVE suffix in filename). |
| `workflow/drafts/` | supporting / historical | Drafts subfolder. |
| `workflow/README.md` | missing_dependency | Needed when subfolders/files are non-trivial. |
| `docs/00_ROUTE_MAP__WF-RA-01_ACTIVATED.md` | supporting | |
| `docs/10_STAGE_WF-RA-01.md` | historical | |
| `docs/17_ACTIVE_STAGE_LOCK__WF-RA-01.md` | supporting | |
| `docs/WF-RA-01_NODE_MAP.md` | supporting | |
| `docs/WF-RA-01_CONNECTION_MAP.md` | supporting | |
| `docs/WF-RA-01_IMPORT_PATCH_PLAN.md` | supporting | |
| `docs/WF-RA-01_TEST_MATRIX.md` | canonical (TEST_MATRIX) | |
| `docs/desktop.ini` | foreign | |
| `docs/README.md` | missing_dependency | |
| `reports/AUDIT_REPORT__WF-RA-01.md` | supporting | |
| `reports/BUILD_REPORT__WF-RA-01.md` | supporting | |
| `reports/CLOSURE_REPORT__WF-RA-01.md` | canonical (closure) | |
| `reports/CURRENT_STAGE__WF-RA-01.md` | supporting | |
| `reports/FINAL_STAGE_POSTURE__WF-RA-01.md` | supporting | |
| `reports/FIX_LOG__WF-RA-01.md` | canonical (FIX_LOG) | |
| `reports/README.md` | missing_dependency | |
| `scripts/ra_logic.py` | canonical (scripts/) | |
| `scripts/README.md` | missing_dependency | |
| `sql/*.sql` (9) | canonical (sql/) | |
| `sql/README.md` | missing_dependency | |
| `tests/test_families.py`, `tests/results/` | canonical (tests/) | |
| `tests/README.md` | missing_dependency | |
| `state/` | **missing subtree** | |
| `docs/WF-RA-01_CONTRACTS.md` | missing_dependency | STANDARD+ required. |

## 8. WF-SU-01 State Persistence Updater

Tier hint: **STANDARD / CRITICAL-leaning** (VERIFIER_DELIVERY, SU_LIVE_EXECUTIONS, SU_RESULTS on disk → CRITICAL evidence present). Treat as **STANDARD with explicit CRITICAL-grade reports** so we don't force-promote without a declared `tier: critical` in a state file.

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | |
| `workflow/WF-SU-01_State_Persistence_Updater.json` | canonical | Implementation. |
| `workflow/SU_PINDATA_ENVELOPES.json` | supporting | Pindata / fixture envelopes; not the canonical workflow export. |
| `workflow/SU_Build_Downstream_Envelope_TOLERANT_JSCODE.js` | **foreign (misfile)** | This is a code-node export. Canonical location is `scripts/`, not `workflow/`. Queued for relocation (can be copied because delete is gated; record as explicit gap). |
| `workflow/README.md` | missing_dependency | Multiple non-canonical files in workflow/. |
| `docs/WF-SU-01_NODE_MAP.md` | supporting | |
| `docs/WF-SU-01_CONNECTION_MAP.md` | supporting | |
| `docs/WF-SU-01_IMPORT_PATCH_PLAN.md` | supporting | |
| `docs/WF-SU-01_TEST_MATRIX.md` | canonical (TEST_MATRIX) | |
| `docs/desktop.ini` | foreign | |
| `docs/README.md` | missing_dependency | |
| `reports/CLOSURE_REPORT_WF-SU-01.md` | canonical (closure) | |
| `reports/STATE_WF-SU-01.json` | **foreign (misfile + naming drift)** | Both: wrong location (should be in state/) and wrong filename separator (`STATE_WF-SU-01.json` vs template `STATE__WF-SU-01.json` with double underscore). |
| `reports/SU_LIVE_EXECUTIONS.md` | canonical (LIVE_EXECUTIONS) | CRITICAL-grade proof. |
| `reports/SU_RESULTS.md` | supporting | |
| `reports/WF-SU-01_VERIFIER_DELIVERY.md` | canonical (VERIFIER_DELIVERY) | CRITICAL-grade. |
| `reports/README.md` | missing_dependency | |
| `scripts/SU_BUILD_ENVELOPE_TOLERANT_JSCODE.js` | canonical (scripts/) | |
| `scripts/README.md` | missing_dependency | |
| `sql/` | empty | No SQL in this WF. |
| `tests/su/` | canonical (tests/) | |
| `tests/README.md` | missing_dependency | |
| `state/` | **missing subtree** | STATE exists under reports/ with drift name; must create canonical state/STATE__WF-SU-01.json. |
| `docs/WF-SU-01_CONTRACTS.md` | missing_dependency | STANDARD+ required. |

## 9. WF-MO-01 Message Out / Output Gateway

Tier hint: **CRITICAL-candidate** per standard §2 Example B (outbound provider calls + replay guard + terminal stage). Blueprint is slim-compliant.

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | |
| `workflow/WF-MO-01_Message_Out.json` | canonical | Implementation. |
| `workflow/WF-MO-01_blueprint.json` | supporting (slim metadata) | Compliant with §5.3. |
| `workflow/README.md` | missing_dependency | Two files. |
| `docs/WF-MO-01_NODE_MAP.md` | supporting | |
| `docs/WF-MO-01_CONNECTION_MAP.md` | supporting | |
| `docs/WF-MO-01_IMPORT_PATCH_PLAN.md` | supporting | |
| `docs/WF-MO-01_TEST_MATRIX.md` | canonical (TEST_MATRIX) | |
| `docs/ucenicul_claude_handoff_hardened/` | canonical (nested handoff bundle, allowed per §3) | |
| `docs/README.md` | missing_dependency | |
| `reports/CLAUDE_PROMPT__WF-MO-01.txt` | canonical (within reports; apply-first pack instructions) | |
| `reports/README_APPLY_FIRST.md` | canonical (apply-first instructions) | |
| `reports/SHA256SUMS.txt` | supporting (integrity anchor) | Pre-fold paths acceptable per standard note. |
| `reports/README.md` | missing_dependency | |
| `scripts/mo_logic.py`, `scripts/__init__.py` | canonical (scripts/) | |
| `scripts/README.md` | missing_dependency | |
| `sql/*.sql` (10) | canonical (sql/) | |
| `sql/README.md` | missing_dependency | |
| `tests/test_families.py`, `tests/__init__.py`, `tests/results/` | canonical (tests/) | |
| `tests/README.md` | missing_dependency | |
| `state/` | **missing subtree** | |
| `docs/WF-MO-01_CONTRACTS.md` | missing_dependency | STANDARD+ required. |

## 10. WF-RC-01 Response Composer

Tier hint: **STANDARD-with-CRITICAL-shaped-reports** (AUDIT/BUILD/CLOSURE/FIX_LOG/CURRENT_STAGE/STATE are present — but are located inside `docs/`, not `reports/`).

| File / subtree | Class | Note |
|---|---|---|
| `README.md` | canonical | |
| `workflow/WF-RC-01_Response_Composer.json` | canonical | Implementation. |
| `workflow/WF-RC-01_blueprint.json` | supporting (slim metadata) | Compliant with §5.3. |
| `workflow/README.md` | missing_dependency | Two files. |
| `docs/00_ROUTE_MAP__WF-RC-01_ACTIVATED.md` | supporting | |
| `docs/12_STAGE_WF-RC-01.md` | historical | |
| `docs/17_ACTIVE_STAGE_LOCK__WF-RC-01.md` | supporting | |
| `docs/AUDIT_REPORT__WF-RC-01.md` | **foreign (misfile)** | AUDIT_REPORT belongs in reports/, not docs/. |
| `docs/BUILD_REPORT__WF-RC-01.md` | **foreign (misfile)** | BUILD_REPORT belongs in reports/. |
| `docs/CLOSURE_REPORT__WF-RC-01.md` | **foreign (misfile)** | CLOSURE_REPORT belongs in reports/. |
| `docs/CURRENT_STAGE__WF-RC-01.md` | **foreign (misfile)** | Current-stage report belongs in reports/. |
| `docs/FIX_LOG__WF-RC-01.md` | **foreign (misfile)** | FIX_LOG belongs in reports/. |
| `docs/STATE__WF-RC-01.json` | **foreign (misfile)** | STATE belongs in state/. |
| `docs/WF-RC-01_NODE_MAP.md` | supporting | |
| `docs/WF-RC-01_CONNECTION_MAP.md` | supporting | |
| `docs/WF-RC-01_IMPORT_PATCH_PLAN.md` | supporting | |
| `docs/WF-RC-01_TEST_MATRIX.md` | canonical (TEST_MATRIX) | |
| `docs/README.md` | missing_dependency | |
| `reports/README_APPLY_FIRST.md` | canonical (apply-first instructions) | |
| `reports/SHA256SUMS.txt` | supporting | |
| `reports/README.md` | missing_dependency | |
| `scripts/rc_logic.py` | canonical (scripts/) | |
| `scripts/README.md` | missing_dependency | |
| `sql/*.sql` (7) | canonical (sql/) | |
| `sql/README.md` | missing_dependency | |
| `tests/test_families.py`, `tests/results/` | canonical (tests/) | |
| `tests/README.md` | missing_dependency | |
| `state/` | **missing subtree** | |
| `docs/WF-RC-01_CONTRACTS.md` | missing_dependency | STANDARD+ required. |

## 11. Aggregate gap summary

| Gap | Count (across 10 WFs) | Remediation strategy for this run |
|---|---|---|
| `state/` subfolder missing | 10/10 | **Create** (minimum: `state/README.md` + `state/STATE__<WF>.json`). Seed STATE from existing evidence (CLOSURE/FIX_LOG/STATE-in-reports where available); `TBD` / `null` when unknown. |
| Subfolder README missing where files exist | Many (docs/, reports/, sql/, scripts/, tests/, workflow/ across 10 WFs) | **Create** minimal subfolder READMEs per standard §6.2 only where the subfolder has non-trivial content. Empty subfolders skipped. |
| `WF-XX-01_CONTRACTS.md` missing | 9/10 (WF-EC-01 has CLOSURE_CONTRACT as a proxy; WF-TR-01 has nested `docs/contracts/ThreadResolutionContracts.md`) | **Record as explicit gap** (`PASS_WITH_EXPLICIT_GAPS` if this is the only residual). Do NOT invent a contract without strong canonical-source evidence. Minimal remediation preferred over fabrication. |
| `WF-XX-01_TEST_MATRIX.md` missing | 5/10 (present for ME, RA, SU, MO, RC; missing for TR, EC, OR, PL, DI) | **Record as explicit gap**. Do NOT fabricate test matrices. |
| STATE-file-misplaced (in reports/ or docs/) | 5 (WF-PL-01, WF-DI-01, WF-SU-01, WF-RC-01; potentially others) | **Create canonical `state/STATE__<WF>.json` authoritative, legacy copy documented as historical via state/README.md pointer.** Do not overwrite the legacy copy (preserve provenance). |
| Duplicate-full `<WF>_blueprint.json` (not slim) | 4 (WF-OR-01, WF-PL-01, WF-DI-01, WF-ME-01 may need inspection) | **Record as explicit gap.** Do not auto-slim in this pass; canonical is clear (`WF-XX-01_<Name>.json`). Slimming is a larger refactor; note in FIX_LOG-equivalent only if future pass requires. |
| `desktop.ini` files in docs/ | 7 | Classify as foreign (OS leftover). Not deleted (delete gated). Exclude from package. |
| Report-files in docs/ for WF-RC-01 | 6 | **Record as foreign misfile.** Move would require delete of origin; delete is gated. This pass documents the misplacement and creates a pointer in the canonical-location README. |
| Code-node JS in workflow/ for WF-SU-01 | 1 | Same reasoning as above. Documented. |

This inventory is the authoritative input for the remediation plan in `RUN_QUEUE.md`.
