# state/

## Purpose

Current source of truth for WF-RA-01 Result Aggregator **status** — canonicality, tier, posture, live-run count, outstanding gaps.

## Contents

- `STATE__WF-RA-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-RA-01.json` is the single source of truth for workflow status.

## Not source of truth

- Implementation (`../workflow/WF-RA-01_Result_Aggregator_LIVE.json`).
- Draft (`../workflow/drafts/WF-RA-01_Result_Aggregator_draft.json`).
- Narratives (`../reports/*`).
