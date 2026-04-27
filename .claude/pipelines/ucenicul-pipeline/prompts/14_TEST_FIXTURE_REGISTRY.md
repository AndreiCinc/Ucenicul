# Test Fixture Registry

This file defines how Claude must create, name, use, and clean test fixtures during unattended stage work.

Use this file to avoid DB pollution, ambiguous runtime evidence, and accidental interference with canonical or legacy data.

## 0. General rules

Fixtures must be:
- stage-specific
- easily identifiable
- isolated from legacy data
- safe to replay
- easy to clean

Do not use unmarked ad hoc data for runtime proof.

## 1. Fixture naming policy

Every fixture created for a stage must include a stage marker.

Preferred marker formats:
- text marker: `WF-EC-01_FIXTURE`
- idempotency marker: `wf_ec_01_fixture_<purpose>`
- descriptive prefix in text fields: `[WF-EC-01 TEST]`

If the table supports JSON metadata, store:
- `stage_code`
- `fixture_name`
- `created_by`
- `purpose`
- `cleanup_scope`

## 2. Fixture scope classes

Use one of these classes for every fixture:
- `runtime_input`
- `runtime_expected_row`
- `negative_test_fixture`
- `idempotency_fixture`
- `cross_tenant_fixture`
- `carry_forward_fixture`

A carry-forward fixture is a fixture produced by an earlier stage and reused by the current stage.

## 3. Allowed fixture behavior

Claude may:
- create fixtures needed for the active stage
- reuse carry-forward fixtures when they are clearly identified
- update fixtures if the stage contract requires replay/idempotency tests
- clean fixtures that belong only to the current stage and are no longer needed

Claude must not:
- treat legacy production-like rows as test fixtures without marking them
- delete old data that is outside current fixture scope unless clearly safe and non-canonical

## 4. Required fixture registry fields

For every fixture set, record:
- stage code
- fixture label
- table(s) touched
- identifying values
- purpose
- whether replay is expected
- whether cleanup is allowed immediately
- whether the fixture must survive for the next stage

Record these in `BUILD_REPORT.md` or an equivalent stage report.

## 5. Carry-forward fixture rule

If the current stage depends on the previous stage:
- prefer a real carry-forward fixture from the closed previous stage
- verify its identity before reuse
- do not mutate it destructively unless the stage requires replay testing

Example for current context:
- a real Thread Resolver result may be reused as input for Execution Context Init

## 6. Cleanup rule

Before cleanup, classify the fixture as one of:
- `delete_now`
- `keep_until_stage_closure`
- `keep_for_next_stage`
- `keep_for_evidence`

If a fixture is needed for:
- idempotency proof
- smoke handoff to next stage
- post-test evidence

then do not delete it early.

## 7. Cross-tenant fixture rule

For cross-tenant tests:
- use explicit tenant markers
- ensure tenant-specific rows remain distinguishable
- never collapse evidence across tenants

Cross-tenant fixtures must prove isolation, not just happy-path insertion.

## 8. Fixture safety preferences

When multiple fixture strategies are possible, prefer in this order:
1. clearly marked new fixture rows
2. clearly marked fallback-table fixtures
3. carry-forward fixtures from previous validated stage
4. legacy rows only when they are already validated and stage-safe

## 9. Fixture cleanup boundaries

Claude may clean automatically only when all are true:
- the fixture belongs to the active stage
- it is clearly marked
- it is not required for closure evidence
- it is not required for the next stage
- cleanup is reversible or non-destructive to canonical state

If any doubt exists, keep the fixture and document it.

## 10. Required fixture report block

Every runtime-capable stage must log:
- fixture ids or labels used
- carry-forward fixtures reused
- fixtures preserved intentionally
- fixtures cleaned
- fixtures deferred for next stage

## 11. Current default for WF-EC-01

For `WF-EC-01`, default fixture policy is:
- prefer carry-forward Thread Resolver evidence where available
- create dedicated EC runtime fixtures with stage markers
- preserve at least one replay/idempotency fixture until closure
- preserve at least one TR -> EC smoke fixture until the next stage decision is recorded
