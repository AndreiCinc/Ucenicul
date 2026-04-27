# Phase 1 · Doc Normalization · Plan

## Targets (doc-only edits)

1. **`docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`** —
   §0.1 + §0.2 closures + new Phase 2 frontier line.
2. **`docs/architecture/Module_Registry_Ucenicul.md`** — `reminder_module`
   section gets a 2026-04-27 banner pointing at Phase 1.
3. **`docs/architecture/n8n_Workflow_Mapping.md`** — already declares
   WF-RD-01 in §11 (added during Phase 1 execution); no edit.
4. **Mission-local docs** under `phase1_doc_normalization/`.

## Out of scope

- All workflow JSON.
- All migration files / schema.
- All `phase0/`, `phase1_schema_scheduler/`, NEXT_3_FOLLOWUPS,
  FULL_240_*, RCP1, AMBIGUOUS_, OR_PASSTHROUGH_, MEMORY_SUPERSEDE_,
  IMPROVEMENT_MODULE_LIVE_, F14, F9, TASK_MODULE_LIVE_*, etc. closeouts —
  **historical truth, leave untouched**.
- Memory V2 docs.
- ADR-REMINDER-AS-TASK-LAYER (consistent with Phase 1).

## Apply order

1. Patch §0.1 IMPROVEMENT_MODULE_LIST tail + MEMORY_RECALL_PL_INTENTMAP row.
2. Patch §0.1 reminder stubs row + add Phase 2 frontier row.
3. Patch §0.2 steps 6–9 + add step 10 (Phase 2).
4. Patch Module_Registry `reminder_module` 2026-04-27 banner.
5. Write 6 mission-local docs (this folder).
6. CLOSEOUT.

## Risk surface

- All edits are **strikethrough + replacement-with-marker** style; no
  history is deleted.
- No file outside the four files above is touched.
- No workflow / schema / DB / external-side-effect.
