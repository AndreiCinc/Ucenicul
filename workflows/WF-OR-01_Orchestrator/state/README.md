# state/

## Purpose

Current source of truth for WF-OR-01 Orchestrator **status** — canonicality, tier, posture, live-run count, outstanding gaps.

## Contents

- `STATE__WF-OR-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-OR-01.json` is the single source of truth for workflow status.

## Not source of truth

- Implementation (`../workflow/WF-OR-01_Orchestrator_Input_Handoff.json`).
- Historical / duplicate-full blueprint (`../workflow/WF-OR-01_blueprint.json`) — classified stale / duplicate-canonical.
- Contracts — none on disk today (see `../state/STATE__WF-OR-01.json` → missing).
