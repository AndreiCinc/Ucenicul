# TEST_MATRIX_V2.md

## Runtime smoke (F1)
- F1-S1-store-basic
- F1-S2-search-lexical
- F1-S3-recall-thread
- F1-S4-promote-confirmed
- F1-S5-supersede-basic

## Family suites
### F2 — search semantic / lexical fallback
- 50 generated cases
- zero-hit, one-hit, many-hit
- lexical fallback explicit
- used_embedding true/false explicit
- status override coverage

### F3 — recall intersection
- 50 generated cases
- entity/thread/category/type intersections
- null + non-null combinations
- strict intersection expected

### F4 — promote denial vocabulary
- 25 generated cases
- `insufficient_corroboration`
- `already_long_term`
- `not_in_recent_tier`
- `acceptance_criteria_not_met`

### F5 — supersede + idempotency
- 25 generated cases
- lineage preserved
- replay same step
- repeated replace
- invalid old target

## Script flow
1. generate family cases
2. run runtime smoke
3. run family-expanded executor (to be wired similarly)
4. summarize results
5. attach results to v2 state docs
