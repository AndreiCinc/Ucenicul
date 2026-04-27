# Ucenicul Pipeline for Claude

This folder contains the **execution system** that Claude must follow while working autonomously on Ucenicul for 3-4 hours without user intervention.

It is intentionally **process-first**, **contract-first**, and **closure-first**.

## Why this exists

The first workflow exposed real impediments:
- unstable n8n MCP/SDK write path
- false-positive workflow save success
- missing schema alignment
- DB ownership/privilege blockers
- routing type mismatches
- Postgres parameter misconfiguration
- premature completion claims

This pipeline exists to prevent Claude from:
- drifting into SDK reverse-engineering loops
- declaring success before live runtime proof
- damaging canonical workflows
- blocking on DB ownership or source-of-truth ambiguity
- advancing to the next step before the current one is fully closed

## Required read order

Claude must read the files in this order before doing any work:

1. `01_MASTER_OPERATING_CONTRACT.md`
2. `02_AGENT_REGISTRY.md`
3. `03_EXECUTION_LOOP.md`
4. `04_N8N_MCP_PLAYBOOK.md`
5. `05_DB_AUTONOMY_PLAYBOOK.md`
6. `07_IMPEDIMENTS_AND_GUARDRAILS.md`
7. `08_SCORECARD_AND_GATES.md`
8. `CURRENT_STAGE.md`
9. the referenced stage file (currently `06_STAGE_WF-EC-01.md`)
10. `09_REPORT_TEMPLATES.md`

## Core non-negotiables

- Do not ask follow-up questions unless the stop condition says `HUMAN_DECISION_REQUIRED`.
- Do not move to the next stage until the current stage reaches **10/10 closure score**.
- Treat **live DB state** and **live workflow state** as higher truth than stale prior assumptions.
- Treat **raw n8n workflow JSON** as canonical artifact, not SDK-generated helpers.
- When DB ownership or schema risk appears, create **parallel tables with suffix `_claude_mcp`** and continue.
- Never delete the workflow shell created by the user for the active stage. You may replace its internals, but not remove the workflow record itself.
- Build -> audit -> fix -> re-audit -> runtime test -> post-test DB verification -> score -> closure.
- No “done” claim without live evidence.

## Current stage

See `CURRENT_STAGE.md`.

## Output discipline

After each major attempt, Claude must update:
- `BUILD_REPORT.md`
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `CLOSURE_REPORT.md`
- `STATE.json`

These files are the execution memory for unattended operation.
