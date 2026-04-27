# 18 — SYNTHETIC TEST CASE POLICY

Synthetic test data is the default.

## Required counts

### Per workflow
- Generate **50 synthetic cases**
- Validate all 50 statically
- Execute 10 in n8n runtime

### Per canonical chain edge
- Generate **50 synthetic chain cases**
- Validate all 50 statically
- Execute 10 in n8n runtime

## Why 50 generated but 10 runtime

The goal is:
- broad static coverage,
- practical runtime cost,
- repeatable debugging,
- faster repair loops.

## Family model

Use **10 families × 5 cases** to guarantee spread and repeatability.

### Workflow-local families
1. happy path
2. boundary values
3. missing optional fields
4. missing required fields
5. malformed types / malformed structures
6. route-divergence triggers
7. duplicate / idempotency probes
8. persistence / DB side-effect probes
9. contract-drift probes
10. recovery / fallback behavior probes

### Chain families
1. valid source output → valid target input
2. minimal source output → target required subset
3. optional-field propagation
4. malformed source output blocked before target
5. transformed-field correctness
6. DB side-effect propagation
7. duplicate replay / idempotency across edge
8. child workflow callable-as-sub behavior
9. timeout / wait-for-child behavior
10. recovery / degraded path handling

## Runtime selection rule

The 10 runtime cases must not be arbitrary.
Select them using `24_RUNTIME_SELECTION__EDGE_AND_FULL_CHAIN_POLICY.md` so the runtime subset covers:
- at least one happy path,
- at least one boundary probe,
- at least one malformed or negative gate,
- at least one routing divergence,
- at least one persistence case where relevant,
- at least one idempotency/replay probe where relevant,
- at least one recovery/fallback case where relevant.

## Oracle hierarchy

Expected outputs should be generated using this order:

1. explicit workflow contract
2. canonical runtime/module contract
3. workflow-local docs and route maps
4. observed stable live behavior only if it does not contradict higher sources
5. inferred output marked as `INFERRED_ORACLE`, never silently treated as canonical

## Required metadata for each synthetic case

Every generated case must include:
- `case_id`
- `workflow_id` or `chain_id`
- `family`
- `risk_level`
- `input_payload`
- `expected_contract_assertions`
- `expected_route_assertions`
- `expected_db_assertions`
- `oracle_basis`
- `cleanup_keys`
- `runtime_candidate` boolean
- `negative_case` boolean

## Reuse rule

Historical outputs may be copied into an additional `integration_probe_cases` set.
They do **not** replace the synthetic 50-case set.
