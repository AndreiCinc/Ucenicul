# workflow/

## Purpose

Canonical n8n implementation for WF-SU-01 State Persistence Updater.

## Contents

- `WF-SU-01_State_Persistence_Updater.json` — **canonical** full workflow export.
- `SU_PINDATA_ENVELOPES.json` — canonical pin-data envelopes for this workflow (accepted as a workflow-local fixture).
- `SU_Build_Downstream_Envelope_TOLERANT_JSCODE.js` — **misfiled code-node duplicate**. Canonical is `../scripts/SU_BUILD_ENVELOPE_TOLERANT_JSCODE.js` (scripts/ is the canonical off-node script location per standard §3). Preserved in this pass; cleanup delete-gated.

## Canonicality

- `WF-SU-01_State_Persistence_Updater.json` is the single source of truth for workflow implementation.

## Not source of truth

- `SU_Build_Downstream_Envelope_TOLERANT_JSCODE.js` — misfiled copy; canonical is in `../scripts/`.
- Topology prose in `../docs/` is a supporting view only.
- Status (that lives in `../state/STATE__WF-SU-01.json`).
