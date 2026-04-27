# tests/memory/walkers

Walker conventions for `memory_module`.

## Required walker

Primary required file:
- `walker.mjs`

## Responsibilities

The walker must:
1. execute or discover the relevant workflow runs
2. assert `aggregated_result.status`
3. assert `module_result` shape
4. assert DB state after execution
5. record pass/fail into `tests/memory/results/`

## Required test layers

- contract assertions
- DB assertions
- chain / aggregator assertions

## Multi-workflow rule

If Claude creates more than one workflow or sub-workflow for memory behavior, the walker MUST also assert the connector nodes between workflows.

That includes:
- Execute Workflow bridges
- handoff envelopes
- child completion waiting behavior
- return envelope shape

A child-only test is insufficient if the connector layer is unverified.
