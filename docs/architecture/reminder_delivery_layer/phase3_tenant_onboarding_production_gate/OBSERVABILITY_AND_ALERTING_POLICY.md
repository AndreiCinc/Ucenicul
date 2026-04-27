# Phase 3 · Observability and Alerting Policy

## Single source of truth

`public.task_reminder_deliveries` is the canonical audit ledger for
the Reminder Delivery Layer. All observability queries and alerts
read from this table.

Companion sources:

- `public.tenants.metadata->>'telegram_chat_id'` for the per-tenant
  delivery target (must be NULL for non-pilot tenants).
- `public.tasks` for the source-of-truth on what's due.
- n8n's own execution log (per-tick exec status + per-node duration).

`public.reminders` and `public.outbound_delivery_ledger_claude_mcp`
are NOT used by the Reminder Delivery Layer; their content must
remain byte-identical to the Phase 1 baseline at all times.

## Observability queries

### Per-tick health (last 5 minutes)

```sql
SELECT delivery_status, count(*)
FROM public.task_reminder_deliveries
WHERE last_attempt_at >= NOW() - INTERVAL '5 minutes'
GROUP BY delivery_status
ORDER BY delivery_status;
```

### Daily report

```sql
SELECT date_trunc('day', last_attempt_at) AS day,
       delivery_status, count(*)
FROM public.task_reminder_deliveries
WHERE last_attempt_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY 1, 2;
```

### Per-tenant breakdown

```sql
SELECT tenant_id, delivery_status, count(*)
FROM public.task_reminder_deliveries
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY 1, 2
ORDER BY 1, 2;
```

### Failed-and-not-yet-terminal queue

```sql
SELECT id, tenant_id, task_id, attempts, last_error, last_attempt_at
FROM public.task_reminder_deliveries
WHERE delivery_status = 'failed'
  AND attempts < 3
ORDER BY last_attempt_at DESC;
```

### Stuck `pending` rows (operator should investigate)

```sql
SELECT id, tenant_id, task_id, last_attempt_at
FROM public.task_reminder_deliveries
WHERE delivery_status = 'pending'
  AND last_attempt_at < NOW() - INTERVAL '15 minutes';
```

## Alert rules (Phase 4 entry)

| Alert | Trigger | Severity | Action |
|---|---|---|---|
| Failed sends in tick | `count(failed) >= 1` in last 5 min | P3 | operator inspection |
| Consecutive failures | `count(failed) >= 3` for the same task | P2 | operator inspection + temporary deactivate |
| Too many candidates | `candidates_seen > candidate_limit` for the pilot tenant | P2 | review fixture data |
| `public.reminders` mutation | row count or max(created_at) changes | **P1** | immediate deactivate; ADR violation suspected |
| `outbound_delivery_ledger_claude_mcp` row from RD | any row with channel='telegram' inserted by a non-MO workflow | **P1** | immediate deactivate; misconfigured Telegram node |
| Stuck pending | row stuck in `pending` for > 15 min | P3 | operator inspection |
| Cross-tenant ledger row | a row in `task_reminder_deliveries` whose `task_id`'s task tenant differs from the row's tenant_id | **P0** | immediate deactivate; bug |
| Workflow active=true outside pilot window | `WF-RD-01.active=true` outside an explicit Phase 4 mission window | **P1** | immediate deactivate; unauthorised activation |

## Logging requirements

For Phase 4 v1, the operator should keep:

- A daily `reminder-delivery-report.md` with the daily-report query
  output for the past 7 days.
- Per-tick exec ids from n8n's UI.
- The pilot tenant id and chat id pinned in a small operator-only doc.

Phase 5+ may bring metric exporters (Prometheus, etc.). Out of scope
for Phase 3.

## Phase 3 invariant

Phase 3 does NOT wire alerts. It documents the policy that Phase 4
will implement.
