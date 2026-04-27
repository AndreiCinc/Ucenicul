# 24 — RUNTIME SELECTION, EDGE, AND FULL-CHAIN POLICY

The 10 runtime executions per workflow and per edge must be chosen deliberately, not randomly.

## Workflow runtime selection minimums

Choose 10 runtime cases so the set covers, where relevant:
- 2 happy/valid cases,
- 1 boundary case,
- 1 missing-required or malformed negative gate,
- 1 route-divergence case,
- 1 persistence/DB case,
- 1 duplicate or idempotency case,
- 1 recovery/fallback case,
- 2 highest-risk cases from the remaining families.

If a family is not relevant to the workflow contract, document why and substitute the next highest-risk family.

## Edge runtime selection minimums

Choose 10 runtime edge cases so the set covers, where relevant:
- valid source → valid target,
- minimal required mapping,
- optional field propagation,
- malformed source blocked before target,
- transformed field correctness,
- persistence side-effect propagation,
- duplicate replay behavior,
- callable-as-sub behavior,
- timeout or wait-for-child behavior,
- recovery/degraded path.

## Full-primary-chain requirement

After required canonical edges are stable:
- run at least 3 full-primary-chain smoke cases,
- prefer one happy case, one boundary case, and one persistence-sensitive case,
- record the exact chain path reached,
- record any out-of-scope dependency that prevents full-chain proof.

Full-primary-chain testing is not a replacement for edge testing.
It is an additional proof layer.

## Re-run rule

If a fix affects a family already represented in the runtime subset, rerun:
- the minimal reproducer,
- the affected runtime case,
- any full-chain smoke case that traverses the changed edge.
