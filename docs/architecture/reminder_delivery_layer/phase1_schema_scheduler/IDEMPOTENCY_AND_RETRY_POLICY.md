# Phase 1 · Idempotency and Retry Policy

## Canonical key

```
due_occurrence_iso = to_char(date_trunc('minute', tasks.due_at AT TIME ZONE 'UTC'),
                              'YYYY-MM-DD"T"HH24:MI:00"Z"')
delivery_key       = `rd:${tenant_id}:${task_id}:${due_occurrence_iso}`
idempotency_key    = `rd:` + sha256(delivery_key)[0:24]
```

The `due_occurrence_iso` truncation to minute-precision is the canonical
unit of "one delivery occurrence". For non-recurring reminders this
gives one occurrence per task. A future recurring-reminders mission
will fire a new occurrence per scheduled time.

## Database-side enforcement

`UNIQUE (tenant_id, task_id, due_occurrence_iso)` on
`public.task_reminder_deliveries`. Any second `INSERT` with the same
tuple takes the `ON CONFLICT (...) DO UPDATE` branch.

## Workflow-side self-throttling

The candidate query LEFT JOINs the ledger and excludes rows whose
`delivery_status ∈ {sent, failed_terminal, skipped_missing_target,
skipped_backlog}`. Therefore:

- A candidate that reached a terminal state cannot re-appear on later
  ticks.
- A `pending` row CAN re-appear on later ticks (the live path is
  expected to converge to `sent` or to be retried; if it stays
  `pending` without progress, the operator has visibility via the
  ledger).
- A `dry_run` row CAN re-appear on later ticks (dry-run is not
  terminal; it's an audit marker that can be re-evaluated). Phase 2
  may move `dry_run` to terminal-in-the-NOT-IN-list if the operator
  prefers strict one-shot dry-run semantics.

## Live retry policy

- On send failure, `delivery_status='failed'`, `last_error=…`,
  `attempts` incremented.
- Subsequent ticks re-pick the row (since `failed` is not in the
  exclusion list).
- After N failed retries (operator-configurable; recommended N=3),
  the operator OR a Phase 2 helper UPDATEs the row to
  `delivery_status='failed_terminal'`. That moves it out of the
  candidate set permanently.

(N is **not** auto-enforced in Phase 1 v1; live sending is gated
on tenant onboarding, so failures will be inspectable via the
ledger before any auto-retry runs hot.)

## Concurrency guarantees

- n8n's `executionOrder: 'v1'` ensures sub-workflow item flow is
  deterministic per execution.
- Two scheduler ticks racing on the same `(tenant_id, task_id,
  due_occurrence_iso)` tuple will both resolve via `ON CONFLICT DO
  UPDATE` — exactly one ledger row, with `attempts` incremented twice
  if both ticks fired before either's send completed.
- Concurrency cap: the candidate query is `LIMIT $1::int`
  (default 50). For multi-instance n8n, additional locking would be
  needed; Phase 1 v1 assumes a single n8n instance.
- The schedule trigger is INACTIVE on import — only manual MCP-driven
  fires happen until operator activation.

## Live evidence

The dry-run probe was fired three times during this mission:

| Tick | TR exec | Ledger rows before | Ledger rows after | New rows | Action |
|---|---|---|---|---|---|
| 1 | 10796 | 0 | 24 | +24 | Initial classification (all skipped_missing_target on the e2e tenants) |
| 2 | 10797 | 24 | 24 | **0** | Candidate query saw 0 rows (self-throttled) — no UPSERT fired |
| 3 (after manually resetting F1 to `pending`) | 10798 | 24 | 24 | **0 new rows**; F1's `attempts` went from 1 → 2 (UPSERT-DO-UPDATE branch confirmed) |

Per-tuple distinct count post-mission: 24 / 24 ⇒ UNIQUE holds.
