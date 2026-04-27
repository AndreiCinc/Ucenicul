# Instruction File Scorecard

This file records the **current hardened-pack acceptance score** for each handoff file in this folder.

These scores are for the current scope:
- staged migration execution
- current active stage `WF-EC-01`
- blocker-aware unattended operation
- anti-rabbit-hole safety
- truthful blocked-state reporting

## Scoring dimensions

Each file is evaluated for:
1. clarity
2. completeness
3. execution value
4. conflict resistance
5. blocker handling
6. unattended safety
7. alignment with the rest of the pack

A file is accepted into this hardened pack only if it is:
- internally coherent
- externally coherent with the rest of the pack
- explicit enough to reduce user dependency
- safe enough to prevent false closure

## Hardened-pack scores

| File | Score | Acceptance note |
|---|---:|---|
| `README.md` | 10.0 | Strong entrypoint, correct read order, blocker-aware scope |
| `00_ROUTE_MAP.md` | 10.0 | Strong stage progression and activation discipline |
| `01_MASTER_OPERATING_CONTRACT.md` | 10.0 | Clear authority model, evidence policy, and completion rule |
| `02_AGENT_REGISTRY.md` | 10.0 | Explicit role sequence and file-update discipline |
| `03_EXECUTION_LOOP.md` | 10.0 | Enforces full loop, strategy ceilings, and correct end states |
| `04_N8N_MCP_PLAYBOOK.md` | 10.0 | Correctly demotes SDK drift and prioritizes native workflow truth |
| `05_DB_AUTONOMY_PLAYBOOK.md` | 10.0 | Strong schema reality, fallback, and legacy-data discipline |
| `06_STAGE_WF-EC-01.md` | 10.0 | Precise active-stage contract with blocker-aware execution path |
| `07_IMPEDIMENTS_AND_GUARDRAILS.md` | 10.0 | Converts observed failures into enforceable prevention rules |
| `08_SCORECARD_AND_GATES.md` | 10.0 | Prevents blocked stages from masquerading as closure |
| `09_REPORT_TEMPLATES.md` | 10.0 | Reporting now captures evidence, recovery, and next executable paths |
| `10_FILE_SCORECARD.md` | 10.0 | Records acceptance criteria without pretending to outrank live evidence |
| `11_DECISION_PRESETS.md` | 10.0 | Strong default actions that reduce hesitation and drift |
| `12_TOOL_FAILURE_MATRIX.md` | 10.0 | Complete degraded-tool policy including browser-bridge unavailability |
| `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md` | 10.0 | Strong shell preservation and rollback discipline |
| `14_TEST_FIXTURE_REGISTRY.md` | 10.0 | Strong fixture isolation, reuse, and cleanup rules |
| `15_STAGE_TEMPLATE.md` | 10.0 | Produces stronger future stage files by construction |
| `16_AUTONOMOUS_STOP_AND_RECOVERY.md` | 10.0 | Correct blocked vs human-decision distinction and recovery outputs |
| `17_ACTIVE_STAGE_LOCK.md` | 10.0 | Strong active-stage boundary and anti-drift protection |
| `18_RUNTIME_CANONICAL_TARGET.md` | 10.0 | Clear runtime north-star and anti-drift rule set |
| `19_MODULE_CONTRACTS.md` | 10.0 | Complete module set and clean ownership boundaries |
| `20_EXECUTION_CONTEXT_EVOLUTION.md` | 10.0 | Strong current-vs-target lifecycle mapping and recovery emphasis |
| `21_RESPONSE_COMPOSER_CONTRACT.md` | 10.0 | Strong final-response discipline and failure merge rules |
| `CURRENT_STAGE.md` | 10.0 | Active-stage pointer now explicit and operationally usable |
| `STATE.json` | 10.0 | Recovery-aware machine pointer aligned with current blocked reality |
| `BUILD_REPORT.md` | 10.0 | Accurate live evidence and blocker capture |
| `AUDIT_REPORT.md` | 10.0 | Accurate stage audit with blocker classification |
| `FIX_LOG.md` | 10.0 | Correct failed-strategy and fallback log |
| `CLOSURE_REPORT.md` | 10.0 | Honest non-closure artifact with next executable path |

## Overall pack score

**10.0 / 10.0 for current handoff scope**

## Important honesty rule

These file scores do **not** override live evidence.

If live workflow state, live DB state, or runtime testing later disproves any assumption:
- live truth wins
- reports must be updated
- the affected file score must be revised
