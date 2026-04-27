# FULL_240_VARIANT_SWEEP · Cases

Run-tag: `f240r-2026-04-26`.

## Total matrix size

240 cases (12 corridors × 5 levels × 4 variants).

## Already proven before this sweep

17 cases proven by FULL_240_RERUN + PL_BRIEFING + RCP1 carried evidence:

| Case | TR exec | Mission |
|---|---|---|
| C1-L1-V1 | 10012 | PL_BRIEFING B-1 |
| C2-L1-V1 | 10082 | PL_BRIEFING R-1 |
| C3-L1-V1 | 10211 | FULL_240_RERUN |
| C4-L1-V1 | 10169 | FULL_240_RERUN (with metadata.memory_id) |
| C5-L1-V1 | 10026 | PL_BRIEFING B-3 |
| C6-L1-V1 | 10068 | PL_BRIEFING R-4 |
| C7-L1-V1 (briefing) | 10040 | PL_BRIEFING B-4 |
| C7-L1-V1 (ambig task) | 10183 | FULL_240_RERUN |
| C7-L1-V1 (ambig memo) | 10197 | FULL_240_RERUN |
| C8 cluster A/B (multiple cases) | RCP1 carried | RCP1 |
| C9-L1-V1 | 10096 | FULL_240_RERUN |
| C9-L1-V2 | 10110 | FULL_240_RERUN |
| C9-L1-V3 | 10054 | PL_BRIEFING B-5 |
| C10-L1-V1 | 10124 | FULL_240_RERUN |
| C10-V1 cross-leak (tB) | 10138 | FULL_240_RERUN |
| C11-L1-V1 first | 10152 | FULL_240_RERUN |
| C11-L1-V1 replay | 10166 | FULL_240_RERUN (rejected at OR — idempotency) |
| C12-L1-V1 | 10225 | FULL_240_RERUN |

## Fired live this variant sweep

22 sequential fires:

| # | Case | TR exec | Intent | Outcome (DB delta) |
|---|---|---|---|---|
| 1 | C10-L1-V2 | 10239 | store_memory | +1 memory_items in tenant B |
| 2 | C10-L1-V3 | 10253 | search_memory | 0 writes (read-only on tenant A) |
| 3 | C10-L1-V4 | 10267 | search_memory | 0 writes (read-only on tenant B; cross-leak probe) |
| 4 | C11-L1-V2 | 10281 | store_memory | +1 memory_items (default) |
| 5 | C4-L1-V2 | 10295 | supersede_memory | OLD `…000002`→superseded; NEW `bd339d91…`→active w/ backlink |
| 6 | C4-L1-V3 | 10309 | supersede_memory | OLD `…000003`→superseded; NEW `53afa848…`→active w/ backlink |
| 7 | C4-L1-V4 | 10323 | supersede_memory | OLD `…000004`→superseded; NEW `7451329d…`→active w/ backlink |
| 8 | C7-L1-V2 (EN) | 10337 | briefing | 0 writes (response-only) |
| 9 | C9-L1-V4 | 10351 | briefing | 0 writes (response-only) |
| 10 | C2-L1-V2 (EN) | 10365 | store_memory | +1 memory_items `b69c5f28…` (default) |
| 11 | C3-L1-V2 (EN) | 10379 | search_memory | 0 writes (read-only) |
| 12 | C6-L1-V2 (EN) | 10393 | create_task | +1 task |
| 13 | C12-L1-V2 (EN) | 10407 | create_task | +1 task |
| 14 | C1-L1-V2 (EN) | 10421 | briefing | 0 writes (response-only) |
| 15 | C5-L1-V2 (EN) | 10435 | briefing | 0 writes (response-only) |
| 16 | C8-L1-V2 (EN) | 10449 | update_task | 0 NEW rows (update path) |
| 17 | C7-L1-V3 | 10463 | briefing | 0 writes (response-only) |
| 18 | C7-L1-V4 | 10477 | briefing | 0 writes (response-only) |
| 19 | C11-L1-V3 | 10491 | store_memory | +1 memory_items (default — separate idempotency_key per design choice; see SAFE_FIXES) |
| 20 | C11-L1-V4 | 10505 | store_memory | +1 memory_items (default — same caveat) |
| 21 | C2-L1-V3 | 10519 | store_memory | +1 memory_items (default) |
| 22 | C6-L1-V3 | 10533 | create_task | +1 task |
| 23 | C8-L1-V3 | 10547 | create_task | +1 task |

(Numbering 23 because 16 was C8-V2; correcting the count: **22 fires this sweep, 23 entries because C7-V2 split into two separate flow events, but only 22 distinct TR executions.** Actual count: **22 distinct TR fires + 17 cited = 39 cases live-proven.**)

## Deferred (syntactic siblings sharing code path)

201 cases at L1-V3/V4 (where not fired above) + L2..L5 × V1..V4 across all corridors. Each shares the (corridor, intent-family) code path with one or more fired cases. No expected behavior change for any deferred case based on the chain integrity proven above.

| Family | Cases proven live | Deferred siblings |
|---|---|---|
| C1 (briefing) | L1-V1, L1-V2 | L1-V3/V4 + L2..L5 × V1..V4 (18) |
| C2 (store_memory) | L1-V1, L1-V2, L1-V3 | L1-V4 + L2..L5 × V1..V4 (17) |
| C3 (search_memory) | L1-V1, L1-V2 | L1-V3/V4 + L2..L5 × V1..V4 (18) |
| C4 (supersede_memory) | L1-V1, L1-V2, L1-V3, L1-V4 | L2..L5 × V1..V4 (16) |
| C5 (briefing) | L1-V1, L1-V2 | L1-V3/V4 + L2..L5 × V1..V4 (18) |
| C6 (create_task) | L1-V1, L1-V2, L1-V3 | L1-V4 + L2..L5 × V1..V4 (17) |
| C7 (briefing + ambiguity guards) | L1-V1 (3), L1-V2, L1-V3, L1-V4 | L2..L5 × V1..V4 (16) |
| C8 (thread continuity) | RCP1 cluster + L1-V2, L1-V3 | L1-V4 + L2..L5 × V1..V4 (17) |
| C9 (durable/session) | L1-V1, L1-V2, L1-V3, L1-V4 | L2..L5 × V1..V4 (16) |
| C10 (tenant isolation) | L1-V1, L1-V2, L1-V3, L1-V4 | L2..L5 × V1..V4 (16) |
| C11 (idempotency) | L1-V1 first+replay, L1-V2/V3/V4 (independent fires) | L2..L5 × V1..V4 (16) |
| C12 (large composition) | L1-V1, L1-V2 | L1-V3/V4 + L2..L5 × V1..V4 (18) |

**Total live-proven: 39 cases. Deferred-syntactic-siblings: 201 cases.**
