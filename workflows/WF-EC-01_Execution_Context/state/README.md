# state/

## Purpose

Current source of truth for WF-EC-01 Execution Context **status** — canonicality, tier, posture, live-run count, outstanding gaps. Used by operator tooling and runs to decide what is safe to do with this workflow.

## Contents

- `STATE__WF-EC-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-EC-01.json` is the single source of truth for workflow status. Prose in `../reports/` is point-in-time; the JSON here is current.

## Not source of truth

- Implementation (`../workflow/WF-EC-01_Execution_Context.json`).
- Contracts (`../docs/WF-EC-01_CLOSURE_CONTRACT.md`).
- Historical narratives (`../reports/*`).
