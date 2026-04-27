# state/

## Purpose

Current source of truth for WF-DI-01 Dispatcher **status** — canonicality, tier, posture, live-run count, outstanding gaps.

## Contents

- `STATE__WF-DI-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-DI-01.json` (in this folder) is the single source of truth for workflow status going forward.
- Legacy `../reports/STATE__WF-DI-01.json` preserved as historical-provenance read-only.

## Not source of truth

- Implementation (`../workflow/WF-DI-01_Dispatcher.json`).
- Duplicate-full blueprint (`../workflow/WF-DI-01_blueprint.json`).
- Narratives (`../reports/*`).
