# reports/

## Purpose

Point-in-time narratives for WF-SU-01 State Persistence Updater. NOT a source of truth for current status (that lives in `../state/STATE__WF-SU-01.json`).

## Contents

- `CLOSURE_REPORT_WF-SU-01.md` — closure report.
- `SU_LIVE_EXECUTIONS.md` — live-executions log (rare among current workflows — this one has it on disk).
- `SU_RESULTS.md` — results summary.
- `WF-SU-01_VERIFIER_DELIVERY.md` — verifier delivery report.
- `STATE_WF-SU-01.json` — **legacy state JSON** (single-underscore naming variant). Preserved for provenance; current canonical status lives in `../state/STATE__WF-SU-01.json`.

## Canonicality

- `SU_LIVE_EXECUTIONS.md` is canonical for live-run proof of this workflow.
- `SU_RESULTS.md` is canonical as run-summary narrative.
- Each narrative report is canonical at its dated point-in-time.
- `STATE_WF-SU-01.json` in THIS folder is legacy / historical.

## Not source of truth

- Implementation (`../workflow/WF-SU-01_State_Persistence_Updater.json`).

## Missing (tracked gaps)

- None in this folder — `LIVE_EXECUTIONS` is present (named `SU_LIVE_EXECUTIONS.md` rather than the strict `LIVE_EXECUTIONS__WF-SU-01.md` pattern; accepted as-is in this pass).
