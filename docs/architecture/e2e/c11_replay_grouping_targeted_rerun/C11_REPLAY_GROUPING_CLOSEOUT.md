# C11_REPLAY_GROUPING_TARGETED_RERUN · Closeout

Mission: `C11_REPLAY_GROUPING_TARGETED_RERUN` (Mission 1 of 3 in
`ucenicul_next_3_followups_pack`).
Date: 2026-04-27 (autonomous run, post-FULL_240_VARIANT_SWEEP).
Closes: the deferred `FIXTURE_BUG` from `FULL_240_VARIANT_SWEEP_FAILURE_CLASSIFICATION.md`.

## Verdict

**`C11_REPLAY_GROUPING_TARGETED_RERUN_READY = TRUE`**

5 sequential live fires through the canonical TR→…→MO chain. The 4
replay-group fires (V1 first delivery + V2/V3/V4 dedupe variants)
shared the canonical `(tenant_id, thread_id, message_id,
idempotency_key)` tuple per `tr_envelope.mjs::deriveIdempotencyKey` +
`replayHint`; the chain dedupes at OR via `execution_contexts`
uniqueness and produced exactly **1** `memory_items` row across all 4
fires. The fresh-control fire (distinct tuple) produced exactly **1**
legitimate additional row.

## Counts

| Bucket | Value |
|---|---|
| Cases prepared (envelopes) | 5 |
| Cases fired through MCP execute_workflow | 5 |
| Cases that reached MO | 1 (C11-RG-001 first delivery + C11-RG-005 fresh control) |
| Replay-group fires that dedupe-rejected | 3 (C11-RG-002/003/004) |
| Workflow mutations | **0** |
| Schema mutations | **0** |
| Duplicate workflows | **0** |
| Path 5 invocations | **0** |
| Unauthorized MCP writes | **0** |
| Memory V2 reopen | **NO** |

## Workflow lineage (lineage = unchanged)

| Workflow | Pre versionId | Post versionId | Nodes / connections |
|---|---|---|---|
| WF-TR-01 | `88d2d45b…` | unchanged | unchanged |
| WF-EC-01 | `d25e4316…` | unchanged | unchanged |
| WF-OR-01 | `f4925ede…` | unchanged | unchanged |
| WF-PL-01 | `839b1750-2fb2-40ab-aeb2-88508d0a01c7` | **same** | 16 / 16 |
| WF-DI-01 | `a1f9eaa2…` | unchanged | unchanged |
| WF-ME-01 | `328b2b81-58e6-4003-8966-4159d695cfda` | **same** | 62 / 81 |

PL + ME re-verified live via `mcp__n8n__verify_workflow` after the last fire.

## Side-effect summary

| Table | Pre-mission | Post-mission | Δ |
|---|---|---|---|
| `public.reminders` | count=1, max=2026-04-13 | count=1, max=2026-04-13 | **0** |
| `public.threads` (e2e c11rg) | 0 | 2 | +2 (idempotent seed) |
| `public.messages` (e2e c11rg) | 0 | 2 | +2 (idempotent seed) |
| `public.memory_items` (replay-group thread) | 0 | 1 | +1 |
| `public.memory_items` (fresh-control thread) | 0 | 1 | +1 |
| `public.execution_contexts` (replay-group thread) | 0 | 1 | +1 |
| `public.execution_contexts` (fresh-control thread) | 0 | 1 | +1 |
| `public.memory_items` (tenant A or B for these threads) | 0 | 0 | 0 |

## SQL invariants

All 7 measured invariants ✅ (see `C11_REPLAY_GROUPING_SQL_INVARIANTS.md`):

- INV-1 replay-group dedupe (1 row) ✅
- INV-3 EC reuse (1 EC, 1 distinct thread) ✅
- INV-5 fresh-control writes 1 row ✅
- INV-6 reminders unchanged ✅
- INV-7 workflow versionIds unchanged ✅
- INV-8 schema mutations = 0 ✅
- cross-tenant leak = 0 ✅

## Dedupe location finding

The C11 replay-group dedupe is enforced **at OR**, via uniqueness on
`(tenant_id, trigger_message_id)` of `execution_contexts`. The first
delivery's chain inserts EC `5f75b3d7…`; subsequent fires with the same
`message_id=01b22ee4…` see EC already present and OR returns
`NOT_READY_FOR_PLANNING` per FULL_240_RERUN evidence — Memory V2 is
never invoked for those replays.

The request-level `idempotency_key` from the envelope
(`e2e:c11rg-2026-04-27:C11-L1-replay`) is preserved in metadata but is
**not** propagated to `memory_items.idempotency_key` (which is derived
internally per chain stage — F10 finding from main reconciliation).
The robust replay invariant therefore uses
**tenant + thread + window** scoping (already adopted in
`assert_no_memory_write_for_case` and `assert_memory_row_exists`
post-F10 fix).

## Per-mission acceptance checklist

- [x] Exact harness replay key behavior inspected (`tr_envelope.mjs`
      lines 62-69 + 110-135 confirmed live).
- [x] Replay group fired sequentially (no parallel — TR exec
      10562/10576/10579/10582).
- [x] Replay group has exactly one logical domain row (1 memory + 1 EC).
- [x] Fresh control writes one legitimate additional row.
- [x] No workflow mutation (versionIds verified post-mission).
- [x] No schema mutation (0 DDL).
- [x] Reminders baseline preserved.

## Final verdict

**`C11_REPLAY_GROUPING_TARGETED_RERUN_READY = TRUE`**

The canonical C11 V2/V3/V4 replay grouping caveat from
`FULL_240_VARIANT_SWEEP` is now closed. The C11 replay invariant under
the harness's matrix-canonical `deriveIdempotencyKey` + `replayHint` is
proven end-to-end through the canonical chain.
