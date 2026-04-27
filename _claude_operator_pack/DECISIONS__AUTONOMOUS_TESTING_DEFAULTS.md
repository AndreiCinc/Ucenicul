# Decisions — Autonomous Testing Defaults

This file freezes the unresolved operational questions for the autonomous testing mission.

## 1. Scope
The frozen testing scope is exactly these 10 workflows:
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

`WF-TR-02` is explicitly out of scope.

## 2. Source of truth for chain order
Use the precedence stack:
1. `notes/WF-E2E-01/WF-E2E-01_CHAIN_CONTRACT_MAP.md`
2. `prompts/18_RUNTIME_CANONICAL_TARGET.md`
3. `prompts/19_MODULE_CONTRACTS.md`
4. workflow-local closure contracts and test matrices
5. `CANONICAL_ENTRYPOINTS.md`
6. `FINAL_CANONICAL_BASELINE.md`
7. `_claude_operator_pack/EXPECTED_WORKFLOW_MANIFEST.md` only for scope confirmation

## 3. Case count policy
Per workflow:
- generate 50 synthetic cases
- validate all 50 statically
- execute 10 runtime cases

Per canonical chain edge:
- generate 50 synthetic chain cases
- validate all 50 statically
- execute 10 runtime chain cases

Full-primary-chain proof:
- minimum 3 smoke cases after edge stability

## 4. Preferred connector mechanism
Default connector mechanism is `Execute Workflow` inside n8n with synchronous wait semantics.

## 5. Callable-as-sub refactor policy
If a workflow is not callable as a subworkflow and a canonical chain edge requires it, refactor it so that:
- standalone entry behavior is preserved,
- subworkflow invocation becomes possible,
- output shape is normalized,
- the new callable contract is documented and tested.

## 6. DB write and cleanup policy
Synthetic DB writes are allowed.
Every test run must:
- namespace synthetic identifiers,
- verify DB side effects,
- execute cleanup.

## 7. Mutation boundary
Claude may autonomously change:
- workflow JSON,
- node mappings,
- connectors,
- SQL and DB assertions,
- test artifacts,
- local workflow docs,

as long as the changes move the implementation toward the canonical contracts and do not silently redefine target semantics outside the precedence stack.
