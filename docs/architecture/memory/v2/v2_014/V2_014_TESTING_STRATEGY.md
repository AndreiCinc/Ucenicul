# V2-014 Testing Strategy

## 1. Primary proof

Rerun `f31-promote-012` post-apply.

### Why this case is load-bearing
Isolates the exact V2-014 gap:
- row tier = `recent`
- row `user_confirmed = true`, `evidence_validated = false`, `corroboration_count = 1`
- caller `user_confirmed = false`, `evidence_validated = false`
- corroboration below threshold
- current SQL `accept.ok` evaluates to FALSE → `acceptance_criteria_not_met`
- post-F4 project semantics say persisted-row confirmation should be sufficient

### Expected post-patch outcome
- n8n execution status = success
- module_result.status = accepted
- tier transitions `recent → long_term`
- `last_reconfirmed_at` becomes non-null
- `denial_reason` = `accepted` (not `acceptance_criteria_not_met`)
- acceptance path reflects post-F4 reporting semantics

## 2. Safety regressions (minimum shield)

Must hold post-apply:

| # | Case class | Inputs (key) | Expected |
|---|---|---|---|
| 1 | Persisted-row accept (PRIMARY) | tier=recent, row.uc=true, row.ev=false, corr=1; caller cuc=false, cev=false | accept, promote to long_term |
| 2 | Caller accept (no regression) | tier=recent, row.uc=false, row.ev=false, corr=0; caller cuc=true, cev=false | accept, promote to long_term |
| 3 | Denial (no false broadening) | tier=recent, row.uc=false, row.ev=false, corr=0; caller cuc=false, cev=false | deny, `acceptance_criteria_not_met` |

Optional bucket 4 (only if cheap): corroboration-threshold accept (tier=recent, corr ≥ threshold, all flags false) — verifies corroboration path still works.

## 3. Verification dimensions (per rerun)

For every rerun, capture and assert:
- n8n execution status
- module_result.status
- denial_reason
- acceptance_signals (if surfaced)
- tier_pre / tier_post
- `last_reconfirmed_at` pre / post
- DB pre / post row snapshot
- whether mutation matched expectation exactly (no extra column writes)

## 4. Failure classification

If rerun still fails after Phase 7 assertions pass:
- `BAD_PATCH_DESIGN` — SQL did not actually cover persisted row state (predicate typo, wrong column, wrong boolean coercion).
- `BAD_BUILDER` — payload differs from intended SQL (builder emitted the wrong string).
- `RUNTIME_WORKFLOW_BUG` — only if live workflow contradicts current project semantics beyond the SQL gap (e.g., promote path ignores Result-node output downstream in a way F4 did not cover).
- `BAD_TEST_DEFINITION` — only if case expectation itself is genuinely premature after careful re-check (unlikely, since post-F4 semantics explicitly unblock this case).

## 5. Mission success threshold

SUCCESS only if all of:
- Primary proof `f31-promote-012` re-PASSes with all 6 post-patch assertions above.
- Safety rerun 2 (caller accept) still PASSes.
- Safety rerun 3 (denial) still denies with `acceptance_criteria_not_met`.
- No new runtime bug observed across rerun set.
- Phase 7 diff-surface verification confirms single-field change.

Otherwise: `BLOCKED_WITH_EVIDENCE` with bucket and evidence paths.
