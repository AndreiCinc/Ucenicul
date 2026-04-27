# reports/

## Purpose

Point-in-time narratives for WF-RC-01 Response Composer. NOT a source of truth for current status (that lives in `../state/STATE__WF-RC-01.json`).

**NOTE**: The expected narrative reports for this workflow are currently **misfiled** in `../docs/`. They are preserved in-place in this pass. See "Canonical narratives — where they actually live today" below.

## Contents (present in reports/ today)

- `README_APPLY_FIRST.md` — apply-first operator instructions.
- `SHA256SUMS.txt` — integrity checksums.

## Canonical narratives — where they actually live today

These are the WF-RC-01 narrative reports that should live here but currently live in `../docs/`. Do not treat the reports/ folder as complete until they are relocated:

- `../docs/AUDIT_REPORT__WF-RC-01.md`
- `../docs/BUILD_REPORT__WF-RC-01.md`
- `../docs/CLOSURE_REPORT__WF-RC-01.md`
- `../docs/CURRENT_STAGE__WF-RC-01.md`
- `../docs/FIX_LOG__WF-RC-01.md`

Misfile tracked in `../state/STATE__WF-RC-01.json` → `canonicality_drift`.

## Canonicality

- Each narrative report is canonical at its dated point-in-time **regardless of current folder**.
- Final destination of each is this folder; current physical location is `../docs/`.

## Missing (tracked gaps)

- `LIVE_EXECUTIONS__WF-RC-01.md` — no dedicated live-executions log on disk; workflow is not live yet anyway (pre_live_ready).
