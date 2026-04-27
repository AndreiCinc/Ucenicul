# 22 — DONE CRITERIA FOR TESTING AND E2E

A workflow is not done just because it executed once.

## Workflow-local done gate

A workflow reaches `TEST_DONE` only if all are true:
1. canonical contract exists or has been reconciled,
2. 50 synthetic cases exist,
3. all 50 pass static validation or are correctly classified as expected-failure negatives,
4. 10 runtime cases executed in n8n,
5. required routes/nodes behaved as expected,
6. final outputs matched canonical assertions,
7. required DB side effects matched assertions,
8. synthetic rows were cleaned up,
9. remediation log is complete,
10. final run record states pass with evidence.

## Chain-edge done gate

A chain edge reaches `E2E_EDGE_DONE` only if all are true:
1. edge has canonical confirmation or justified provisional confirmation,
2. source → target mapping exists,
3. connector exists persistently in live n8n,
4. target is callable as required,
5. 50 chain cases exist,
6. all 50 pass static mapping validation or are correctly classified negatives,
7. 10 runtime chain cases executed,
8. target execution is proven,
9. target output contract passed,
10. required DB side effects passed,
11. synthetic rows were cleaned up,
12. remediation log is complete,
13. final chain run record states pass with evidence.

## Full-mission done gate

The extension mission is done only if:
- all 10 workflows reach `TEST_DONE`,
- all required canonical edges reach `E2E_EDGE_DONE`,
- the final chain summary exists,
- unresolved blockers are either zero or explicitly out-of-scope dependencies,
- every persistent connector patch is documented,
- evidence folders are complete,
- cleanup summary is complete.
