# state/

## Purpose

Current source of truth for WF-ME-01 Module Execution **status** — canonicality, tier, posture, live-run count, outstanding gaps.

## Contents

- `STATE__WF-ME-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-ME-01.json` is the single source of truth for workflow status.

## Not source of truth

- Implementation (`../workflow/WF-ME-01_Module_Execution.json`).
- Supporting blueprint (`../workflow/WF-ME-01_blueprint.json`) — smaller than canonical, probably slim; classified as `supporting`.
- Narratives (`../reports/*`).
