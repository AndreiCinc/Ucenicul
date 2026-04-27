# scripts/

## Purpose

Workflow-specific off-node scripts for WF-SU-01 State Persistence Updater.

## Contents

- `SU_BUILD_ENVELOPE_TOLERANT_JSCODE.js` — **canonical** off-node JavaScript implementation of the envelope-building logic. Used in WF-SU-01's code node (the copy inside the workflow JSON is authoritative for the n8n runtime; this scripts/ file is the authored source).

## Canonicality

- This folder is the canonical home for WF-SU-01 off-node scripts.
- A file with the same logic exists at `../workflow/SU_Build_Downstream_Envelope_TOLERANT_JSCODE.js` — that is a **misfiled duplicate**. Canonical location is scripts/ (this folder). Misfile cleanup is delete-gated and deferred.

## Not source of truth

- Code inside n8n Function / Code nodes of `../workflow/WF-SU-01_State_Persistence_Updater.json` is canonical inside the JSON for runtime; this scripts/ folder holds the authored source.
