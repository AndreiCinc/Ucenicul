# C11_REPLAY_GROUPING_TARGETED_RERUN · Fixtures

Run-tag (replay group): `c11rg-2026-04-27`
Run-tag (fresh control): `c11rg-2026-04-27-fresh`

## Replay-group derivation

`tr_envelope.mjs::deriveIdempotencyKey` for C11 with variant matching
`/duplicate_delivery_|late_retry_/` returns
`e2e:${runTag}:C11-L1-replay`. For first_delivery it returns
`e2e:${runTag}:C11-L1-V1`. To force V1 into the canonical replay group,
the rerun script overrides V1's runtime `idempotency_key`:

```js
v1Runtime.idempotency_key = `e2e:${RUN_TAG}:C11-L1-replay`;
```

V2/V3/V4 are then built with `replayHint = { idempotency_key,
message_id, thread_id }` taken from V1's runtime — `buildCaseRuntime`
honors the hint when `ctx.kind === 'replay'` (which is true for those
three variants), so all three inherit the same tuple.

## Generated runtimes

Source: `artifacts/build_c11_rg_runtimes.mjs` →
`artifacts/C11_RG_RUNTIME_SUMMARY.json`. Verified via assertEq that all
four main-replay-group cases share identical `idempotency_key`,
`message_id`, `thread_id`, `tenant_id`.

| Case | Variant | tenant_id | thread_id | message_id | idempotency_key |
|---|---|---|---|---|---|
| C11-RG-001 | first_delivery | `eee0e2e0…001` | `8567245f-ae46-4cb8-847d-09f7c1a434a1` | `01b22ee4-3f47-4e5e-8922-0103fb40c918` | `e2e:c11rg-2026-04-27:C11-L1-replay` |
| C11-RG-002 | duplicate_delivery_1 | same | same | same | same |
| C11-RG-003 | duplicate_delivery_2 | same | same | same | same |
| C11-RG-004 | late_retry_after_state_change | same | same | same | same |
| C11-RG-005 | first_delivery (fresh) | `eee0e2e0…001` | `9bcfc96c-71b0-4388-895a-d25406e56fb1` | `077fa147-686d-4702-861e-6ded636405ae` | `e2e:c11rg-2026-04-27-fresh:C11-L1-replay` |

## Pre-seed pack (idempotent SQL)

`artifacts/seed.sql` upserts:

- 1 tenant row (E2E default lane — already existed; idempotent ON CONFLICT).
- 2 thread rows: replay-group (`8567245f…`) + fresh-control (`9bcfc96c…`).
- 2 message rows (intent=`store_memory`, channel=`e2e-rich-matrix`):
  - shared replay-group message (`01b22ee4…`) with `source_message_ref='e2e:C11-RG-001'`
  - fresh-control message (`077fa147…`) with `source_message_ref='e2e:C11-RG-005'`.

Applied successfully: `threads_seeded=2`, `messages_seeded=2`.

## Pre-state (2026-04-27, before any fire)

| Bucket | Value |
|---|---|
| `memory_items.idempotency_key='e2e:c11rg-2026-04-27:C11-L1-replay'` | 0 |
| `memory_items.idempotency_key='e2e:c11rg-2026-04-27-fresh:C11-L1-replay'` | 0 |
| `memory_items.source_thread_id=8567245f…` | 0 |
| `memory_items.source_thread_id=9bcfc96c…` | 0 |
| `threads.id=8567245f…` exists | 0 → 1 (after seed) |
| `threads.id=9bcfc96c…` exists | 0 → 1 (after seed) |
| `reminders.count` | 1 |
| `reminders.max(created_at)` | 2026-04-13 20:17:13Z |
| `memory_items` total in tenant default | 44 |
