# Quickstart — Autonomous Test + E2E Operator

1. Load the base `_claude_operator_pack`.
2. Load this testing extension.
3. Read `MASTER_PROMPT__UCENICUL_AUTONOMOUS_TEST_AND_E2E_OPERATOR.md`.
4. Freeze scope to the canonical 10 workflows.
5. Create the artifact root and mission state ledger.
6. Resolve chain order using the precedence stack.
7. Build compact workflow contract summaries.
8. Generate workflow-local 50-case sets.
9. Run static validation over all workflow-local case sets.
10. Run 10 runtime cases per workflow.
11. Patch missing canonical connectors.
12. Generate chain 50-case sets for every canonical edge.
13. Run static validation over all chain case sets.
14. Run 10 runtime chain cases per canonical edge.
15. Run full-primary-chain smoke cases.
16. Verify DB side effects and clean synthetic rows.
17. Repair until done gates pass.
18. Emit run records, patch records, and final summary.

If interrupted:
- restart from the latest incomplete workflow or chain edge,
- do not repeat already-verified passes unless evidence is missing or stale.
