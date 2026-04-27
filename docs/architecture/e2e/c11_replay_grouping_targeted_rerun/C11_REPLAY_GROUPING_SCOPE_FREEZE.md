# C11_REPLAY_GROUPING_TARGETED_RERUN · Scope Freeze

Run-tag: `c11rg-2026-04-27`
Date opened: 2026-04-27 (autonomous run, post-FULL_240_VARIANT_SWEEP_GREEN)
Mission: 1 of 3 in `ucenicul_next_3_followups_pack`.

## Why this mission

`FULL_240_VARIANT_SWEEP_CLOSEOUT.md` documents that C11 V2/V3/V4 in the
variant sweep used per-variant idempotency keys (i.e. each fired with
`replayHint=null` so `buildCaseRuntime` regenerated message_id/thread_id
deterministically per case_id) — therefore each was treated as a fresh
delivery and three separate `memory_items` rows were written. The C11
chain replay invariant under the canonical replay key was proven
separately by V1 first + V1 replay in `FULL_240_RERUN`
(TR 10152 first → TR 10166 replay rejected at OR
`NOT_READY_FOR_PLANNING`), but the matrix-canonical V2/V3/V4 grouping was
deferred as `FIXTURE_BUG`.

This mission closes that caveat with a targeted live rerun using the
exact `tr_envelope.mjs::deriveIdempotencyKey` C11 grouping plus
`replayHint` so V1+V2+V3+V4 share the same `idempotency_key`,
`message_id`, and `thread_id`. A fresh control case (C11-RG-005) fires
with a brand-new replay-group key to confirm a legitimate additional
write happens.

## What this mission is NOT

- Not a workflow patch.
- Not a schema migration.
- Not a Memory V2 reopen.
- Not a duplicate workflow.
- Not Path 5.
- Not a fresh harness write — `tr_envelope.mjs` is read-only here.

## In-scope cases (5 sequential live fires)

| Case | Variant | Replay-group key | Expected |
|---|---|---|---|
| C11-RG-001 | first_delivery (V1) | `e2e:c11rg-2026-04-27:C11-L1-replay` | first delivery writes 1 `memory_items` row |
| C11-RG-002 | duplicate_delivery_1 (V2) | same | dedupe, 0 NEW row |
| C11-RG-003 | duplicate_delivery_2 (V3) | same | dedupe, 0 NEW row |
| C11-RG-004 | late_retry_after_state_change (V4) | same | dedupe, 0 NEW row |
| C11-RG-005 | first_delivery (V1) — fresh group | `e2e:c11rg-2026-04-27:C11-L1-replay-fresh` | fresh group writes 1 NEW row |

Same tenant, same logical thread, same `messages.intent='store_memory'`.
Sequential firing (no parallel) so the chain timestamp-proximity walker
isn't confused.

## Replay-grouping mechanism

`tr_envelope.mjs::deriveIdempotencyKey` returns
`e2e:${runTag}:${cor}-L${level}-replay` for variants matching
`/duplicate_delivery_|late_retry_/`. For first_delivery it returns
`e2e:${runTag}:${case_id}` instead. To force V1's first_delivery into
the same replay group, the targeted-rerun script sets
`runtime.idempotency_key = 'e2e:c11rg-2026-04-27:C11-L1-replay'` after
calling `buildCaseRuntime`. Then V2/V3/V4 are built with
`replayHint = { idempotency_key, message_id, thread_id }` from V1's
runtime so they all share the tuple.

C11-RG-005 (fresh control) builds its runtime with `runTag='c11rg-2026-04-27-fresh'`
so its replay-group key (`e2e:c11rg-2026-04-27-fresh:C11-L1-replay`) is
distinct from the main replay group. (Note: thread_id is also derived
from `runTag|thread|C11:replay-L1`, so the fresh group fires under a
distinct thread — same tenant, no cross-replay-group contamination.)

## Apply policy

- No workflow mutation. (Workflow mutation count must end at 0.)
- No schema migration. (Schema mutation count must end at 0.)
- No Path 5.
- No duplicate workflows.
- No MCP workflow write.
- All fires through MCP `execute_workflow` chat trigger on TR
  `wI8hpSROxQI0zC9f` — same channel used by FULL_240_RERUN /
  VARIANT_SWEEP.
- `public.reminders` baseline frozen at count=1, last=2026-04-13
  (must remain unchanged at end of mission).

## Pre-state (verified 2026-04-27)

- WF-PL-01 versionId `839b1750-2fb2-40ab-aeb2-88508d0a01c7`,
  16 nodes / 16 connections, active=true.
- WF-ME-01 versionId `328b2b81-58e6-4003-8966-4159d695cfda`,
  62 nodes / 81 connections, active=true.
- `public.reminders` count=1, max(created_at)=2026-04-13 20:17:13Z.

## SQL invariants

For the replay group (cases C11-RG-001..004) and the fresh control
(C11-RG-005), invariants are scoped by tenant + thread + window per F10
fix in `e2e_sql_invariants.mjs`:

1. **INV-1** `assert_exactly_one_domain_row_per_idempotency_key` —
   `memory_items WHERE tenant_id=$1 AND idempotency_key='e2e:c11rg-2026-04-27:C11-L1-replay'` → count = 1 (replay group dedupe).
2. **INV-2** `assert_one_outbound_for_case` — outbound ledger keyed on
   `idempotency_key='e2e:c11rg-2026-04-27:C11-L1-replay'`. Expected 0 in
   raw form (KNOWN_FIXTURE_LIMITATION — no telegram_chat_id). Demoted by
   oracle.
3. **INV-3** `assert_thread_id_reused` — execution_contexts within
   tenant+thread+window (replay group) → count distinct ≤ 1.
4. **INV-4** `assert_no_cross_thread_execution_state_resume` — count
   execution_contexts within tenant+thread+window ≤ 3 (4 fires may
   create up to 4 contexts but OR's `NOT_READY_FOR_PLANNING` short-
   circuit means most replays don't insert a new context).
5. **INV-5** fresh-control `memory_items` row count = 1 within fresh
   thread+window.
6. **INV-6** `public.reminders` count=1 unchanged.
7. **INV-7** workflow mutation count = 0 (verify both PL+ME versionIds
   unchanged post-mission).
8. **INV-8** schema mutation count = 0 (no DDL applied).

## P0 stop conditions

Stop immediately if:

- Replay group with shared idempotency_key writes >1 `memory_items` row.
- Replay group fires write to a different tenant.
- `public.reminders` count or max(created_at) changes.
- Any workflow versionId changes during the mission.
- Any schema mutation surfaces.
- Path 5 invocation needed.
- Duplicate workflow created.

## Verdict options

- `C11_REPLAY_GROUPING_TARGETED_RERUN_READY = TRUE`
- `C11_REPLAY_GROUPING_TARGETED_RERUN_PARTIAL_WITH_BLOCKERS`
- `C11_REPLAY_GROUPING_TARGETED_RERUN_STOPPED_ON_P0`
