# Phase 4 · Backlog Bootstrap Log

## SQL applied (idempotent ON CONFLICT DO NOTHING)

```sql
INSERT INTO public.task_reminder_deliveries
  (tenant_id, task_id, due_occurrence_iso, delivery_key, delivery_status, channel, attempts)
SELECT t.tenant_id, t.id,
       to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:00"Z"'),
       'rd:' || t.tenant_id || ':' || t.id || ':' ||
         to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:00"Z"'),
       'skipped_backlog'::text, 'telegram'::text, 0
FROM public.tasks t
WHERE t.tenant_id = 'eee0e2e0-0000-0000-0000-00000000000b'::uuid
  AND t.status = 'open'
  AND t.due_at IS NOT NULL
  AND t.due_at <= NOW() - INTERVAL '24 hours'
ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO NOTHING
RETURNING task_id, due_occurrence_iso, delivery_status;
```

## Result

**0 rows inserted** — tenant B had no `open` tasks with `due_at` more
than 24h in the past at the time of bootstrap. Tenant B's pre-existing
`rd-phase…` fixtures from Phase 2 are `status='cancelled'`, so they
were excluded by the `t.status='open'` filter.

This is a clean-slate bootstrap. Tenant B starts the pilot with zero
backlog, which is exactly the safe condition for a controlled pilot.

## Final tenant B ledger state pre-activation

```sql
SELECT count(*)::int FROM public.task_reminder_deliveries
 WHERE tenant_id='eee0e2e0-0000-0000-0000-00000000000b'::uuid;
-- → 1 (the Phase 2 'sent' audit row, kept as historical evidence)
```

The single existing tenant B row is `delivery_status='sent'` from
Phase 2 → excluded by the candidate query's `NOT IN ('sent', …)`
clause. **No tenant B candidate would survive the candidate query
unless a new task is added** — which is exactly what the pilot
fixture provides.
