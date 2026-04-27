# state/

## Purpose

Current source of truth for WF-MO-01 Message Out / Output Gateway **status** — canonicality, tier, posture, live-run count, outstanding gaps.

## Contents

- `STATE__WF-MO-01.json` — canonical status file. Minimum keys per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §5.7.

## Canonicality

- `STATE__WF-MO-01.json` (in this folder) is the single source of truth for workflow status going forward.
- Nested `../docs/ucenicul_claude_handoff_hardened/STATE__WF-MO-01.json` is the **handoff-bundle** state (accepted per standard §3 for the handoff bundle role). Preserved in place; this file is the canonical external-view state used by operator tooling.

## Not source of truth

- Implementation (`../workflow/WF-MO-01_Message_Out.json`).
- Narratives inside `../docs/ucenicul_claude_handoff_hardened/`.
