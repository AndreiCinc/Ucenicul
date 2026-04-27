# Phase 2 Post-Green · Doc Normalization · Drift Register

## Audit grep results

| Term | Files with hits | Action |
|---|---|---|
| `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE` | 12 files | Most are mission-local closeouts (historical) — leave untouched. Drift lived in `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` §0.1 line 432 and §0.2 step 10 — both fixed in this mission. |
| `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN` | reconciliation header banner + Phase 2 mission-local closeouts | **current** — kept. |
| `REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE` | reconciliation header banner + Phase 2 closeout (next-frontier reference) | **current** — added explicit §0.1 row + §0.2 step 12 in this mission. |
| `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP` | Phase 2 closeout + `aggregate_counts_fix/CLOSEOUT.md` | **historical / closed** — added explicit §0.1 closure row in this mission. |
| `WF-RD-01` | reconciliation header + n8n_Workflow_Mapping §11 + Phase 1/2 mission docs | **current** — no further drift. |
| `task_reminder_deliveries` | reconciliation + Phase 1/2/aggregate mission docs | **current** — no further drift. |
| `public.reminders` | reconciliation + Phase 1/2 mission docs (always quoted as "byte-identical / unchanged") | **current** — no further drift. |

## Drift items closed by this mission

1. ~~`PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` §0.1 line ~432 listed `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE` as `OPEN` (next frontier)~~ → **fixed** — strikethrough + CLOSED 2026-04-27 row referencing the GREEN sandbox probe; added new row for `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP` (CLOSED) and a new row declaring `REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE` as the next frontier.
2. ~~§0.2 step 10 listed Phase 2 sandbox probe as the current next frontier~~ → **fixed** — strikethrough + DONE 2026-04-27; added step 11 (cosmetic CLOSED) + step 12 declaring Phase 3 as the current next frontier.
3. ~~`Module_Registry_Ucenicul.md` `reminder_module` banner said "Next mission: REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE"~~ → **fixed** — replaced with a 2026-04-27 update marking Phase 2 GREEN, cosmetic CLOSED, and Phase 3 as the next mission.

## Items intentionally NOT changed

- Historical mission-local closeouts (`phase0/`, `phase1_schema_scheduler/`,
  `phase1_doc_normalization/`, `phase2_live_sandbox_probe/` (gate-blocked),
  `phase2_live_sandbox_probe_authorised/`, `aggregate_counts_fix/`) — accurate
  at the time of writing; cross-references in the reconciliation header
  banners and §0.1 carry the current truth forward.
- `n8n_Workflow_Mapping.md` §11 — already declares WF-RD-01 with the
  correct id; the versionId reference there was an early one and is
  intentionally kept as a snapshot. Operator can refresh later if
  desired; not part of this drift normalization.
- ADR — unchanged.
