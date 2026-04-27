# 21 — REPAIR LOOP AND ROLLBACK POLICY

The operator is expected to repair failed workflows and chain mappings autonomously.

## Allowed mutation surface

You may modify:
- workflow JSON,
- node parameters,
- data mappings,
- execute-workflow connectors,
- workflow-local contract docs,
- test matrices,
- SQL fixtures,
- DB assertions,
- generated synthetic cases,
- test harnesses,
- run records and remediation logs.

## Mutation boundary

You may not silently redefine the product behavior beyond the canonical precedence stack.

That means:
- fix implementation to match canonical contracts,
- fix stale local docs to match canonical contracts,
- fix broken mappings,
- fix missing connectors,
- fix bad SQL,
- fix bad test oracles if they were inferred incorrectly,

but do **not** invent new semantics when canonical documents already define them.

## Repair loop

For every failing workflow or chain edge:
1. capture failing evidence,
2. shrink to minimal reproducer,
3. classify failure:
   - contract mismatch
   - mapping failure
   - node logic failure
   - subworkflow callability failure
   - DB query failure
   - DB assertion failure
   - stale oracle
   - stale docs
4. choose smallest canonical fix,
5. patch,
6. rerun minimal reproducer,
7. rerun full affected runtime batch,
8. update artifacts,
9. close only when all required assertions pass.

## When rollback is appropriate

Rollback is appropriate when:
- the patch made runtime behavior worse,
- the patch violates the canonical precedence stack,
- the patch mutated the wrong live workflow,
- the patch adds a connector later judged non-canonical.

## When rollback is not appropriate

Do not roll back a patch merely because:
- it changes the live topology,
- it makes a workflow callable as a subworkflow,
- it adds a canonical missing connector,
- it changes a workflow so that tests finally pass.

In those cases, the patch is part of forward progress.
