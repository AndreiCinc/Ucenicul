# reports/

## Purpose

Point-in-time narratives about WF-EC-01 Execution Context: audit, build, closure, fixes, post-import state. NOT a source of truth for current status (that lives in `../state/STATE__WF-EC-01.json`).

## Contents

- `AUDIT_REPORT_WF-EC-01.md` — initial audit report.
- `BUILD_REPORT_WF-EC-01.md` — build-phase narrative.
- `CLOSURE_REPORT_WF-EC-01.md` — closure report (status=CLOSED, score=10, closed_at=2026-04-19T00:15:00Z).
- `FIX_LOG_WF-EC-01.md` — append-only fix log.
- `POST_IMPORT_AUDIT_WF-EC-01.md` — post-import audit.

## Canonicality

- Each report is canonical within its narrative category at the dated point-in-time it describes.
- None of these reports is the source of truth for current status. Current status lives in `../state/STATE__WF-EC-01.json`.

## Not source of truth

- Implementation (`../workflow/WF-EC-01_Execution_Context.json`).
- Contracts (`../docs/WF-EC-01_CLOSURE_CONTRACT.md`).
