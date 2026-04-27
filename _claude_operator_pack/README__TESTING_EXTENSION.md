# Ucenicul Testing + E2E Extension Pack

This drop-in extension adds a fully autonomous testing, connector activation, runtime proof, DB evidence, and repair layer to the existing `_claude_operator_pack`.

## What this extension is for

Use this extension when the operator mission is no longer only:
- standardize documentation,
- reconcile workflow state,
- patch live n8n workflows,
- verify roundtrip integrity,

but also to:
- derive compact workflow contracts from canonical documents,
- generate **50 synthetic test cases per workflow**, 
- run **10 runtime cases per workflow** in n8n,
- connect workflows persistently where the canonical chain requires it,
- generate **50 synthetic chain/E2E cases per canonical edge**, 
- run **10 runtime chain cases per canonical edge**,
- verify side effects in Postgres,
- repair failing workflows until they satisfy canonical contracts,
- clean up synthetic test data after validation,
- produce evidence-heavy artifacts that survive operator handoff.

## What is frozen by this extension

1. **Scope is exactly 10 workflows**  
   `WF-TR-01, WF-EC-01, WF-OR-01, WF-PL-01, WF-DI-01, WF-ME-01, WF-RA-01, WF-RC-01, WF-MO-01, WF-SU-01`

2. **Chain authority uses a precedence stack, not naming guesses**  
   See `17_CHAIN_DISCOVERY_AND_PRECEDENCE_POLICY.md`.

3. **Generated coverage is broader than runtime execution**  
   For every workflow and every canonical chain edge:
   - generate 50 synthetic cases,
   - statically validate all 50,
   - execute 10 runtime cases in n8n,
   - shrink failures,
   - repair and rerun.

4. **Persistent connection is allowed and expected**  
   Missing canonical edges must be patched into the live topology unless the precedence stack shows the edge is non-canonical.

5. **DB assertions are first-class**  
   Payload success alone is insufficient. Required side effects and cleanup must also pass.

6. **Artifacts are standardized**  
   Use `23_ARTIFACT_LAYOUT_AND_OUTPUT_CONTRACT.md`. The operator must produce evidence in predictable locations.

## Recommended integration into the base pack

Add this extension into the existing `_claude_operator_pack` and ensure the base start/read order points to:
- `README__TESTING_EXTENSION.md`
- `MASTER_PROMPT__UCENICUL_AUTONOMOUS_TEST_AND_E2E_OPERATOR.md`
- `bootstrap/03_TEST_OPERATOR_QUICKSTART.md`

If the mission includes words like:
- test
- runtime validation
- E2E
- chain
- connector
- synthetic fixtures
- DB assertions
- repair loop

this extension should be loaded.

## Minimal read order

1. `MASTER_PROMPT__UCENICUL_AUTONOMOUS_TEST_AND_E2E_OPERATOR.md`
2. `DECISIONS__AUTONOMOUS_TESTING_DEFAULTS.md`
3. `16_TEST_AND_E2E_OPERATING_MODEL.md`
4. `17_CHAIN_DISCOVERY_AND_PRECEDENCE_POLICY.md`
5. `18_SYNTHETIC_TEST_CASE_POLICY.md`
6. `19_RUNTIME_EXECUTION_AND_DB_EVIDENCE_POLICY.md`
7. `20_CONNECTOR_PATCH_AND_SUBWORKFLOW_POLICY.md`
8. `21_REPAIR_LOOP_AND_ROLLBACK_POLICY.md`
9. `22_DONE_CRITERIA__TESTING_AND_E2E.md`
10. `23_ARTIFACT_LAYOUT_AND_OUTPUT_CONTRACT.md`
11. `24_RUNTIME_SELECTION__EDGE_AND_FULL_CHAIN_POLICY.md`
12. `25_DB_NAMESPACE_AND_CLEANUP_STANDARD.md`
13. `26_AUTONOMOUS_EXECUTION_GATES_AND_STOP_RULES.md`
14. relevant skills

## Delivery promise of this extension

A successful run leaves behind:
- workflow inventory cards,
- a chain map with evidence,
- compact contract summaries,
- synthetic fixture sets,
- workflow and edge runtime records,
- connector patch records,
- DB assertions and cleanup proof,
- remediation logs,
- a final summary that supports successor takeover.
