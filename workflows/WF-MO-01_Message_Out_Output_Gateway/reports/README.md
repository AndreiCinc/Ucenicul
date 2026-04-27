# reports/

## Purpose

Apply-first instructions, operator prompts, and checksums for WF-MO-01 Message Out / Output Gateway.

**NOTE**: The typical narrative reports (AUDIT, BUILD, CLOSURE, CURRENT_STAGE, FIX_LOG) for this workflow live inside the handoff bundle at `../docs/ucenicul_claude_handoff_hardened/` — this is accepted packaging per standard §3. They are therefore NOT duplicated here.

## Contents

- `README_APPLY_FIRST.md` — apply-first operator instructions.
- `CLAUDE_PROMPT__WF-MO-01.txt` — Claude operator prompt bundled with this workflow.
- `SHA256SUMS.txt` — integrity checksums.

## Canonicality

- Narrative reports are canonical in the handoff bundle (see `../docs/ucenicul_claude_handoff_hardened/`).
- This folder is canonical for apply-first / operator-prompt / checksum artifacts.

## Not source of truth

- Implementation (`../workflow/WF-MO-01_Message_Out.json`).
- Status (`../state/STATE__WF-MO-01.json`).

## Missing (tracked gaps)

- `LIVE_EXECUTIONS__WF-MO-01.md` — no dedicated live-executions log on disk; workflow is pre-live anyway.
