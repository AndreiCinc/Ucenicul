# C11_REPLAY_GROUPING_TARGETED_RERUN · Runtime Results

Run-tag: `c11rg-2026-04-27` + `c11rg-2026-04-27-fresh`.
Channel: MCP `execute_workflow` against TR `wI8hpSROxQI0zC9f` (chat trigger).
Sequential firing (no parallel).

## Live executions

| Case | TR exec | status | role |
|---|---|---|---|
| C11-RG-001 | **10562** | success | replay-group: first delivery |
| C11-RG-002 | **10576** | success | replay-group: duplicate_delivery_1 |
| C11-RG-003 | **10579** | success | replay-group: duplicate_delivery_2 |
| C11-RG-004 | **10582** | success | replay-group: late_retry_after_state_change |
| C11-RG-005 | **10585** | success | fresh-control |

`status:success` here means the chat-trigger workflow returned without
error. For replay variants, the chain dedupes downstream (at OR) — the
fact that TR returned success is consistent with the chain's
gracefully-handled `NOT_READY_FOR_PLANNING` short-circuit (proven for
C11-V1 replay in FULL_240_RERUN TR 10166 closeout).

## Side-effect deltas

| Bucket | Pre-mission | Post-mission | Δ |
|---|---|---|---|
| `memory_items` for replay-group thread (`8567245f…`) | 0 | 1 | **+1** |
| `memory_items` for fresh-control thread (`9bcfc96c…`) | 0 | 1 | **+1** |
| `execution_contexts` for replay-group thread | 0 | 1 | **+1** |
| `execution_contexts` for fresh-control thread | 0 | 1 | **+1** |
| `reminders.count` | 1 | 1 | **0** |
| `reminders.max(created_at)` | 2026-04-13 | 2026-04-13 | unchanged |
| Tenant A or B `memory_items` for either thread | 0 | 0 | **0** |

## Replay-group memory row (C11-RG-001 only)

```
id=4fbb5661-98d6-45a9-ae46-c24fbe2f7be8
tenant_id=eee0e2e0-0000-0000-0000-000000000001
source_thread_id=8567245f-ae46-4cb8-847d-09f7c1a434a1
source_message_id=01b22ee4-3f47-4e5e-8922-0103fb40c918
idempotency_key=store_memory:5f75b3d7-e682-4d29-a300-54016deafb41:step_01_store_memory
status=active
content="prefer email dimineața"
created_at=2026-04-27T08:00:05.954Z
```

## Replay-group execution_context (single, shared)

```
id=5f75b3d7-e682-4d29-a300-54016deafb41
trigger_message_id=01b22ee4-3f47-4e5e-8922-0103fb40c918
status=completed
idempotency_key=tr-to-ec:eee0e2e0-…000001:01b22ee4-…0c918:v1
created_at=2026-04-27T08:00:01.905Z
```

## Fresh-control execution_context

```
id=68caf17d-845e-403e-9b6e-07e4272b36ba
trigger_message_id=077fa147-686d-4702-861e-6ded636405ae
status=completed
idempotency_key=tr-to-ec:eee0e2e0-…000001:077fa147-…05ae:v1
```

## Dedupe location (final answer)

The replay group dedupes at **OR**, not at Memory V2.

- The chain stage's internal idempotency_key
  (`tr-to-ec:<tenant>:<message_id>:v1`) — derived per F10 from
  `(tenant_id, trigger_message_id)` — uniquely keys
  `execution_contexts`.
- All 4 replay-group fires send the same `(tenant_id,
  message_id=01b22ee4…)` tuple. The first fire (C11-RG-001) inserts the
  EC and runs the full chain to MO, writing 1 `memory_items` row.
- C11-RG-002/003/004 each see EC already present (`status=completed`)
  and OR returns `NOT_READY_FOR_PLANNING`, short-circuiting before
  Memory V2 ever runs. **No new EC, no new memory row.**
- The request-level `idempotency_key` we send in the envelope
  (`e2e:c11rg-2026-04-27:C11-L1-replay`) is preserved in metadata but
  does **not** propagate into `memory_items.idempotency_key` — Memory V2
  derives its own internal key (`store_memory:<EC.id>:step_01_store_memory`).
  This is the F10 finding from
  `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` §5 confirmed once more.

The harness invariants (e.g. `assert_idempotency_unique` scoping by
`memory_items.idempotency_key LIKE 'e2e:%'`) would falsely pass even on
duplicate writes because the chain's actual key prefix is
`store_memory:`. The robust replay-grouping invariant is the
**tenant + thread + window** count of `memory_items`, which is exactly
what `assert_no_memory_write_for_case` and `assert_memory_row_exists`
already use post-F10 fix.
