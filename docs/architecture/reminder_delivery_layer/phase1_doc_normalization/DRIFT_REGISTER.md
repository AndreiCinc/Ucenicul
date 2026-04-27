# Phase 1 · Doc Normalization · Drift Register

Each row classifies an occurrence of one of the 7 audit terms.

## Summary table

| File | Line(s) | Term | Classification | Action |
|---|---|---|---|---|
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | top-of-file 2026-04-27 banner | REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE | **current** | none |
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | §0.1 line ~421 (improvement_module row) | IMPROVEMENT_MODULE_LIST_FOLLOWUP (deferred tail) | **drift** (now CLOSED 2026-04-27) | **fixed** — appended CLOSED 2026-04-27 marker referencing NEXT_3_FOLLOWUPS |
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | §0.1 line ~426 (recall row) | MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP | **drift** (now CLOSED 2026-04-27) | **fixed** — replaced with strikethrough + CLOSED row |
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | §0.1 line ~427 (reminder stubs row) | reminder_module CRUD stubs | **current** but needed Phase 1 cross-reference | **fixed** — kept as deferred but added pointer to WF-RD-01 declaration; clarified Phase 1 is delivery-only, not CRUD |
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | §0.1 (new row) | REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE | **current** | **added** — declared as the next frontier |
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | §0.2 line ~437 | MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP | **drift** (now CLOSED) | **fixed** — replaced with strikethrough + DONE 2026-04-27 |
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | §0.2 line ~438 | IMPROVEMENT_MODULE_LIST_FOLLOWUP | **drift** (now CLOSED) | **fixed** — replaced with strikethrough + DONE 2026-04-27 |
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | §0.2 line ~439 (Phase 2 rich matrix) | n/a | **drift** (FULL_240_RERUN already closed) | **fixed** — strikethrough + DONE 2026-04-26 |
| `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | §0.2 (new line 10) | REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE | **current** | **added** as the next frontier |
| `Module_Registry_Ucenicul.md` | top-of-file banner | recall_memory + list_improvements | **current** (added 2026-04-27) | none |
| `Module_Registry_Ucenicul.md` | reminder_module section | REMINDER-DELIVERY-LAYER | **drift** (Phase 1 just shipped, the section still said "to be opened only when those capabilities are committed to") | **fixed** — added 2026-04-27 banner pointing to WF-RD-01 + n8n_Workflow_Mapping §11 |
| `n8n_Workflow_Mapping.md` | §9 row + §11 | WF-RD-01 + REMINDER-DELIVERY-LAYER | **current** (declared in Phase 1) | none |
| `phase1_schema_scheduler/*.md` | (mission docs) | WF-RD-01 / task_reminder_deliveries / public.reminders / READY_EXCEPT_LIVE_SANDBOX_PROBE | **current** | none |
| `phase0/*.md` | (mission docs) | task_reminder_deliveries (proposed) | **historical** (Phase 0 said "proposed for Phase 1") | none — historical context preserved |
| `e2e/full_240_*/`, `e2e/ambiguous_content_guards/`, `e2e/remaining_corridors_phase1/`, `e2e/full_240_run/`, `or/planner_context_inputs_passthrough/` | various | MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP / IMPROVEMENT_MODULE_LIST_FOLLOWUP listed as deferred follow-ups | **historical** (mission-local closeouts; reflect state at the time the mission closed; explicitly cross-referenced by NEXT_3_FOLLOWUPS bundle) | **none** — leaving historical mission-local docs untouched per "don't delete useful history" rule |
| `improvement_module/live_execution/IMPROVEMENT_MODULE_CLOSEOUT.md` | line 165, 173 | IMPROVEMENT_MODULE_LIST_FOLLOWUP listed as deferred | **historical** (closeout dated 2026-04-25) | **none** — Phase 0/1/M3 chain explicitly cross-references this; historical truth preserved |
| `improvement_module/list_followup/*` | (mission docs) | IMPROVEMENT_MODULE_LIST_FOLLOWUP | **current** (closes the follow-up) | none |

## Drift items closed by this mission

1. ~~`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` listed as open in §0.1 of reconciliation~~ → CLOSED 2026-04-27 marker added.
2. ~~`IMPROVEMENT_MODULE_LIST_FOLLOWUP` listed as deferred in §0.1 improvement row~~ → CLOSED 2026-04-27 marker added.
3. ~~`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` listed as open continuation step in §0.2~~ → DONE 2026-04-27 marker added.
4. ~~`IMPROVEMENT_MODULE_LIST_FOLLOWUP` listed as open continuation step in §0.2~~ → DONE 2026-04-27 marker added.
5. ~~"Phase 2 rich matrix run" listed as future~~ → DONE 2026-04-26 marker added (FULL_240_RERUN + VARIANT_SWEEP).
6. New §0.1 row: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE` added as the explicit next frontier.
7. New §0.2 step 10: same Phase 2 next-frontier line added to the continuation path.
8. `Module_Registry_Ucenicul.md` `reminder_module` section: 2026-04-27 banner added pointing to Phase 1 closure (WF-RD-01) and Phase 2 next.

## Items intentionally NOT changed

- Historical mission-local closeouts (FULL_240_*/AMBIGUOUS_/RCP1/etc.)
  retain their original "deferred follow-up" framing. They were
  accurate at the time of writing; cross-references in
  NEXT_3_FOLLOWUPS_CLOSEOUT.md and the reconciliation header banners
  carry the current truth forward without requiring history rewriting.
- Phase 0 docs that describe Option B as "Phase 1 recommendation" are
  historically accurate.
- `n8n_Workflow_Mapping.md` §11 was added in Phase 1; no further
  drift remains.
- ADR-REMINDER-AS-TASK-LAYER does not require an update — Phase 1 is
  consistent with the ADR (delivery layer, NOT CRUD; `public.reminders`
  untouched).
