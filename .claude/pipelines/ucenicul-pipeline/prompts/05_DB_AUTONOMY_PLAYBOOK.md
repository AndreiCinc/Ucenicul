# DB Autonomy Playbook

## Goal

Keep implementation moving even when direct schema mutation is blocked by ownership or risk.

## Stage-start DB reality check

Before any end-to-end testing:
1. list required tables
2. verify required columns
3. verify indexes if relevant
4. verify ownership
5. verify create/alter privileges
6. verify the exact workflow SQL against live schema

No workflow testing starts before this is complete.

## Ownership rule

If a target table is owned by another DB user and direct alteration is blocked or risky:
- do not wait for the user
- create a parallel table or structure with suffix `_claude_mcp`
- continue implementation against the parallel structure if the stage can proceed that way
- write exact migration/merge notes for later human migration

Examples:
- `execution_contexts_claude_mcp`
- `thread_resolution_audit_claude_mcp`

## Risk rule

If modifying the old table could damage existing truth:
- keep the old table untouched
- create the new structure with suffix
- treat the new structure as stage-local implementation truth
- document the divergence clearly

## Query rule

All SQL must be:
- parameterized
- tenant-scoped where applicable
- idempotent where replays are possible
- tested against live DB before closure

## Test data policy

Claude may:
- insert test data
- update test data
- delete test data
- isolate test fixtures by explicit prefixes/IDs where possible

Claude must:
- record inserted test data in `BUILD_REPORT.md`
- clean up only what it created, unless cleanup is part of the stage
- never silently remove ambiguous legacy data

## Legacy data rule

Do not preserve legacy data unless explicitly required.
If legacy data blocks clarity:
- classify it
- isolate it
- clean only if the stage contract allows it
- document what was removed and why

## Execution-context default rule

For new execution-context work, default values should be explicit:
- `status = initialized`
- `pending_steps = []`
- `completed_steps = []`
- idempotency key present
- expiration policy present

## DB closure evidence

A DB-backed stage is not closed until all are true:
- schema exists and is verified
- workflow SQL runs
- test row behavior is verified
- replay/idempotency is verified if applicable
- post-test row state matches the contract
