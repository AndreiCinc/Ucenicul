# Claude Launch Prompt — Autonomous Test and E2E Operator

Use this prompt in Claude after the testing extension files are placed inside `_claude_operator_pack`.

---

You are inside the Ucenicul repository and must operate using the existing `_claude_operator_pack` plus its testing extension.

Mission:
Autonomously test, repair, connect, verify, and document the canonical 10 workflows in Ucenicul.

Mandatory scope:
- WF-TR-01
- WF-EC-01
- WF-OR-01
- WF-PL-01
- WF-DI-01
- WF-ME-01
- WF-RA-01
- WF-RC-01
- WF-MO-01
- WF-SU-01

Explicitly out of scope:
- WF-TR-02
- every other workflow in the n8n instance unless it is only referenced as a dependency note

Read order before action:
1. `_claude_operator_pack/MASTER_PROMPT__UCENICUL_AUTONOMOUS_TEST_AND_E2E_OPERATOR.md`
2. `_claude_operator_pack/DECISIONS__AUTONOMOUS_TESTING_DEFAULTS.md`
3. `_claude_operator_pack/16_TEST_AND_E2E_OPERATING_MODEL.md`
4. `_claude_operator_pack/17_CHAIN_DISCOVERY_AND_PRECEDENCE_POLICY.md`
5. `_claude_operator_pack/18_SYNTHETIC_TEST_CASE_POLICY.md`
6. `_claude_operator_pack/19_RUNTIME_EXECUTION_AND_DB_EVIDENCE_POLICY.md`
7. `_claude_operator_pack/20_CONNECTOR_PATCH_AND_SUBWORKFLOW_POLICY.md`
8. `_claude_operator_pack/21_REPAIR_LOOP_AND_ROLLBACK_POLICY.md`
9. `_claude_operator_pack/22_DONE_CRITERIA__TESTING_AND_E2E.md`
10. `_claude_operator_pack/23_ARTIFACT_LAYOUT_AND_OUTPUT_CONTRACT.md`
11. `_claude_operator_pack/24_RUNTIME_SELECTION__EDGE_AND_FULL_CHAIN_POLICY.md`
12. `_claude_operator_pack/25_DB_NAMESPACE_AND_CLEANUP_STANDARD.md`
13. `_claude_operator_pack/26_AUTONOMOUS_EXECUTION_GATES_AND_STOP_RULES.md`
14. relevant skills in `_claude_operator_pack/skills/`

Operational requirements:
- resolve chain order via precedence, not naming guesses
- generate 50 synthetic cases per workflow and per canonical edge
- statically validate all 50 cases
- execute 10 runtime cases per workflow and 10 per canonical edge in n8n
- patch missing canonical connectors persistently using Execute Workflow by default
- refactor target workflows into callable subworkflows when required
- verify DB side effects and cleanup synthetic rows
- run at least 3 full-primary-chain smoke cases after edge stability
- repair failing workflows and rerun until done gates pass or a real blocker exists
- write all artifacts into the standardized testing artifact layout

Autonomy rule:
Do not stop because docs are incomplete, connectors are missing, workflows are not callable, or test fixtures do not yet exist.
Derive, create, patch, run, repair, verify, and document.

Final output contract:
Return a concise summary of:
- scope confirmation,
- resolved chain edges,
- workflow statuses,
- edge statuses,
- connector patches applied,
- DB evidence summary,
- cleanup summary,
- blockers,
- exact paths to the produced artifacts.

Begin immediately.
