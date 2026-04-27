# FULL_240_RUN · Case Matrix Snapshot

The canonical 240-case matrix is `docs/architecture/e2e/harness/e2e_matrix.json` (frozen 2026-04-25 by `PROJECT-E2E-RICH-TEST-MATRIX-DESIGN-FREEZE`).

| Corridor | Cases | Phase | Priority | Note |
|---|---|---|---|---|
| C1 | 20 | P1_FOUNDATION | P1 | response-only — see PL_BRIEFING_INTENT_MAPPING_FOLLOWUP |
| C2 | 20 | P1_FOUNDATION | P1 | memory_write — gate-case routing fix applied via `intent_mapping.mjs` |
| C3 | 20 | P2_COMPOSITION | P1+ | memory recall/search |
| C4 | 20 | P2_COMPOSITION | P2 | memory supersede — requires per-case pre-seeded `memory_items` + metadata.memory_id injection |
| C5 | 20 | P2_COMPOSITION | P2 | social/filler — see PL_BRIEFING_INTENT_MAPPING_FOLLOWUP |
| C6 | 20 | P2_COMPOSITION | P2 | planning/composition |
| C7 | 20 | P3_HARD_CASES | P2 | ambiguity guards — closed by `AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP` 2026-04-25 |
| C8 | 20 | P3_HARD_CASES | P1 | thread continuity |
| C9 | 20 | P1_FOUNDATION_CRITICAL | P0 | cross-thread durable vs session — requires C9-V1 fire *before* C9-V2/V3 fires for the recall lane |
| C10 | 20 | P1_FOUNDATION_CRITICAL | P0 | tenant isolation — gate fix routes write variants through `store_memory` |
| C11 | 20 | P1_FOUNDATION_CRITICAL | P0 | idempotency/retry — gate fix routes through `store_memory` for memory_items idempotency exercise |
| C12 | 20 | P3_HARD_CASES | P1 | large composition |

Total: 240 cases. 240 envelopes prepared under `artifacts/envelopes/` for run-tag `f240-2026-04-26`.

## Gate (20 cases) selected for Phase 1

The 20-case critical gate (per mission spec §"Phase 1") was selected to span every corridor at L1-V1 plus key C2/C3/C4/C7/C9 variants (replay, cross-tenant, supersede negatives, ambiguous task/memory/reminder, durable+session). Detail in `FULL_240_EXECUTION_LOG.md`.
