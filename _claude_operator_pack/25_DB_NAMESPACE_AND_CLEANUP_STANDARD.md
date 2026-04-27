# 25 — DB NAMESPACE AND CLEANUP STANDARD

Synthetic DB interaction must be identifiable and reversible.

## Required namespace markers

Every synthetic runtime case that may touch the DB must use one or more of:
- `test_run_id`
- `synthetic_case_id`
- `origin = 'claude_test'`
- prefixed synthetic ids such as `test_`, `syn_`, or an agreed canonical prefix

If a table cannot store an explicit marker, choose deterministic synthetic ids that can be cleaned reliably.

## Cleanup standard

For every runtime batch that touches the DB, define:
- cleanup predicate,
- cleanup query,
- expected deleted row range,
- safety guard to prevent non-synthetic deletion,
- post-cleanup verification query.

## Safety rule

Cleanup queries must be written so they cannot delete non-synthetic rows.
If safe cleanup cannot be proven, do not execute the destructive cleanup until a safer strategy is encoded.
Instead, isolate the rows and document the blocker.

## Evidence requirement

DB evidence must include:
- assertion query,
- cleanup query,
- observed rows or row counts,
- sample key fields,
- cleanup verification result.
