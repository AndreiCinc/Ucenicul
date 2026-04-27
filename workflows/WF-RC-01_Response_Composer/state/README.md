# state/

## Purpose

Current source of truth for WF-RC-01 Response Composer **status** — canonicality, tier, posture, live-run count, outstanding gaps.

## Contents

- `STATE__WF-RC-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-RC-01.json` (in this folder) is the single source of truth for workflow status going forward.
- Legacy `../docs/STATE__WF-RC-01.json` (misfiled — should be in state/, not docs/) preserved as historical-provenance read-only.

## Not source of truth

- Implementation (`../workflow/WF-RC-01_Response_Composer.json`).
- Narratives (`../docs/*REPORT*.md`, `../docs/FIX_LOG*.md`, `../docs/CURRENT_STAGE*.md` — all misfiled in docs/).
