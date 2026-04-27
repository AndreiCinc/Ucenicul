# Test Fixture Registry

This file defines how Claude must create, name, use, preserve, and clean test fixtures during unattended stage work.

## General rules

Fixtures must be:
- stage-specific
- easily identifiable
- isolated from legacy data
- safe to replay
- easy to classify for cleanup

Do not use unmarked ad hoc data for runtime proof.

## Fixture naming policy

Every fixture must include a stage marker.

Preferred formats:
- text marker: `WF-EC-01_FIXTURE`
- idempotency marker: `wf_ec_01_fixture_<purpose>`
- descriptive prefix: `[WF-EC-01 TEST]`

If metadata is available, store:
- `stage_code`
- `fixture_name`
- `created_by`
- `purpose`
- `cleanup_scope`

## Fixture scope classes

Use exactly one:
- `runtime_input`
- `runtime_expected_row`
- `negative_test_fixture`
- `idempotency_fixture`
- `cross_tenant_fixture`
- `carry_forward_fixture`

## Allowed fixture behavior

Claude may:
- create fixtures needed for the active stage
- reuse clearly identified carry-forward fixtures
- update fixtures when replay testing requires it
- clean current-stage fixtures only when rules allow it

Claude may not:
- treat production-like legacy rows as fixtures without marking them
- delete out-of-scope old data
- use ambiguous rows as runtime proof

## Required fixture ledger fields

For every fixture set, record:
- stage code
- fixture label
- tables touched
- identifying values
- purpose
- replay expected yes/no
- cleanup classification
- must survive to next stage yes/no

This ledger must appear in `BUILD_REPORT.md`.

## Carry-forward fixture rule

If the current stage depends on the previous stage:
- prefer a real carry-forward fixture from the previous validated stage
- verify identity before reuse
- do not mutate it destructively unless replay proof requires it

## Cleanup classifications

Use only:
- `delete_now`
- `keep_until_stage_closure`
- `keep_for_next_stage`
- `keep_for_evidence`

If a fixture is needed for:
- idempotency proof
- smoke handoff
- post-test DB evidence
- blocker evidence

then keep it.

## Cross-tenant rule

For cross-tenant tests:
- use explicit tenant markers
- ensure tenant rows remain distinguishable
- never collapse evidence across tenants

## Fixture safety preference order

1. clearly marked new fixture rows
2. clearly marked fallback-table fixtures
3. carry-forward fixtures from prior validated stage
4. legacy rows only when already validated and stage-safe

## Cleanup boundary rule

Automatic cleanup is allowed only when all are true:
- fixture belongs to active stage
- it is clearly marked
- it is not needed for closure evidence
- it is not needed for the next stage
- cleanup is reversible or harmless to canonical state

If in doubt:
- keep the fixture
- document why

## Required runtime-stage report block

Every runtime-capable stage must log:
- fixture ids or labels used
- carry-forward fixtures reused
- fixtures preserved intentionally
- fixtures cleaned
- fixtures deferred

## Current default for `WF-EC-01`

- prefer carry-forward Thread Resolver evidence where available
- create dedicated EC fixtures with stage markers
- preserve at least one replay/idempotency fixture until closure
- preserve at least one TR -> EC smoke fixture until next-stage activation is real
