# Current Baseline and Order

## Current truth

- `PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`
- `FULL_240_VARIANT_SWEEP_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`

Important caveat: variant sweep was risk-weighted, not exhaustive 240/240. It live-proved 39 cases across all corridors and L1 variant axes; L2-L5 and some syntactic siblings remain deferred as same-code-path.

## Why these three now

1. **C11 replay grouping** closes the only concrete QA caveat from the variant sweep: V2/V3/V4 used per-variant keys rather than canonical shared replay grouping.
2. **MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP** aligns PL with the memory_module capability vocabulary.
3. **IMPROVEMENT_MODULE_LIST_FOLLOWUP** completes the read-only improvement list lane that was explicitly deferred.

## Execution posture

- Mission 1 should not mutate workflows.
- Mission 2 should be a tiny PL mapping patch if needed.
- Mission 3 may require ME routing + read-only DB chain, but no schema mutation.
