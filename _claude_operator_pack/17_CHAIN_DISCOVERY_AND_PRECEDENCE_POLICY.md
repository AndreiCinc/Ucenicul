# 17 — CHAIN DISCOVERY AND PRECEDENCE POLICY

Chain order must not be guessed from file names alone.

## Frozen in-scope workflows

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

## Canonical precedence stack

Resolve chain order and required connectors using this precedence, highest first:

1. `notes/WF-E2E-01/WF-E2E-01_CHAIN_CONTRACT_MAP.md`
2. `prompts/18_RUNTIME_CANONICAL_TARGET.md`
3. `prompts/19_MODULE_CONTRACTS.md`
4. workflow-local closure contracts and workflow-local test matrices
5. `CANONICAL_ENTRYPOINTS.md`
6. `FINAL_CANONICAL_BASELINE.md`
7. `_claude_operator_pack/EXPECTED_WORKFLOW_MANIFEST.md` for scope confirmation only
8. workflow names / folder names / live topology as tiebreakers only

## Default assumed graph when higher sources are incomplete

If higher-precedence sources are incomplete, use this provisional graph and mark it as provisional until validated:

Primary synchronous chain:
- WF-TR-01 → WF-EC-01
- WF-EC-01 → WF-OR-01
- WF-OR-01 → WF-PL-01
- WF-PL-01 → WF-DI-01
- WF-DI-01 → WF-ME-01
- WF-ME-01 → WF-RA-01
- WF-RA-01 → WF-RC-01
- WF-RC-01 → WF-MO-01

Persistence side edge:
- WF-RA-01 → WF-SU-01

Optional later edges, only if supported by canonical docs:
- WF-RC-01 → WF-SU-01
- WF-SU-01 → WF-MO-01

Do not invent optional edges unless the precedence stack supports them.

## Edge resolution record

For each investigated edge, record:
- source workflow id,
- target workflow id,
- edge type: primary / side-effect / optional,
- evidence sources used,
- connector mechanism,
- required input mapping,
- required output assertions,
- required DB assertions,
- whether the target must be callable as subworkflow,
- whether the source waits for target completion,
- whether failures are blocking or non-blocking,
- final decision code.

## Default connector mechanism

Use `Execute Workflow` as the default for workflow-to-workflow connections inside n8n.
Use another mechanism only if a higher-precedence canonical source explicitly requires it.

## Mandatory decision codes

Every edge must end with one of:
- `EDGE_CONFIRMED_AS_CANONICAL`
- `EDGE_CONFIRMED_AS_NON_CANONICAL`
- `EDGE_PROVISIONALLY_ADDED`
- `EDGE_DEFERRED_DUE_TO_OUT_OF_SCOPE_DEPENDENCY`

## Conflict rule

If two sources conflict:
1. keep the higher-precedence source,
2. record the losing source,
3. explain why it lost,
4. proceed with the higher-precedence interpretation.

Do not leave edge decisions implicit.
