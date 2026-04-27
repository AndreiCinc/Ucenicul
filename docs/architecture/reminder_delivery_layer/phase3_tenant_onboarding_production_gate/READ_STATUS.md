# Phase 3 · Read Status

## Layer 0 — read

- `phase2_live_sandbox_probe_authorised/CLOSEOUT.md` ✅
- `phase2_live_sandbox_probe_authorised/LIVE_PROBE_RESULTS.md` ✅
- `phase2_live_sandbox_probe_authorised/REPLAY_PROBE_RESULTS.md` ✅
- `phase2_live_sandbox_probe_authorised/WORKFLOW_PATCH_LOG.md` ✅
- `phase2_live_sandbox_probe_authorised/SQL_INVARIANTS.md` ✅
- `phase2_live_sandbox_probe_authorised/P0_STOP_CONDITIONS.md` ✅
- `phase2_post_green_doc_normalization/CURRENT_TRUTH_AFTER_PHASE2_GREEN.md` ✅
- `aggregate_counts_fix/CLOSEOUT.md` ✅
- `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` ✅ (post-normalization)
- `n8n_Workflow_Mapping.md` §11 ✅
- `Module_Registry_Ucenicul.md` (`reminder_module` 2026-04-27 banner) ✅

## Layer 1 — confirmed

- `decisions/ADR-REMINDER-AS-TASK-LAYER.md` ✅ — Phase 3 production gate
  is consistent with the ADR (delivery layer; `public.reminders`
  remains untouched).
- `phase1_schema_scheduler/CLOSEOUT.md` ✅
- `phase1_schema_scheduler/WORKFLOW_DESIGN.md` ✅
- `phase2_live_sandbox_probe/CLOSEOUT.md` (gate-blocked variant) ✅
- `db/migrations/20260427_add_task_reminder_deliveries.up.sql` ✅
- `db/migrations/20260427_add_task_reminder_deliveries.down.sql` ✅

## Layer 2 — used selectively

- WF-RD-01 live snapshot pulled to `artifacts/WF-RD-01_phase3_pre.json`
  for the false-sent-guard patch envelope.

## Layer 3 — not needed

No contradictions surfaced.
