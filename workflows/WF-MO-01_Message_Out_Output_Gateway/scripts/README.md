# scripts/

## Purpose

Workflow-specific off-node scripts for WF-MO-01 Message Out / Output Gateway.

## Contents

- `mo_logic.py` — Python implementation of message-out / output-gateway logic.
- `__init__.py` — Python package marker (enables import in test harness).

## Canonicality

- This folder is the canonical home for WF-MO-01 off-node scripts.

## Not source of truth

- Code inside n8n Function / Code nodes of `../workflow/WF-MO-01_Message_Out.json` is canonical inside the JSON, not here.
