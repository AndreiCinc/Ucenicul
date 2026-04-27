# DB Autonomy Playbook

## Goal

Keep implementation moving even when direct schema mutation is blocked by ownership, privilege, or canonical-state risk.

## Stage-start DB reality check

Before any DB-backed runtime testing:
1. list required tables
2. verify required columns
3. verify key constraints and indexes if relevant
4. verify ownership
5. verify create/alter privileges if schema work may be needed
6. verify the exact workflow SQL against live schema

No DB-backed runtime stage begins before this check is complete.

## Allowed schema truth sources

Schema truth may come only from:
- live `information_schema` or `pg_catalog`
- authoritative migration files under source control
- a confirmed canonical DDL artifact

Schema truth may not come from:
- validator error strings
- ORM hints
- tool payload rejections
- guessed column names
- remembered historical schema

## Ownership and privilege rule

If a target structure is owned by another DB user and direct change is blocked or risky:
- do not wait for the user
- create a parallel structure with suffix `_claude_mcp`
- continue if the stage contract allows it
- record exact merge-back notes

## Canonical-risk rule

If modifying the existing canonical table could damage current truth:
- keep the old table untouched
- create a parallel safe structure
- make the divergence explicit in reports
- keep the stage scoped to that safe structure

## Query rule

All SQL must be:
- parameterized
- tenant-scoped where applicable
- idempotent where replay is possible
- verified against live schema before closure

## Legacy data default rule

Legacy data is not stage truth by default.

Default handling:
- ignore and isolate by default
- use clearly marked fixtures for stage proof
- clean legacy data only if the stage contract explicitly allows it
- never silently preserve ambiguous legacy rows as evidence

Allowed legacy classifications:
- `preserved`
- `ignored_for_current_stage`
- `migrated_later`
- `safe_to_clean`

## Test data policy

Claude may:
- insert test data
- update test data
- delete its own marked fixtures
- preserve fixtures required for idempotency, smoke handoff, or evidence

Claude must:
- record fixtures in `BUILD_REPORT.md`
- classify cleanup eligibility before deletion
- never silently delete ambiguous or canonical rows

## Execution-context default rule

For current execution-context work:
- `status = initialized`
- `pending_steps = []`
- `completed_steps = []`
- idempotency key is present
- expiration policy is present if the schema supports it

## Status reconciliation rule

If the live schema status set differs from a canonical target document:
- follow live schema for the active stage
- record the mismatch in `AUDIT_REPORT.md`
- define the mapping explicitly
- do not invent unavailable statuses in live writes

## DB closure evidence

A DB-backed stage is not closed until all are true:
- schema exists and is verified
- exact stage SQL is verified against live schema
- required test-row behavior is verified
- replay/idempotency behavior is verified when applicable
- post-test row state matches contract
