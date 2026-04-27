# Writeback and Closeout Policy

## Mission-local docs

Each mission writes to its own folder:

1. `docs/architecture/e2e/c11_replay_grouping_targeted_rerun/`
2. `docs/architecture/pl/memory_recall_intentmap/`
3. `docs/architecture/improvement_module/list_followup/`

## Reconciliation update

After each mission, update compactly:

`docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`

Use top-of-file update banner + §0.1/§0.2 adjustments. Do not rewrite historical sections except to mark superseded text when needed.

## Module registry update

Only update `docs/architecture/Module_Registry_Ucenicul.md` if:
- `recall_memory` mapping status changes materially;
- `list_improvements` becomes user-ready;
- response contract changes.

## Final bundle closeout

Create:

`docs/architecture/e2e/next_3_followups/NEXT_3_FOLLOWUPS_CLOSEOUT.md`

Include:
- per-mission verdicts;
- workflow version lineage;
- node/connection deltas;
- schema mutation count;
- side-effect summaries;
- remaining follow-ups;
- recommended next frontier.

## Do not update

- historical Memory V2 phase gates;
- old closeouts;
- unrelated workflow docs;
- architecture spec unless product contract changes.
