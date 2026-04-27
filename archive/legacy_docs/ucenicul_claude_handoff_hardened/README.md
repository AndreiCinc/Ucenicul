# Ucenicul Claude Handoff — Hardened Runtime Pack

This folder is the **authoritative handoff pack** for unattended Claude execution on the current migration route.

It is intentionally:
- process-first
- evidence-first
- shell-preserving
- blocker-aware
- anti-rabbit-hole
- stage-bounded

## Purpose

This pack exists to let Claude work autonomously **without inventing structure**, **without drifting into SDK exploration**, and **without claiming closure before runtime proof**.

It is designed for the current migration route:
- old architecture: intent-first / branch-first
- target architecture: thread-first / orchestration-first / one final response

## Read order

Claude must read files in exactly this order:

1. `00_ROUTE_MAP.md`
2. `01_MASTER_OPERATING_CONTRACT.md`
3. `02_AGENT_REGISTRY.md`
4. `03_EXECUTION_LOOP.md`
5. `04_N8N_MCP_PLAYBOOK.md`
6. `05_DB_AUTONOMY_PLAYBOOK.md`
7. `07_IMPEDIMENTS_AND_GUARDRAILS.md`
8. `08_SCORECARD_AND_GATES.md`
9. `11_DECISION_PRESETS.md`
10. `12_TOOL_FAILURE_MATRIX.md`
11. `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md`
12. `14_TEST_FIXTURE_REGISTRY.md`
13. `16_AUTONOMOUS_STOP_AND_RECOVERY.md`
14. `17_ACTIVE_STAGE_LOCK.md`
15. `18_RUNTIME_CANONICAL_TARGET.md`
16. `19_MODULE_CONTRACTS.md`
17. `20_EXECUTION_CONTEXT_EVOLUTION.md`
18. `21_RESPONSE_COMPOSER_CONTRACT.md`
19. `CURRENT_STAGE.md`
20. the referenced stage file (currently `06_STAGE_WF-EC-01.md`)
21. `09_REPORT_TEMPLATES.md`
22. `BUILD_REPORT.md`
23. `AUDIT_REPORT.md`
24. `FIX_LOG.md`
25. `CLOSURE_REPORT.md`
26. `STATE.json`
27. `10_FILE_SCORECARD.md`

## Core rules

- Work only on the ACTIVE stage.
- Never skip a stage.
- Never treat design correctness as runtime proof.
- Never trust workflow save success without live re-read.
- Never infer DB schema from validator errors.
- Never continue an exploratory tool path after repeated no-progress.
- Never delete the user-created shell workflow.
- Never claim completion before:
  - live workflow verification
  - live DB verification
  - runtime proof
  - post-test DB verification
  - written audit
  - closure report
  - score 10/10

## Current stage

See:
- `CURRENT_STAGE.md`
- `06_STAGE_WF-EC-01.md`
- `STATE.json`

## Current blocker posture

The current stage is not blocked by architecture.
It is blocked by the current n8n write surface:
- SDK-style `update_workflow(code)` path is not accepted as canonical
- plain native n8n JSON is the source of truth
- if no verified JSON write surface exists, the stage remains `BLOCKED_WITH_EVIDENCE`

See:
- `BUILD_REPORT.md`
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `CLOSURE_REPORT.md`
- `04_N8N_MCP_PLAYBOOK.md`
- `12_TOOL_FAILURE_MATRIX.md`
- `16_AUTONOMOUS_STOP_AND_RECOVERY.md`

## File purpose groups

### Control system
- `00_ROUTE_MAP.md`
- `01_MASTER_OPERATING_CONTRACT.md`
- `02_AGENT_REGISTRY.md`
- `03_EXECUTION_LOOP.md`

### Tooling and safety
- `04_N8N_MCP_PLAYBOOK.md`
- `05_DB_AUTONOMY_PLAYBOOK.md`
- `07_IMPEDIMENTS_AND_GUARDRAILS.md`
- `11_DECISION_PRESETS.md`
- `12_TOOL_FAILURE_MATRIX.md`
- `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md`
- `14_TEST_FIXTURE_REGISTRY.md`
- `16_AUTONOMOUS_STOP_AND_RECOVERY.md`

### Stage execution
- `06_STAGE_WF-EC-01.md`
- `17_ACTIVE_STAGE_LOCK.md`
- `CURRENT_STAGE.md`
- `STATE.json`

### Canonical architecture
- `18_RUNTIME_CANONICAL_TARGET.md`
- `19_MODULE_CONTRACTS.md`
- `20_EXECUTION_CONTEXT_EVOLUTION.md`
- `21_RESPONSE_COMPOSER_CONTRACT.md`

### Reporting
- `08_SCORECARD_AND_GATES.md`
- `09_REPORT_TEMPLATES.md`
- `BUILD_REPORT.md`
- `AUDIT_REPORT.md`
- `FIX_LOG.md`
- `CLOSURE_REPORT.md`

### Package scoring
- `10_FILE_SCORECARD.md`

## Final handoff rule

If this pack and the live tool surfaces disagree:
1. latest verified live DB state
2. latest verified live workflow state
3. current stage lock and stage file
4. this pack's canonical rules
5. historical notes

No ambiguity may remain unlogged.
