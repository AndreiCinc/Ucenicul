# reports/

## Purpose

Point-in-time narratives for WF-DI-01 Dispatcher: audit, build, closure, current stage, fixes, legacy state. NOT a source of truth for current status (that lives in `../state/STATE__WF-DI-01.json`).

## Contents

- `AUDIT_REPORT__WF-DI-01.md` — initial audit.
- `BUILD_REPORT__WF-DI-01.md` — build-phase narrative.
- `CLOSURE_REPORT__WF-DI-01.md` — closure report.
- `CURRENT_STAGE__WF-DI-01.md` — current-stage pointer.
- `FIX_LOG__WF-DI-01.md` — append-only fix log.
- `STATE__WF-DI-01.json` — **legacy state JSON** (pre-canonical). Preserved for provenance; current canonical status lives in `../state/STATE__WF-DI-01.json`.

## Canonicality

- Each narrative report is canonical at its dated point-in-time.
- `STATE__WF-DI-01.json` in THIS folder is legacy / historical.

## Not source of truth

- Implementation (`../workflow/WF-DI-01_Dispatcher.json`).

## Missing (tracked gaps)

- `LIVE_EXECUTIONS__WF-DI-01.md` — no dedicated live-executions log file.
