# Mission 1 — C11_REPLAY_GROUPING_TARGETED_RERUN

## Objective

Close the C11 variant-sweep caveat: V2/V3/V4 were fired with separate per-variant idempotency keys and therefore behaved as fresh deliveries. The canonical C11 replay grouping must be tested using the harness's canonical replay key derivation.

This is a QA/harness mission. It should not mutate workflows.

## Expected verdict

`C11_REPLAY_GROUPING_TARGETED_RERUN_READY = TRUE`

## Start protocol

Create:
`docs/architecture/e2e/c11_replay_grouping_targeted_rerun/`

With:
- `C11_REPLAY_GROUPING_EXECUTION_LOG.md`
- `C11_REPLAY_GROUPING_SCOPE_FREEZE.md`
- `C11_REPLAY_GROUPING_FIXTURES.md`
- `C11_REPLAY_GROUPING_RUNTIME_RESULTS.md`
- `C11_REPLAY_GROUPING_SQL_INVARIANTS.md`
- `C11_REPLAY_GROUPING_FAILURE_CLASSIFICATION.md`
- `C11_REPLAY_GROUPING_CLOSEOUT.md`
- `artifacts/`

## Required discovery

1. Inspect `docs/architecture/e2e/harness/tr_envelope.mjs`.
2. Find exact `deriveIdempotencyKey` behavior for C11 replay grouping.
3. Inspect how the previous C11 V1 first+replay was built.
4. Confirm whether replay dedupe is expected at execution_context/OR level, Memory V2 idempotency level, or both.
5. Do not assume request-level idempotency is persisted unless verified.

## Test design

### Group A — canonical replay group

- C11-RG-001 first delivery.
- C11-RG-002 replay variant V2.
- C11-RG-003 replay variant V3.
- C11-RG-004 late retry V4.

Use the exact canonical replay grouping intended by the harness. Prefer same tenant, same logical marker, and same replay-group key. If chain dedupes at message_id tuple, preserve the same message_id where appropriate. If the harness defines replay grouping differently, follow the harness.

Expected:
- exactly one logical domain row for the replay group;
- replays stop at OR or dedupe at Memory V2;
- no duplicate memory_items rows for the same logical delivery.

### Group B — fresh control

- C11-RG-005 fresh message and fresh replay group.

Expected:
- one legitimate additional memory row.

## SQL invariants

- replay group row count = 1;
- fresh control row count = 1;
- no cross-tenant leak;
- `public.reminders` unchanged;
- workflow mutation count = 0;
- schema mutation count = 0.

## P0 stop conditions

Stop if:
- replay with canonical grouping creates duplicate side effects;
- tenant isolation fails;
- `public.reminders` changes;
- workflow mutation appears;
- schema mutation appears.

## Final report

Include:
- exact replay key derivation used;
- message_id/idempotency key strategy;
- exec IDs;
- side-effect row counts;
- OR/EC/ME dedupe location;
- verdict.

## Final verdict options

- `C11_REPLAY_GROUPING_TARGETED_RERUN_READY = TRUE`
- `C11_REPLAY_GROUPING_TARGETED_RERUN_PARTIAL_WITH_BLOCKERS`
- `C11_REPLAY_GROUPING_TARGETED_RERUN_STOPPED_ON_P0`
