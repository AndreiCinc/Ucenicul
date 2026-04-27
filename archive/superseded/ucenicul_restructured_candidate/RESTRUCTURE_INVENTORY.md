# RESTRUCTURE_INVENTORY.md

> **Non-destructive parallel restructuring.** Source repo was not modified. Every row below records where an existing source file was copied into the new `ucenicul_restructured_candidate/` tree.

## Summary

- Source files inventoried: **278**
- Target files created (copies + new docs): **308** (278 byte-for-byte copies + 1 cross-workflow duplicate copy of `HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` + 29 new folder READMEs and root manifests)
- Unresolved placements: **0**
- Files sent to `archive/`: **78**
- Files sent to `common/`: **45** (46 if you count the repo-root README moved to `historical_reference/` as repo_root_README.md; total 46 includes the 7 common/ README files this pass authored)
- Files sent to `workflows/`: **168** (includes workflow READMEs this pass authored + 2 placeholder READMEs for WF-RA-01 and WF-RC-01)
- Collisions handled: **1** (root-level generic active-stage pointers vs. WF-ME-01 suffixed copies — resolved by placing generics in `archive/historical_snapshots/root_generic_active_stage_pointers/`)

## Mapping Table

Every row shows where an existing source file was copied. Source path is relative to repo root (`Ucenicul/`). Target path is relative to `ucenicul_restructured_candidate/`.

| Source Path | Target Path | Classification |
|---|---|---|
| `CLAUDE.md` | `common/contracts/CLAUDE.md` | common |
| `README.md` | `common/historical_reference/repo_root_README.md` | common |
| `db/README.md` | `common/architecture/db_README.md` | common |
| `db/schema/README.md` | `common/architecture/db_schema_README.md` | common |
| `docs/Architecture_Spec_v3_Ucenicul.md` | `common/architecture/Architecture_Spec_v3_Ucenicul.md` | common |
| `docs/Documentation_Verification_Checklist_Ucenicul.md` | `common/shared_reports/Documentation_Verification_Checklist_Ucenicul.md` | common |
| `docs/Memory_Model_Spec.md` | `common/architecture/Memory_Model_Spec.md` | common |
| `docs/Migration_Plan_Ucenicul.md` | `common/architecture/Migration_Plan_Ucenicul.md` | common |
| `docs/Module_Registry_Ucenicul.md` | `common/architecture/Module_Registry_Ucenicul.md` | common |
| `docs/Module_Spec_Memory.md` | `common/contracts/Module_Spec_Memory.md` | common |
| `docs/Module_Spec_Reminder.md` | `common/contracts/Module_Spec_Reminder.md` | common |
| `docs/Module_Spec_Response.md` | `common/contracts/Module_Spec_Response.md` | common |
| `docs/Module_Spec_Task.md` | `common/contracts/Module_Spec_Task.md` | common |
| `docs/Module_Spec_Watcher.md` | `common/contracts/Module_Spec_Watcher.md` | common |
| `docs/Thread_Resolution_Spec.md` | `common/architecture/Thread_Resolution_Spec.md` | common |
| `docs/n8n_Workflow_Mapping.md` | `common/architecture/n8n_Workflow_Mapping.md` | common |
| `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP.md` | `common/historical_reference/00_ROUTE_MAP__generic_root.md` | common |
| `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-DI-01_ACTIVATED.md` | `workflows/WF-DI-01/docs/00_ROUTE_MAP__WF-DI-01_ACTIVATED.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-DI-01_CLOSED.md` | `workflows/WF-DI-01/docs/00_ROUTE_MAP__WF-DI-01_CLOSED.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-ME-01_ACTIVATED.md` | `workflows/WF-ME-01/docs/00_ROUTE_MAP__WF-ME-01_ACTIVATED.md` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-OR-01_ACTIVATED.md` | `workflows/WF-OR-01/docs/00_ROUTE_MAP__WF-OR-01_ACTIVATED.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-PL-01_ACTIVATED.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-PL-01_ACTIVATED.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-PL-01_ACTIVATED.md` | `workflows/WF-PL-01/docs/00_ROUTE_MAP__WF-PL-01_ACTIVATED.md` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/01_MASTER_OPERATING_CONTRACT.md` | `common/contracts/01_MASTER_OPERATING_CONTRACT.md` | common |
| `docs/ucenicul_claude_handoff_hardened/02_AGENT_REGISTRY.md` | `common/contracts/02_AGENT_REGISTRY.md` | common |
| `docs/ucenicul_claude_handoff_hardened/03_EXECUTION_LOOP.md` | `common/contracts/03_EXECUTION_LOOP.md` | common |
| `docs/ucenicul_claude_handoff_hardened/04_N8N_MCP_PLAYBOOK.md` | `common/contracts/04_N8N_MCP_PLAYBOOK.md` | common |
| `docs/ucenicul_claude_handoff_hardened/05_DB_AUTONOMY_PLAYBOOK.md` | `common/contracts/05_DB_AUTONOMY_PLAYBOOK.md` | common |
| `docs/ucenicul_claude_handoff_hardened/06_STAGE_WF-EC-01.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/06_STAGE_WF-EC-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/06_STAGE_WF-EC-01.md` | `workflows/WF-EC-01/docs/06_STAGE_WF-EC-01.md` | workflow_specific / WF-EC-01 |
| `docs/ucenicul_claude_handoff_hardened/06_STAGE_WF-OR-01.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/06_STAGE_WF-OR-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/06_STAGE_WF-OR-01.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/06_STAGE_WF-OR-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/06_STAGE_WF-OR-01.md` | `workflows/WF-OR-01/docs/06_STAGE_WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/07_IMPEDIMENTS_AND_GUARDRAILS.md` | `common/contracts/07_IMPEDIMENTS_AND_GUARDRAILS.md` | common |
| `docs/ucenicul_claude_handoff_hardened/07_STAGE_WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/07_STAGE_WF-PL-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/07_STAGE_WF-PL-01.md` | `workflows/WF-PL-01/docs/07_STAGE_WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/08_SCORECARD_AND_GATES.md` | `common/contracts/08_SCORECARD_AND_GATES.md` | common |
| `docs/ucenicul_claude_handoff_hardened/08_STAGE_WF-DI-01.md` | `workflows/WF-DI-01/docs/08_STAGE_WF-DI-01.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/09_REPORT_TEMPLATES.md` | `common/shared_reports/09_REPORT_TEMPLATES.md` | common |
| `docs/ucenicul_claude_handoff_hardened/09_STAGE_WF-ME-01.md` | `workflows/WF-ME-01/docs/09_STAGE_WF-ME-01.md` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/10_FILE_SCORECARD.md` | `common/historical_reference/10_FILE_SCORECARD.md` | common |
| `docs/ucenicul_claude_handoff_hardened/11_DECISION_PRESETS.md` | `common/contracts/11_DECISION_PRESETS.md` | common |
| `docs/ucenicul_claude_handoff_hardened/12_TOOL_FAILURE_MATRIX.md` | `common/contracts/12_TOOL_FAILURE_MATRIX.md` | common |
| `docs/ucenicul_claude_handoff_hardened/13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md` | `common/contracts/13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md` | common |
| `docs/ucenicul_claude_handoff_hardened/14_TEST_FIXTURE_REGISTRY.md` | `common/shared_test_utils/14_TEST_FIXTURE_REGISTRY.md` | common |
| `docs/ucenicul_claude_handoff_hardened/15_STAGE_TEMPLATE.md` | `common/shared_reports/15_STAGE_TEMPLATE.md` | common |
| `docs/ucenicul_claude_handoff_hardened/16_AUTONOMOUS_STOP_AND_RECOVERY.md` | `common/contracts/16_AUTONOMOUS_STOP_AND_RECOVERY.md` | common |
| `docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK.md` | `common/contracts/17_ACTIVE_STAGE_LOCK.md` | common |
| `docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-DI-01.md` | `workflows/WF-DI-01/docs/17_ACTIVE_STAGE_LOCK__WF-DI-01.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-DI-01_CLOSED.md` | `workflows/WF-DI-01/docs/17_ACTIVE_STAGE_LOCK__WF-DI-01_CLOSED.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-ME-01.md` | `workflows/WF-ME-01/docs/17_ACTIVE_STAGE_LOCK__WF-ME-01.md` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-OR-01.md` | `workflows/WF-OR-01/docs/17_ACTIVE_STAGE_LOCK__WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-PL-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-PL-01.md` | `workflows/WF-PL-01/docs/17_ACTIVE_STAGE_LOCK__WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/18_RUNTIME_CANONICAL_TARGET.md` | `common/runtime/18_RUNTIME_CANONICAL_TARGET.md` | common |
| `docs/ucenicul_claude_handoff_hardened/19_MODULE_CONTRACTS.md` | `common/runtime/19_MODULE_CONTRACTS.md` | common |
| `docs/ucenicul_claude_handoff_hardened/20_EXECUTION_CONTEXT_EVOLUTION.md` | `common/runtime/20_EXECUTION_CONTEXT_EVOLUTION.md` | common |
| `docs/ucenicul_claude_handoff_hardened/21_RESPONSE_COMPOSER_CONTRACT.md` | `common/runtime/21_RESPONSE_COMPOSER_CONTRACT.md` | common |
| `docs/ucenicul_claude_handoff_hardened/AUDIT_REPORT.md` | `archive/historical_snapshots/root_generic_active_stage_pointers/AUDIT_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/AUDIT_REPORT__WF-DI-01.md` | `workflows/WF-DI-01/reports/AUDIT_REPORT__WF-DI-01.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/AUDIT_REPORT__WF-ME-01.md` | `workflows/WF-ME-01/reports/AUDIT_REPORT__WF-ME-01.md` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/AUDIT_REPORT__WF-OR-01.md` | `workflows/WF-OR-01/reports/AUDIT_REPORT__WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/AUDIT_REPORT__WF-PL-01.md` | `workflows/WF-PL-01/reports/AUDIT_REPORT__WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/BUILD_REPORT.md` | `archive/historical_snapshots/root_generic_active_stage_pointers/BUILD_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-DI-01.md` | `workflows/WF-DI-01/reports/BUILD_REPORT__WF-DI-01.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-ME-01.md` | `workflows/WF-ME-01/reports/BUILD_REPORT__WF-ME-01.md` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-OR-01.md` | `workflows/WF-OR-01/reports/BUILD_REPORT__WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-PL-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-PL-01.md` | `workflows/WF-PL-01/reports/BUILD_REPORT__WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT.md` | `archive/historical_snapshots/root_generic_active_stage_pointers/CLOSURE_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-DI-01.md` | `workflows/WF-DI-01/reports/CLOSURE_REPORT__WF-DI-01.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-ME-01.md` | `workflows/WF-ME-01/reports/CLOSURE_REPORT__WF-ME-01.md` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-OR-01.md` | `workflows/WF-OR-01/reports/CLOSURE_REPORT__WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-PL-01.md` | `workflows/WF-PL-01/reports/CLOSURE_REPORT__WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE.md` | `archive/historical_snapshots/root_generic_active_stage_pointers/CURRENT_STAGE.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE__WF-DI-01.md` | `workflows/WF-DI-01/reports/CURRENT_STAGE__WF-DI-01.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE__WF-ME-01.md` | `workflows/WF-ME-01/reports/CURRENT_STAGE__WF-ME-01.md` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE__WF-OR-01.md` | `workflows/WF-OR-01/reports/CURRENT_STAGE__WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE__WF-PL-01.md` | `workflows/WF-PL-01/reports/CURRENT_STAGE__WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/FIX_LOG.md` | `archive/historical_snapshots/root_generic_active_stage_pointers/FIX_LOG.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/FIX_LOG__WF-DI-01.md` | `workflows/WF-DI-01/reports/FIX_LOG__WF-DI-01.md` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/FIX_LOG__WF-ME-01.md` | `workflows/WF-ME-01/reports/FIX_LOG__WF-ME-01.md` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/FIX_LOG__WF-OR-01.md` | `workflows/WF-OR-01/reports/FIX_LOG__WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/FIX_LOG__WF-PL-01.md` | `workflows/WF-PL-01/reports/FIX_LOG__WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/README.md` | `common/historical_reference/handoff_hardened_README.md` | common |
| `docs/ucenicul_claude_handoff_hardened/STATE.json` | `archive/historical_snapshots/root_generic_active_stage_pointers/STATE.json` | archive |
| `docs/ucenicul_claude_handoff_hardened/STATE__WF-DI-01.json` | `workflows/WF-DI-01/reports/STATE__WF-DI-01.json` | workflow_specific / WF-DI-01 |
| `docs/ucenicul_claude_handoff_hardened/STATE__WF-ME-01.json` | `workflows/WF-ME-01/reports/STATE__WF-ME-01.json` | workflow_specific / WF-ME-01 |
| `docs/ucenicul_claude_handoff_hardened/STATE__WF-OR-01.json` | `workflows/WF-OR-01/reports/STATE__WF-OR-01.json` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/STATE__WF-PL-01.json` | `workflows/WF-PL-01/reports/STATE__WF-PL-01.json` | workflow_specific / WF-PL-01 |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/00_ROUTE_MAP.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/00_ROUTE_MAP.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/06_STAGE_WF-EC-01.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/06_STAGE_WF-EC-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/06_STAGE_WF-EC-01.md` | `workflows/WF-EC-01/docs/06_STAGE_WF-EC-01.md` | workflow_specific / WF-EC-01 |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/17_ACTIVE_STAGE_LOCK.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/17_ACTIVE_STAGE_LOCK.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/AUDIT_REPORT.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/AUDIT_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/BUILD_REPORT.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/BUILD_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/CLOSURE_REPORT.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/CLOSURE_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/CURRENT_STAGE.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/CURRENT_STAGE.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/FIX_LOG.md` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/FIX_LOG.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/STATE.json` | `archive/historical_snapshots/WF-EC-01_closure_snapshot/STATE.json` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/00_ROUTE_MAP.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/00_ROUTE_MAP.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/00_ROUTE_MAP.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/00_ROUTE_MAP.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/06_STAGE_WF-OR-01.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/06_STAGE_WF-OR-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/06_STAGE_WF-OR-01.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/06_STAGE_WF-OR-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/06_STAGE_WF-OR-01.md` | `workflows/WF-OR-01/docs/06_STAGE_WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/17_ACTIVE_STAGE_LOCK.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/17_ACTIVE_STAGE_LOCK.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/17_ACTIVE_STAGE_LOCK.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/17_ACTIVE_STAGE_LOCK.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/AUDIT_REPORT.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/AUDIT_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/BUILD_REPORT.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/BUILD_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/CLOSURE_REPORT.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/CLOSURE_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/CURRENT_STAGE.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/CURRENT_STAGE.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/FIX_LOG.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/FIX_LOG.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/STATE.json` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/STATE.json` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/00_ROUTE_MAP.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/00_ROUTE_MAP.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/00_ROUTE_MAP.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/00_ROUTE_MAP.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/02_load_execution_context.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/02_load_execution_context.sql` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/02_load_execution_context.sql` | `workflows/WF-OR-01/sql/02_load_execution_context.sql` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/03_load_execution_context_by_idempotency.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/03_load_execution_context_by_idempotency.sql` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/03_load_execution_context_by_idempotency.sql` | `workflows/WF-OR-01/sql/03_load_execution_context_by_idempotency.sql` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/06_STAGE_WF-OR-01.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/06_STAGE_WF-OR-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/06_STAGE_WF-OR-01.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/06_STAGE_WF-OR-01.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/06_STAGE_WF-OR-01.md` | `workflows/WF-OR-01/docs/06_STAGE_WF-OR-01.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/10_fixtures_create.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/10_fixtures_create.sql` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/10_fixtures_create.sql` | `workflows/WF-OR-01/sql/10_fixtures_create.sql` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/11_fixtures_cleanup.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/11_fixtures_cleanup.sql` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/11_fixtures_cleanup.sql` | `workflows/WF-OR-01/sql/11_fixtures_cleanup.sql` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK.md` | `archive/historical_snapshots/WF-OR-01_closure_snapshot/17_ACTIVE_STAGE_LOCK.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/17_ACTIVE_STAGE_LOCK.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/20_read_path_probe.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/20_read_path_probe.sql` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/20_read_path_probe.sql` | `workflows/WF-OR-01/sql/20_read_path_probe.sql` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/AUDIT_REPORT.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/AUDIT_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/BUILD_REPORT.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/BUILD_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/CLOSURE_REPORT.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/CLOSURE_REPORT.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/CURRENT_STAGE.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/CURRENT_STAGE.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/FIX_LOG.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/FIX_LOG.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/README_APPLY_FIRST.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/README_APPLY_FIRST.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/STATE.json` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/STATE.json` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/WF-OR-01_CONNECTION_MAP.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/WF-OR-01_CONNECTION_MAP.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/WF-OR-01_CONNECTION_MAP.md` | `workflows/WF-OR-01/docs/WF-OR-01_CONNECTION_MAP.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/WF-OR-01_IMPORT_PATCH_PLAN.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/WF-OR-01_IMPORT_PATCH_PLAN.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/WF-OR-01_NODE_MAP.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/WF-OR-01_NODE_MAP.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/WF-OR-01_NODE_MAP.md` | `workflows/WF-OR-01/docs/WF-OR-01_NODE_MAP.md` | workflow_specific / WF-OR-01 |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/WF-OR-01_Orchestrator_Input_Handoff.json` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/WF-OR-01_Orchestrator_Input_Handoff.json` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/or_logic.py` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/or_logic.py` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/results.json` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/results.json` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/results.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/results.md` | archive |
| `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/test_families.py` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/test_families.py` | archive |
| `workflows/AUDIT_ADDENDUM_WF-TR-01_Domain_Fixtures.md` | `workflows/WF-TR-01/reports/AUDIT_ADDENDUM_WF-TR-01_Domain_Fixtures.md` | workflow_specific / WF-TR-01 |
| `workflows/AUDIT_REPORT_WF-TR-01.md` | `workflows/WF-TR-01/reports/AUDIT_REPORT_WF-TR-01.md` | workflow_specific / WF-TR-01 |
| `workflows/HANDOFF_WF-TR-01_2026-04-16.md` | `workflows/WF-TR-01/docs/HANDOFF_WF-TR-01_2026-04-16.md` | workflow_specific / WF-TR-01 |
| `workflows/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` | `workflows/WF-TR-01/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` | workflow_specific / WF-TR-01 |
| `workflows/IMPORT_WF-TR-01.md` | `workflows/WF-TR-01/docs/IMPORT_WF-TR-01.md` | workflow_specific / WF-TR-01 |
| `workflows/MIGRATION_messages_for_WF-TR-01.sql` | `workflows/WF-TR-01/sql/MIGRATION_messages_for_WF-TR-01.sql` | workflow_specific / WF-TR-01 |
| `workflows/POST_IMPORT_AUDIT_WF-EC-01.md` | `workflows/WF-EC-01/reports/POST_IMPORT_AUDIT_WF-EC-01.md` | workflow_specific / WF-EC-01 |
| `workflows/REMEDIATION_REPORT_WF-TR-01.md` | `workflows/WF-TR-01/reports/REMEDIATION_REPORT_WF-TR-01.md` | workflow_specific / WF-TR-01 |
| `workflows/TEST_AFTER_IMPORT_WF-TR-01.md` | `workflows/WF-TR-01/reports/TEST_AFTER_IMPORT_WF-TR-01.md` | workflow_specific / WF-TR-01 |
| `workflows/TEST_REPORT_WF-TR-01.md` | `workflows/WF-TR-01/reports/TEST_REPORT_WF-TR-01.md` | workflow_specific / WF-TR-01 |
| `workflows/WF-DI-01_CONNECTION_MAP.md` | `workflows/WF-DI-01/docs/WF-DI-01_CONNECTION_MAP.md` | workflow_specific / WF-DI-01 |
| `workflows/WF-DI-01_Dispatcher.json` | `workflows/WF-DI-01/workflow/WF-DI-01_Dispatcher.json` | workflow_specific / WF-DI-01 |
| `workflows/WF-DI-01_IMPORT_PATCH_PLAN.md` | `workflows/WF-DI-01/docs/WF-DI-01_IMPORT_PATCH_PLAN.md` | workflow_specific / WF-DI-01 |
| `workflows/WF-DI-01_NODE_MAP.md` | `workflows/WF-DI-01/docs/WF-DI-01_NODE_MAP.md` | workflow_specific / WF-DI-01 |
| `workflows/WF-DI-01_blueprint.json` | `workflows/WF-DI-01/workflow/WF-DI-01_blueprint.json` | workflow_specific / WF-DI-01 |
| `workflows/WF-EC-01_CONNECTION_MAP.md` | `workflows/WF-EC-01/docs/WF-EC-01_CONNECTION_MAP.md` | workflow_specific / WF-EC-01 |
| `workflows/WF-EC-01_Execution_Context.json` | `workflows/WF-EC-01/workflow/WF-EC-01_Execution_Context.json` | workflow_specific / WF-EC-01 |
| `workflows/WF-EC-01_IMPORT_PATCH_PLAN.md` | `workflows/WF-EC-01/docs/WF-EC-01_IMPORT_PATCH_PLAN.md` | workflow_specific / WF-EC-01 |
| `workflows/WF-EC-01_NODE_MAP.md` | `workflows/WF-EC-01/docs/WF-EC-01_NODE_MAP.md` | workflow_specific / WF-EC-01 |
| `workflows/WF-EC-01_blueprint.json` | `workflows/WF-EC-01/workflow/WF-EC-01_blueprint.json` | workflow_specific / WF-EC-01 |
| `workflows/WF-ME-01_CONNECTION_MAP.md` | `workflows/WF-ME-01/docs/WF-ME-01_CONNECTION_MAP.md` | workflow_specific / WF-ME-01 |
| `workflows/WF-ME-01_IMPORT_PATCH_PLAN.md` | `workflows/WF-ME-01/docs/WF-ME-01_IMPORT_PATCH_PLAN.md` | workflow_specific / WF-ME-01 |
| `workflows/WF-ME-01_Module_Execution.json` | `workflows/WF-ME-01/workflow/WF-ME-01_Module_Execution.json` | workflow_specific / WF-ME-01 |
| `workflows/WF-ME-01_NODE_MAP.md` | `workflows/WF-ME-01/docs/WF-ME-01_NODE_MAP.md` | workflow_specific / WF-ME-01 |
| `workflows/WF-ME-01_TEST_MATRIX.md` | `workflows/WF-ME-01/docs/WF-ME-01_TEST_MATRIX.md` | workflow_specific / WF-ME-01 |
| `workflows/WF-ME-01_blueprint.json` | `workflows/WF-ME-01/workflow/WF-ME-01_blueprint.json` | workflow_specific / WF-ME-01 |
| `workflows/WF-OR-01_CONNECTION_MAP.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/WF-OR-01_CONNECTION_MAP.md` | archive |
| `workflows/WF-OR-01_CONNECTION_MAP.md` | `workflows/WF-OR-01/docs/WF-OR-01_CONNECTION_MAP.md` | workflow_specific / WF-OR-01 |
| `workflows/WF-OR-01_IMPORT_PATCH_PLAN.md` | `workflows/WF-OR-01/docs/WF-OR-01_IMPORT_PATCH_PLAN.md` | workflow_specific / WF-OR-01 |
| `workflows/WF-OR-01_NODE_MAP.md` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/WF-OR-01_NODE_MAP.md` | archive |
| `workflows/WF-OR-01_NODE_MAP.md` | `workflows/WF-OR-01/docs/WF-OR-01_NODE_MAP.md` | workflow_specific / WF-OR-01 |
| `workflows/WF-OR-01_Orchestrator_Input_Handoff.json` | `workflows/WF-OR-01/workflow/WF-OR-01_Orchestrator_Input_Handoff.json` | workflow_specific / WF-OR-01 |
| `workflows/WF-OR-01_blueprint.json` | `workflows/WF-OR-01/workflow/WF-OR-01_blueprint.json` | workflow_specific / WF-OR-01 |
| `workflows/WF-PL-01_CONNECTION_MAP.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_CONNECTION_MAP.md` | archive |
| `workflows/WF-PL-01_CONNECTION_MAP.md` | `workflows/WF-PL-01/docs/WF-PL-01_CONNECTION_MAP.md` | workflow_specific / WF-PL-01 |
| `workflows/WF-PL-01_IMPORT_PATCH_PLAN.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_IMPORT_PATCH_PLAN.md` | archive |
| `workflows/WF-PL-01_IMPORT_PATCH_PLAN.md` | `workflows/WF-PL-01/docs/WF-PL-01_IMPORT_PATCH_PLAN.md` | workflow_specific / WF-PL-01 |
| `workflows/WF-PL-01_NODE_MAP.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_NODE_MAP.md` | archive |
| `workflows/WF-PL-01_NODE_MAP.md` | `workflows/WF-PL-01/docs/WF-PL-01_NODE_MAP.md` | workflow_specific / WF-PL-01 |
| `workflows/WF-PL-01_Plan_Generation.json` | `workflows/WF-PL-01/workflow/WF-PL-01_Plan_Generation.json` | workflow_specific / WF-PL-01 |
| `workflows/WF-PL-01_blueprint.json` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_blueprint.json` | archive |
| `workflows/WF-PL-01_blueprint.json` | `workflows/WF-PL-01/workflow/WF-PL-01_blueprint.json` | workflow_specific / WF-PL-01 |
| `workflows/WF-TR-01_MCP_Technical_Sheet.md` | `workflows/WF-TR-01/docs/WF-TR-01_MCP_Technical_Sheet.md` | workflow_specific / WF-TR-01 |
| `workflows/WF-TR-01_PATCHED_switch_fix.json` | `workflows/WF-TR-01/workflow/WF-TR-01_PATCHED_switch_fix.json` | workflow_specific / WF-TR-01 |
| `workflows/WF-TR-01_Thread_Resolver.json` | `workflows/WF-TR-01/workflow/WF-TR-01_Thread_Resolver.json` | workflow_specific / WF-TR-01 |
| `workflows/contracts/ThreadResolutionContracts.md` | `common/contracts/ThreadResolutionContracts.md` | common |
| `workflows/fixtures/TC-01_Explicit_thread_reference.json` | `workflows/WF-TR-01/tests/TC-01_Explicit_thread_reference.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-02_Direct_reply_linkage.json` | `workflows/WF-TR-01/tests/TC-02_Direct_reply_linkage.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-03_Attach_by_entity___semantic_match.json` | `workflows/WF-TR-01/tests/TC-03_Attach_by_entity___semantic_match.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-04_Reopen_latent_thread.json` | `workflows/WF-TR-01/tests/TC-04_Reopen_latent_thread.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-05_Create_new_thread.json` | `workflows/WF-TR-01/tests/TC-05_Create_new_thread.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-06_Ambiguous_candidate_set.json` | `workflows/WF-TR-01/tests/TC-06_Ambiguous_candidate_set.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-07_Invalid_input.json` | `workflows/WF-TR-01/tests/TC-07_Invalid_input.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-08_Deterministic_replay.json` | `workflows/WF-TR-01/tests/TC-08_Deterministic_replay.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-08_Deterministic_replay__scoring_path_.json` | `workflows/WF-TR-01/tests/TC-08_Deterministic_replay__scoring_path_.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-09_Cross_tenant_isolation.json` | `workflows/WF-TR-01/tests/TC-09_Cross_tenant_isolation.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-10_Content_class_behavior.json` | `workflows/WF-TR-01/tests/TC-10_Content_class_behavior.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-11_Whitespace_only_content.json` | `workflows/WF-TR-01/tests/TC-11_Whitespace_only_content.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-12_Reply_to_thread_id_explicit_reference.json` | `workflows/WF-TR-01/tests/TC-12_Reply_to_thread_id_explicit_reference.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-13_Latent_thread_above_strict_attach_threshold.json` | `workflows/WF-TR-01/tests/TC-13_Latent_thread_above_strict_attach_threshold.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-14_Active_thread_at_exact_boundary__score___0_75_.json` | `workflows/WF-TR-01/tests/TC-14_Active_thread_at_exact_boundary__score___0_75_.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-15_Reply_to_message_with_no_thread_id.json` | `workflows/WF-TR-01/tests/TC-15_Reply_to_message_with_no_thread_id.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/TC-16_Audit_write_error_path_verification.json` | `workflows/WF-TR-01/tests/TC-16_Audit_write_error_path_verification.json` | workflow_specific / WF-TR-01 |
| `workflows/fixtures/setup_test_data.sql` | `common/shared_test_utils/setup_test_data.sql` | common |
| `workflows/scripts/di/__pycache__/di_logic.cpython-310.pyc` | `workflows/WF-DI-01/scripts/__pycache__/di_logic.cpython-310.pyc` | workflow_specific / WF-DI-01 |
| `workflows/scripts/di/di_logic.py` | `workflows/WF-DI-01/scripts/di_logic.py` | workflow_specific / WF-DI-01 |
| `workflows/scripts/ec/__pycache__/ec_logic.cpython-310.pyc` | `workflows/WF-EC-01/scripts/__pycache__/ec_logic.cpython-310.pyc` | workflow_specific / WF-EC-01 |
| `workflows/scripts/ec/ec_logic.py` | `workflows/WF-EC-01/scripts/ec_logic.py` | workflow_specific / WF-EC-01 |
| `workflows/scripts/generate_fixtures.js` | `common/shared_test_utils/generate_fixtures.js` | common |
| `workflows/scripts/lint_workflow.js` | `common/shared_test_utils/lint_workflow.js` | common |
| `workflows/scripts/me/__pycache__/me_logic.cpython-310.pyc` | `workflows/WF-ME-01/scripts/__pycache__/me_logic.cpython-310.pyc` | workflow_specific / WF-ME-01 |
| `workflows/scripts/me/me_logic.py` | `workflows/WF-ME-01/scripts/me_logic.py` | workflow_specific / WF-ME-01 |
| `workflows/scripts/or/__pycache__/or_logic.cpython-310.pyc` | `workflows/WF-OR-01/scripts/__pycache__/or_logic.cpython-310.pyc` | workflow_specific / WF-OR-01 |
| `workflows/scripts/or/or_logic.py` | `workflows/WF-OR-01/scripts/or_logic.py` | workflow_specific / WF-OR-01 |
| `workflows/scripts/pl/__pycache__/pl_logic.cpython-310.pyc` | `workflows/WF-PL-01/scripts/__pycache__/pl_logic.cpython-310.pyc` | workflow_specific / WF-PL-01 |
| `workflows/scripts/pl/pl_logic.py` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/scripts/pl/pl_logic.py` | archive |
| `workflows/scripts/pl/pl_logic.py` | `workflows/WF-PL-01/scripts/pl_logic.py` | workflow_specific / WF-PL-01 |
| `workflows/scripts/test_all.sh` | `common/shared_test_utils/test_all.sh` | common |
| `workflows/scripts/validate_contract.js` | `common/shared_test_utils/validate_contract.js` | common |
| `workflows/scripts/validate_scoring.js` | `common/shared_test_utils/validate_scoring.js` | common |
| `workflows/scripts/verify_replay.js` | `common/shared_test_utils/verify_replay.js` | common |
| `workflows/sql/di/01_schema_inspect.sql` | `workflows/WF-DI-01/sql/01_schema_inspect.sql` | workflow_specific / WF-DI-01 |
| `workflows/sql/di/02_load_execution_context.sql` | `workflows/WF-DI-01/sql/02_load_execution_context.sql` | workflow_specific / WF-DI-01 |
| `workflows/sql/di/03_load_plan_by_execution_context.sql` | `workflows/WF-DI-01/sql/03_load_plan_by_execution_context.sql` | workflow_specific / WF-DI-01 |
| `workflows/sql/di/04_load_module_registry.sql` | `workflows/WF-DI-01/sql/04_load_module_registry.sql` | workflow_specific / WF-DI-01 |
| `workflows/sql/di/10_fixtures_create.sql` | `workflows/WF-DI-01/sql/10_fixtures_create.sql` | workflow_specific / WF-DI-01 |
| `workflows/sql/di/11_fixtures_cleanup.sql` | `workflows/WF-DI-01/sql/11_fixtures_cleanup.sql` | workflow_specific / WF-DI-01 |
| `workflows/sql/di/20_read_path_probe.sql` | `workflows/WF-DI-01/sql/20_read_path_probe.sql` | workflow_specific / WF-DI-01 |
| `workflows/sql/ec/01_schema_inspect.sql` | `workflows/WF-EC-01/sql/01_schema_inspect.sql` | workflow_specific / WF-EC-01 |
| `workflows/sql/ec/02_upsert.sql` | `workflows/WF-EC-01/sql/02_upsert.sql` | workflow_specific / WF-EC-01 |
| `workflows/sql/ec/03_load_existing.sql` | `workflows/WF-EC-01/sql/03_load_existing.sql` | workflow_specific / WF-EC-01 |
| `workflows/sql/ec/10_fixtures_create.sql` | `workflows/WF-EC-01/sql/10_fixtures_create.sql` | workflow_specific / WF-EC-01 |
| `workflows/sql/ec/11_fixtures_cleanup.sql` | `workflows/WF-EC-01/sql/11_fixtures_cleanup.sql` | workflow_specific / WF-EC-01 |
| `workflows/sql/ec/20_behavior_probe.sql` | `workflows/WF-EC-01/sql/20_behavior_probe.sql` | workflow_specific / WF-EC-01 |
| `workflows/sql/me/01_schema_inspect.sql` | `workflows/WF-ME-01/sql/01_schema_inspect.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/02_load_execution_context.sql` | `workflows/WF-ME-01/sql/02_load_execution_context.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/03_load_dispatch_request.sql` | `workflows/WF-ME-01/sql/03_load_dispatch_request.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/04_load_task_candidates.sql` | `workflows/WF-ME-01/sql/04_load_task_candidates.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/05_insert_task.sql` | `workflows/WF-ME-01/sql/05_insert_task.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/06_update_task.sql` | `workflows/WF-ME-01/sql/06_update_task.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/07_complete_task.sql` | `workflows/WF-ME-01/sql/07_complete_task.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/08_delete_task.sql` | `workflows/WF-ME-01/sql/08_delete_task.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/10_fixtures_create.sql` | `workflows/WF-ME-01/sql/10_fixtures_create.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/11_fixtures_cleanup.sql` | `workflows/WF-ME-01/sql/11_fixtures_cleanup.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/20_read_path_probe.sql` | `workflows/WF-ME-01/sql/20_read_path_probe.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/me/21_write_path_probe.sql` | `workflows/WF-ME-01/sql/21_write_path_probe.sql` | workflow_specific / WF-ME-01 |
| `workflows/sql/or/01_schema_inspect.sql` | `workflows/WF-OR-01/sql/01_schema_inspect.sql` | workflow_specific / WF-OR-01 |
| `workflows/sql/or/02_load_execution_context.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/02_load_execution_context.sql` | archive |
| `workflows/sql/or/02_load_execution_context.sql` | `workflows/WF-OR-01/sql/02_load_execution_context.sql` | workflow_specific / WF-OR-01 |
| `workflows/sql/or/03_load_execution_context_by_idempotency.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/03_load_execution_context_by_idempotency.sql` | archive |
| `workflows/sql/or/03_load_execution_context_by_idempotency.sql` | `workflows/WF-OR-01/sql/03_load_execution_context_by_idempotency.sql` | workflow_specific / WF-OR-01 |
| `workflows/sql/or/10_fixtures_create.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/10_fixtures_create.sql` | archive |
| `workflows/sql/or/10_fixtures_create.sql` | `workflows/WF-OR-01/sql/10_fixtures_create.sql` | workflow_specific / WF-OR-01 |
| `workflows/sql/or/11_fixtures_cleanup.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/11_fixtures_cleanup.sql` | archive |
| `workflows/sql/or/11_fixtures_cleanup.sql` | `workflows/WF-OR-01/sql/11_fixtures_cleanup.sql` | workflow_specific / WF-OR-01 |
| `workflows/sql/or/20_read_path_probe.sql` | `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/20_read_path_probe.sql` | archive |
| `workflows/sql/or/20_read_path_probe.sql` | `workflows/WF-OR-01/sql/20_read_path_probe.sql` | workflow_specific / WF-OR-01 |
| `workflows/sql/pl/01_schema_inspect.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/01_schema_inspect.sql` | archive |
| `workflows/sql/pl/01_schema_inspect.sql` | `workflows/WF-PL-01/sql/01_schema_inspect.sql` | workflow_specific / WF-PL-01 |
| `workflows/sql/pl/02_load_execution_context.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/02_load_execution_context.sql` | archive |
| `workflows/sql/pl/02_load_execution_context.sql` | `workflows/WF-PL-01/sql/02_load_execution_context.sql` | workflow_specific / WF-PL-01 |
| `workflows/sql/pl/03_load_execution_context_by_idempotency.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/03_load_execution_context_by_idempotency.sql` | archive |
| `workflows/sql/pl/03_load_execution_context_by_idempotency.sql` | `workflows/WF-PL-01/sql/03_load_execution_context_by_idempotency.sql` | workflow_specific / WF-PL-01 |
| `workflows/sql/pl/10_fixtures_create.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/10_fixtures_create.sql` | archive |
| `workflows/sql/pl/10_fixtures_create.sql` | `workflows/WF-PL-01/sql/10_fixtures_create.sql` | workflow_specific / WF-PL-01 |
| `workflows/sql/pl/11_fixtures_cleanup.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/11_fixtures_cleanup.sql` | archive |
| `workflows/sql/pl/11_fixtures_cleanup.sql` | `workflows/WF-PL-01/sql/11_fixtures_cleanup.sql` | workflow_specific / WF-PL-01 |
| `workflows/sql/pl/20_read_path_probe.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/20_read_path_probe.sql` | archive |
| `workflows/sql/pl/20_read_path_probe.sql` | `workflows/WF-PL-01/sql/20_read_path_probe.sql` | workflow_specific / WF-PL-01 |
| `workflows/tests/di/results/results.json` | `workflows/WF-DI-01/tests/results/results.json` | workflow_specific / WF-DI-01 |
| `workflows/tests/di/results/results.md` | `workflows/WF-DI-01/tests/results/results.md` | workflow_specific / WF-DI-01 |
| `workflows/tests/di/test_families.py` | `workflows/WF-DI-01/tests/test_families.py` | workflow_specific / WF-DI-01 |
| `workflows/tests/ec/results/results.json` | `workflows/WF-EC-01/tests/results/results.json` | workflow_specific / WF-EC-01 |
| `workflows/tests/ec/results/results.md` | `workflows/WF-EC-01/tests/results/results.md` | workflow_specific / WF-EC-01 |
| `workflows/tests/ec/test_families.py` | `workflows/WF-EC-01/tests/test_families.py` | workflow_specific / WF-EC-01 |
| `workflows/tests/me/results/results.json` | `workflows/WF-ME-01/tests/results/results.json` | workflow_specific / WF-ME-01 |
| `workflows/tests/me/results/results.md` | `workflows/WF-ME-01/tests/results/results.md` | workflow_specific / WF-ME-01 |
| `workflows/tests/me/test_families.py` | `workflows/WF-ME-01/tests/test_families.py` | workflow_specific / WF-ME-01 |
| `workflows/tests/or/__pycache__/test_families.cpython-310.pyc` | `workflows/WF-OR-01/tests/__pycache__/test_families.cpython-310.pyc` | workflow_specific / WF-OR-01 |
| `workflows/tests/or/results/results.json` | `workflows/WF-OR-01/tests/results/results.json` | workflow_specific / WF-OR-01 |
| `workflows/tests/or/results/results.md` | `workflows/WF-OR-01/tests/results/results.md` | workflow_specific / WF-OR-01 |
| `workflows/tests/or/test_families.py` | `workflows/WF-OR-01/tests/test_families.py` | workflow_specific / WF-OR-01 |
| `workflows/tests/pl/__pycache__/test_families.cpython-310.pyc` | `workflows/WF-PL-01/tests/__pycache__/test_families.cpython-310.pyc` | workflow_specific / WF-PL-01 |
| `workflows/tests/pl/results/results.json` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests/pl/results/results.json` | archive |
| `workflows/tests/pl/results/results.json` | `workflows/WF-PL-01/tests/results/results.json` | workflow_specific / WF-PL-01 |
| `workflows/tests/pl/results/results.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests/pl/results/results.md` | archive |
| `workflows/tests/pl/results/results.md` | `workflows/WF-PL-01/tests/results/results.md` | workflow_specific / WF-PL-01 |
| `workflows/tests/pl/test_families.py` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests/pl/test_families.py` | archive |
| `workflows/tests/pl/test_families.py` | `workflows/WF-PL-01/tests/test_families.py` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/README_APPLY_FIRST.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/README_APPLY_FIRST.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-PL-01_ACTIVATED.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-PL-01_ACTIVATED.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP__WF-PL-01_ACTIVATED.md` | `workflows/WF-PL-01/docs/00_ROUTE_MAP__WF-PL-01_ACTIVATED.md` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/07_STAGE_WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/07_STAGE_WF-PL-01.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/07_STAGE_WF-PL-01.md` | `workflows/WF-PL-01/docs/07_STAGE_WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-PL-01.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK__WF-PL-01.md` | `workflows/WF-PL-01/docs/17_ACTIVE_STAGE_LOCK__WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/AUDIT_REPORT__WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/AUDIT_REPORT__WF-PL-01.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-PL-01.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-PL-01.md` | `workflows/WF-PL-01/reports/BUILD_REPORT__WF-PL-01.md` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-PL-01.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE__WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE__WF-PL-01.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/FIX_LOG__WF-PL-01.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/FIX_LOG__WF-PL-01.md` | archive |
| `workflows/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/STATE__WF-PL-01.json` | `archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened/STATE__WF-PL-01.json` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_CONNECTION_MAP.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_CONNECTION_MAP.md` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_CONNECTION_MAP.md` | `workflows/WF-PL-01/docs/WF-PL-01_CONNECTION_MAP.md` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_IMPORT_PATCH_PLAN.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_IMPORT_PATCH_PLAN.md` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_IMPORT_PATCH_PLAN.md` | `workflows/WF-PL-01/docs/WF-PL-01_IMPORT_PATCH_PLAN.md` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_NODE_MAP.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_NODE_MAP.md` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_NODE_MAP.md` | `workflows/WF-PL-01/docs/WF-PL-01_NODE_MAP.md` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_Plan_Generation.json` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_Plan_Generation.json` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_blueprint.json` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/WF-PL-01_blueprint.json` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/WF-PL-01_blueprint.json` | `workflows/WF-PL-01/workflow/WF-PL-01_blueprint.json` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/scripts/pl/__pycache__/pl_logic.cpython-313.pyc` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/scripts/pl/__pycache__/pl_logic.cpython-313.pyc` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/scripts/pl/pl_logic.py` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/scripts/pl/pl_logic.py` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/scripts/pl/pl_logic.py` | `workflows/WF-PL-01/scripts/pl_logic.py` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/01_schema_inspect.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/01_schema_inspect.sql` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/01_schema_inspect.sql` | `workflows/WF-PL-01/sql/01_schema_inspect.sql` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/02_load_execution_context.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/02_load_execution_context.sql` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/02_load_execution_context.sql` | `workflows/WF-PL-01/sql/02_load_execution_context.sql` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/03_load_execution_context_by_idempotency.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/03_load_execution_context_by_idempotency.sql` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/03_load_execution_context_by_idempotency.sql` | `workflows/WF-PL-01/sql/03_load_execution_context_by_idempotency.sql` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/10_fixtures_create.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/10_fixtures_create.sql` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/10_fixtures_create.sql` | `workflows/WF-PL-01/sql/10_fixtures_create.sql` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/11_fixtures_cleanup.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/11_fixtures_cleanup.sql` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/11_fixtures_cleanup.sql` | `workflows/WF-PL-01/sql/11_fixtures_cleanup.sql` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/20_read_path_probe.sql` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl/20_read_path_probe.sql` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/sql/pl/20_read_path_probe.sql` | `workflows/WF-PL-01/sql/20_read_path_probe.sql` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/tests/pl/results/results.json` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests/pl/results/results.json` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/tests/pl/results/results.json` | `workflows/WF-PL-01/tests/results/results.json` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/tests/pl/results/results.md` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests/pl/results/results.md` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/tests/pl/results/results.md` | `workflows/WF-PL-01/tests/results/results.md` | workflow_specific / WF-PL-01 |
| `workflows/wf-pl-01_full_source_pack/workflows/tests/pl/test_families.py` | `archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests/pl/test_families.py` | archive |
| `workflows/wf-pl-01_full_source_pack/workflows/tests/pl/test_families.py` | `workflows/WF-PL-01/tests/test_families.py` | workflow_specific / WF-PL-01 |
