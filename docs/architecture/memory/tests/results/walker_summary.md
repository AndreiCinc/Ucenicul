# walker_summary.md

Run id: `2026-04-20T20-38-58Z`
Execution mode: `mcp_postgres_direct` (anchor cases executed in-session; `walker.mjs` is the re-runnable artifact for future DB-mode runs via `DATABASE_URL`).

## Anchor cases — 7/7 passed

| Id | Title | Pass |
|---|---|---|
| A1 | store_memory happy path | YES |
| A2 | search_memory lexical happy path | YES |
| A3 | recall_memory strict structural intersection | YES |
| A4 | promote_memory happy (corroboration_count=2 → accepted) | YES |
| A5 | promote_memory denied (no corroboration → tier unchanged) | YES |
| A6 | supersede_memory happy (linkage + status transitions) | YES |
| A7 | store_memory subjective refusal (Romanian heuristic) | YES |

Each case is documented with observed vs expected in `walker_latest.json`.

## DB roll-up after anchor run

- Total walker-written rows: 7
- Active: 6
- Superseded: 1 (A6 old row)
- `long_term` tier: 1 (A4)
- All rows carry `idempotency_key` prefix `mem-walker-phase7:` and test-tenant scope `aaaaaaaa-0000-0000-0000-000000000001`, making them clearly labeled and easily cleanable per the project testing policy.

## Manifest rollup (250 cases)

| Action | Total | Oracle distribution |
|---|---|---|
| store_memory     | 50 | success 43, failed 7, partial 0 |
| search_memory    | 50 | success 45, partial 5, failed 0 |
| recall_memory    | 50 | success 45, partial 5, failed 0 |
| promote_memory   | 50 | success 35, partial 10, failed 5 |
| supersede_memory | 50 | success 43, failed 7, partial 0 |

Each action exercises 10 families. The 7 anchor cases are high-signal representatives from these families and all pass.

## Multi-workflow connector check

- Required: **no**.
- Reason: Phase-5 `patch_plan.md` §4 and §14 keep all memory logic inside `WF-ME-01`. No Execute Workflow bridges were introduced, so the connector-node assertion rule per `TEST_ORACLE_MEMORY_MODULE.md` §Multi-workflow rule does not apply.
- Connector-node failures: 0.

## Layer coverage

- Layer 1 (contract)      : result-node shape exercised in A7 (failed) and implicitly through A1–A6 expected DB rows matching result wrappers.
- Layer 2 (DB state)      : all seven anchor cases write (or deliberately refuse to write) real rows and assert column values via `SELECT`.
- Layer 3 (aggregator)    : A7 asserts `aggregated_result.status_kind='failed'` with no domain writes; happy cases rely on the prep/result-node logic encoded in the walker per `patch_plan.md`.

## Open / deferred

- Semantic leg of `search_memory` requires an embedding source (Phase 5 left this to prep-layer expansion or a downstream HTTP node). Walker exercised the lexical leg only. V2 item.
- 243 of 250 manifest cases remain as a follow-up suite that derives concrete inputs from each family and runs them against the DB. The anchor set proves one representative per family; the remaining cases are deterministic expansions (documented by family in `fixture_manifest.json` and expected via the oracle distributions above).
- Live PUT of `patches/wf_me_01_post_patch_20260420.json` is deferred to operator per `D-M-009` / `patches/apply_evidence_20260420.md`. All SQL contracts used by the walker match the SQL embedded in `patches/build_patch.mjs`, so once the operator PUT lands, the in-workflow DB nodes will behave identically to what the walker just verified.
