# reports/

## Purpose

Point-in-time narratives for WF-RA-01 Result Aggregator. NOT a source of truth for current status (that lives in `../state/STATE__WF-RA-01.json`).

## Contents

- `AUDIT_REPORT__WF-RA-01.md` — initial audit.
- `BUILD_REPORT__WF-RA-01.md` — build-phase narrative.
- `CLOSURE_REPORT__WF-RA-01.md` — closure report.
- `CURRENT_STAGE__WF-RA-01.md` — current-stage pointer.
- `FINAL_STAGE_POSTURE__WF-RA-01.md` — final posture (score 10/10, closed=true, advance_allowed=true).
- `FIX_LOG__WF-RA-01.md` — append-only fix log.

## Canonicality

- Each narrative report is canonical at its dated point-in-time.

## Not source of truth

- Implementation (`../workflow/WF-RA-01_Result_Aggregator_LIVE.json`).
- Status (`../state/STATE__WF-RA-01.json`).

## Missing (tracked gaps)

- `LIVE_EXECUTIONS__WF-RA-01.md` — no dedicated live-executions log file.
