# state/

## Purpose

Current source of truth for WF-PL-01 Plan Generation **status** — canonicality, tier, posture, live-run count, outstanding gaps.

## Contents

- `STATE__WF-PL-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-PL-01.json` (in this folder) is the single source of truth for workflow status going forward.
- Legacy `../reports/STATE__WF-PL-01.json` contains richer runtime proof evidence (execution_ids 711–714 for V1/V4/V5/V6) and is preserved as historical-provenance read-only. A future consolidation pass should migrate embedded `live_runtime_proof` into a dedicated `reports/LIVE_EXECUTIONS__WF-PL-01.md`.

## Not source of truth

- Implementation (`../workflow/WF-PL-01_Plan_Generation.json`).
- Duplicate-full blueprint (`../workflow/WF-PL-01_blueprint.json`).
- Narratives (`../reports/*`).
