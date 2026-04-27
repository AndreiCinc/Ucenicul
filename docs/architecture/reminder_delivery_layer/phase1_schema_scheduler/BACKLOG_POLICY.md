# Phase 1 · Backlog Policy

## Definition

A candidate is **backlog** when:

```
NOW() - tasks.due_at  >  INTERVAL '24 hours'
```

Computed in the candidate query as the column `is_backlog`.

## Outcome

| Condition | Outcome | Ledger row | Send |
|---|---|---|---|
| `is_backlog=true` AND `metadata.reminder_delivery.force_send IS NOT 'true'` | `skipped_backlog` | yes (`delivery_status='skipped_backlog'`) | NO |
| `is_backlog=true` AND `metadata.reminder_delivery.force_send='true'` | continues to mode-based outcome (`dry_run` / `live`) | yes | depends on mode |

The classification ordering is: **`missing_target` > `skipped_backlog`
> mode-based**. This means a backlogged candidate without a delivery
target is classified `missing_target`, not `skipped_backlog`.

## Why this matters

On the first scheduler activation, the candidate set will include all
historical past-due open tasks. With 22 such rows on tenant default
right now, naively sending each as a reminder would produce an
inappropriate batch. The backlog policy throttles this:

- ✅ Tasks within the last 24 h of due_at: get reminded.
- ✅ Tasks past 24 h of due_at: marked `skipped_backlog`, no send,
  ledger stamped → excluded from future ticks.
- ✅ Operator can override per-task by setting
  `metadata.reminder_delivery.force_send='true'`.

## Unit-test evidence

`artifacts/classify_unit_test.mjs` cases:

- `backlog_when_target_present` → `skipped_backlog` ✅
- `backlog_force_send_overrides` → `dry_run` ✅
- `missing_target_with_backlog` → `missing_target` ✅ (missing_target wins)

## Live evidence in current DB

Of the 24 ledger rows produced during the dry-run probe:

- 9 candidates from tenant default had `due_at < NOW() - INTERVAL '24h'`
  (legacy create_task fixtures from earlier missions) — all are
  CORRECTLY classified as `skipped_missing_target` (because
  `delivery_target` is NULL on tenant default; `missing_target` wins
  over `skipped_backlog`).
- The remaining 15 candidates have `is_backlog=false` (within 24 h of
  due_at) — also `skipped_missing_target`.

If a delivery_target had been present on tenant default, the 9
backlog rows would have been classified `skipped_backlog` instead.
That branch is exercised by the unit test.

## Phase 2 considerations

- Make the 24h threshold configurable per tenant (e.g.
  `tenants.metadata.reminder_backlog_hours`).
- Add a one-shot bulk-mark-backlog routine for first activation —
  marks all currently-past-24h reminders as `skipped_backlog` in a
  single transaction so the first scheduler tick is silent.
- Consider per-task `metadata.reminder_delivery.snooze_until` to delay
  delivery without losing the row (orthogonal to backlog throttle).
