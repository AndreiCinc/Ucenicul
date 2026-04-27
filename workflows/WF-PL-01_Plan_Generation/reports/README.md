# reports/

## Purpose

Point-in-time narratives for WF-PL-01 Plan Generation: audit, build, closure, current stage, fixes, legacy state. NOT a source of truth for current status (that lives in `../state/STATE__WF-PL-01.json`).

## Contents

- `AUDIT_REPORT__WF-PL-01.md` — initial audit.
- `BUILD_REPORT__WF-PL-01.md` — build-phase narrative.
- `CLOSURE_REPORT__WF-PL-01.md` — closure report (closed at 10/10).
- `CURRENT_STAGE__WF-PL-01.md` — current-stage pointer (historical at time of writing).
- `FIX_LOG__WF-PL-01.md` — append-only fix log.
- `STATE__WF-PL-01.json` — **legacy state JSON** (pre-canonical location). Contains richer `live_runtime_proof` with execution_ids 711–714 (V1/V4/V5/V6). Preserved as historical provenance; the current canonical status lives in `../state/STATE__WF-PL-01.json`.

## Canonicality

- Each narrative report is canonical at its dated point-in-time.
- `STATE__WF-PL-01.json` in THIS folder is legacy / historical — canonical status file is `../state/STATE__WF-PL-01.json`.

## Not source of truth

- Implementation (`../workflow/WF-PL-01_Plan_Generation.json`).

## Missing (tracked gaps)

- `LIVE_EXECUTIONS__WF-PL-01.md` — no dedicated live-executions log file. Live runtime proof is currently embedded inside legacy `STATE__WF-PL-01.json` → `live_runtime_proof`. A future pass should extract this into a proper `LIVE_EXECUTIONS__WF-PL-01.md` per standard §4.E.
