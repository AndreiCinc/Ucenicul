# tests/

## Purpose

Test fixtures and test-family bundles for WF-TR-01 Thread Resolver.

## Contents

- `fixtures/TC-01..TC-16*.json` — 17 JSON test-case fixtures covering: explicit thread reference, direct reply linkage, attach-by-entity semantic match, reopen latent thread, create-new-thread, ambiguous candidate set, invalid input, deterministic replay (two variants), cross-tenant isolation, content-class behavior, whitespace-only content, reply-to-thread-id explicit reference, latent-thread above strict-attach threshold, active-thread at exact boundary (score = 0.75), reply-to-message with no thread-id, audit-write error path.

## Canonicality

- Fixtures in `fixtures/` are canonical inputs for Thread Resolver test runs.

## Not source of truth

- Test matrix documentation — no `../docs/WF-TR-01_TEST_MATRIX.md` exists today; fixtures are the operational test scope. A formal test matrix is an explicit gap recorded in `../state/STATE__WF-TR-01.json` → `missing`.

## How to run

Off-node test harness is the project-wide test runner under `workflows/scripts/` (shared, legacy) — see `test_all.sh`. Scoped results, if produced, should land under `tests/results/` in a future run.
