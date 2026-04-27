# C11_REPLAY_GROUPING_TARGETED_RERUN · Execution Log

Run-tag (replay group): `c11rg-2026-04-27`. Run-tag (fresh): `c11rg-2026-04-27-fresh`.
Repo root: `/sessions/hopeful-gifted-carson/mnt/Ucenicul`.
Started: 2026-04-27 (autonomous run, post-FULL_240_VARIANT_SWEEP_GREEN).

## Pre-state verification

- WF-PL-01 versionId `839b1750-2fb2-40ab-aeb2-88508d0a01c7` (16n/16c) — matches FULL_240_VARIANT_SWEEP baseline.
- WF-ME-01 versionId `328b2b81-58e6-4003-8966-4159d695cfda` (62n/81c) — matches baseline.
- `public.reminders` count=1, max(created_at)=2026-04-13 20:17:13Z.
- `memory_items` total in tenant default = 44 (FULL_240_VARIANT_SWEEP closeout cited 41; +3 since closeout — unrelated to this mission).

## Discovery

1. Read `tr_envelope.mjs::deriveIdempotencyKey` → C11 replay variants
   (`duplicate_delivery_*` / `late_retry_after_state_change`) get key
   `e2e:${runTag}:C11-L${level}-replay`. First_delivery uses
   `e2e:${runTag}:${case_id}`.
2. Read `buildCaseRuntime` → `replayHint` is honored only when
   `pickThreadContext.kind === 'replay'`. For first_delivery, kind is
   `seeded-fresh`, so passing a hint to V1 has no effect — explicit
   override of `runtime.idempotency_key` after `buildCaseRuntime` is
   required.
3. `pickThreadLabel` for C11 with variants matching
   `first_delivery|duplicate_delivery_|late_retry_` returns
   `C11:replay-L1` — so V1 first_delivery's natural thread_id is
   already the canonical replay-group thread.
4. F10 noted in main reconciliation: chain stages derive their own
   internal idempotency_key. Memory V2 row's key is
   `store_memory:<EC.id>:step_01_store_memory` — request-level key from
   the envelope is metadata-only.
5. F9 reclassified: `orchestrator_input` flags are descriptive, not
   gating — the chain DOES write side effects in live mode (no
   product-decision gate to flip).

## Build phase

- Mission folder created at `docs/architecture/e2e/c11_replay_grouping_targeted_rerun/`.
- `artifacts/build_c11_rg_runtimes.mjs` written; runs `node` against
  the canonical harness primitives, no harness mutation.
- 5 `<case_id>.runtime.json` + `<case_id>.envelope.json` files
  produced. `assertEq` in the script verifies all 4 main-replay-group
  cases share `idempotency_key`, `message_id`, `thread_id`, `tenant_id`.

## Seed phase

- `artifacts/seed.sql` generated with idempotent INSERTs.
- Applied via `mcp__postgres__execute_sql` — `threads_seeded=2`,
  `messages_seeded=2`. No DDL.

## Sequential live fires (MCP execute_workflow against TR `wI8hpSROxQI0zC9f`)

| Order | Case | TR exec | Δ memory_items in replay-group thread |
|---|---|---|---|
| 1 | C11-RG-001 (first delivery) | **10562** | 0 → 1 |
| 2 | C11-RG-002 (duplicate_delivery_1) | **10576** | 1 → 1 |
| 3 | C11-RG-003 (duplicate_delivery_2) | **10579** | 1 → 1 |
| 4 | C11-RG-004 (late_retry_after_state_change) | **10582** | 1 → 1 |
| 5 | C11-RG-005 (fresh control) | **10585** | n/a (different thread) → 1 |

After all 5 fires:

- replay-group thread `8567245f…` has exactly **1** `memory_items` row.
- replay-group thread has exactly **1** `execution_contexts` row,
  shared `trigger_message_id=01b22ee4…`.
- fresh-control thread `9bcfc96c…` has exactly **1** `memory_items` row
  and **1** `execution_contexts` row.
- `reminders.count=1`, `reminders.max(created_at)=2026-04-13` unchanged.
- Tenant A and Tenant B `memory_items` for either thread = 0.

## Post-state verification

- `mcp__n8n__verify_workflow` for WF-PL-01 → versionId
  `839b1750-2fb2-40ab-aeb2-88508d0a01c7` unchanged, 16/16 nodes/conns.
- `mcp__n8n__verify_workflow` for WF-ME-01 → versionId
  `328b2b81-58e6-4003-8966-4159d695cfda` unchanged, 62/81 nodes/conns.
- All 8 SQL invariants in `C11_REPLAY_GROUPING_SQL_INVARIANTS.md` ✅.

## Closeout

Verdict: **`C11_REPLAY_GROUPING_TARGETED_RERUN_READY = TRUE`**.

Workflow mutation count: **0**. Schema mutation count: **0**. Path 5: **NO**. Duplicate workflows: **0**. Unauthorized MCP write: **NO**. Memory V2 reopen: **NO**.

Mission docs all written under
`docs/architecture/e2e/c11_replay_grouping_targeted_rerun/`.
