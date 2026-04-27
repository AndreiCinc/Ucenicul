# F6A-FOLLOWUP-SUPERSEDE-EMBED — Phase 7 Live E2E Results

Ran: 2026-04-24
Baseline after apply: versionId `13e8e767-0b0e-401a-b3da-7db94e1f926a`, 49 nodes, 67 connections, active=true.

## Baseline

- pre-apply versionId: `c07fe923-76eb-4901-b53b-14039536df55`
- post-apply versionId: `13e8e767-0b0e-401a-b3da-7db94e1f926a`
- nodeCount / connectionCount: 49 / 67
- active: true
- apply channel: V2-028 local `n8n-patch.mjs replace` (agent-run)
- apply timestamp cutoff for DB-1 baseline: 2026-04-24T09:22:31Z
- mission namespace: `mem-smoke-f6a-followup-supersede-embed`

## Execution IDs

| Case | Store exec | Supersede exec | Search/Recall exec | DB row id(s) | Outcome |
|---|---:|---:|---:|---|---|
| E1 | 4749 (seed) | 4758 (supersede) | — | seed `664a9037`, repl `a0eea3bb` | PASS |
| E2 | — | 4767 (replay) | — | `a0eea3bb` (same id) | PASS — replacement_rows_for_key = 1 |
| E3 | — | — | 4776 (search) | `a0eea3bb` similarity 0.809 **TOP-1** | PASS |
| E4 | — | 4785 (invalid) | — | — (no row) | PASS |
| E5 | 4794 | — | — | `15ba6600`, 1536-d embed | PASS — F6A store regression green |
| E6 | — | — | 4803 (recall) | — | PASS — existing recall behavior preserved |

Calibration note: execution `4748` used an incorrect dispatcher envelope shape (`module_execution_started=true` forbidden at entry; must be `false`). Corrected and reused in E1+; the `ME_Validate_Dispatcher_Result` node explicitly rejects `module_execution_started === true` at entry. No further drift.

## Case-by-case oracles

### E1 — happy supersede writes replacement embedding (PASS)

- Old row `664a9037` → `status=superseded`.
- Replacement row `a0eea3bb` → `status=active`, `supersedes_memory_id=664a9037`, `embedding IS NOT NULL`, `dim=1536`.
- No unrelated rows created.

### E2 — idempotent replay (PASS)

- Same `step_id = mem-smoke-f6a-followup-supersede-embed-E1-supersede` replayed.
- `replacement_rows_for_key = 1` (SELECT COUNT GROUP BY idempotency_key returned `rows_for_key=1`).
- Old row stays `superseded`.

### E3 — semantic retrieval participation (PASS)

- `search_memory` query `"epsilon vortex quark replacement"`.
- `used_embedding=true`, `semantic_match_count=5`, `lexical_match_count=0`.
- Replacement row `a0eea3bb` is **TOP-1** with similarity `0.8089`.
- Next-best is `d095efc9` (pre-existing row) at 0.3855. Large margin; no rank inversion.

### E4 — invalid target regression (PASS)

- Target `ffffffff-ffff-ffff-ffff-ffffffffffff`.
- No replacement row landed (DB SELECT count = 0).
- Existing error shape preserved.

### E5 — F6A store-lane regression (PASS)

- `store_memory` with `category=f6af_e5`.
- Row `15ba6600` written with `embedding IS NOT NULL`, `dim=1536`.
- Store lane semantics untouched by this mission.

### E6 — recall non-target smoke (PASS)

- `recall_memory` dispatched.
- Existing recall pipeline preserved: `ME_Memory_Recall_Prep` emits `_error:true MISSING_REQUIRED_FIELDS` because `recall_memory` requires a `filter` param (pre-existing contract behavior — not changed by this mission). `ME_Memory_Recall_Result` emitted a non-error envelope with `summary="Memory recall completed (1 rows)."` consistent with pre-F6A-followup behavior (unchanged).
- `ME_Build_RA_Envelope` produced `module_batch` envelope; dispatched to WF-RA-01 subcall exec `4804`.
- This matches `V2-OBS-RECALL-SUMMARY-STRING` (cosmetic "1 rows" on empty) which was already logged as non-blocking follow-up pre-mission; F6A-followup did not touch the recall lane.

## DB invariant results (DB-1..DB-8)

| ID | Invariant | Observed | Result |
|---|---|---|---|
| DB-1 | pre-apply rows with `embedding IS NULL` unchanged (no backfill) | 117 total, 102 null, 15 with — same as Phase 0 baseline | **GREEN** |
| DB-2 | successful supersede replacement rows (mission namespace) have `embedding IS NOT NULL` | 1 supersede row → `has_embedding=true` | **GREEN** |
| DB-3 | vector dimension = 1536 | `dim=1536` on `a0eea3bb` | **GREEN** |
| DB-4 | old superseded row kept prior embedding state | `old.status=superseded`, `old.embedding IS NOT NULL` (seed E1 had embedding before supersede) — not overwritten by this mission | **GREEN** |
| DB-5 | no duplicate rows per `idempotency_key` (mission namespace supersede) | HAVING COUNT(*)<>1 returned 0 rows | **GREEN** |
| DB-6 | `idx_memory_items_embedding_cos` definition unchanged | byte-identical to pre-apply record | **GREEN** |
| DB-7 | row scope: only mission-namespace rows created by live smokes | `store_memory:2 (E1-seed, E5-store)`, `supersede_memory:1 (E1-supersede)`. All non-null embeddings. No other namespace rows. | **GREEN** |
| DB-8 | no direct DB writes by Claude (workflow-mediated only) | every Phase-7 row came from `execute_workflow` calls; only SELECTs via `mcp__postgres__execute_sql` | **GREEN** |

## Summary

- Local Phase 4: 38/38 GREEN (7 PF + 9 MU + 14 WD + 8 LI).
- Live Phase 7 E2E: **6/6 GREEN (E1..E6)**.
- DB invariants: **8/8 GREEN (DB-1..DB-8)**.
- Combined matrix: **52/52 oracles met**.

**Phase 7 verdict: GREEN.** Proceeding to Phase 8 reconciliation.
