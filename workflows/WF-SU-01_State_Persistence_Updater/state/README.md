# state/

## Purpose

Current source of truth for WF-SU-01 State Persistence Updater **status** — canonicality, tier, posture, live-run count, outstanding gaps.

## Contents

- `STATE__WF-SU-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-SU-01.json` (in this folder) is the single source of truth for workflow status going forward.
- Legacy `../reports/STATE_WF-SU-01.json` (note: single-underscore naming variant) preserved as historical-provenance read-only.

## Not source of truth

- Implementation (`../workflow/WF-SU-01_State_Persistence_Updater.json`).
- Narratives (`../reports/*`).
