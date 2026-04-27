# Phase 1 · Schema Migration

## Migration file

Path: `db/migrations/20260427_add_task_reminder_deliveries.up.sql`

```sql
BEGIN;

CREATE TABLE public.task_reminder_deliveries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL,
  task_id              uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  due_occurrence_iso   text NOT NULL,
  delivery_key         text NOT NULL,
  delivery_status      text NOT NULL,
  channel              text,
  delivery_target      text,
  attempts             int  NOT NULL DEFAULT 0,
  last_attempt_at      timestamptz,
  sent_at              timestamptz,
  last_error           text,
  provider_message_ref text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, task_id, due_occurrence_iso)
);

CREATE INDEX task_reminder_deliveries_status_idx
  ON public.task_reminder_deliveries (tenant_id, delivery_status, last_attempt_at);

CREATE INDEX task_reminder_deliveries_task_idx
  ON public.task_reminder_deliveries (task_id);

COMMIT;
```

Plus a `COMMENT ON TABLE` documenting the `delivery_status` value set
`{pending, sent, failed, failed_terminal, skipped_missing_target,
skipped_backlog, dry_run}`.

## Application result

Applied via `mcp__postgres__execute_sql`. Live verification:

| Check | Expected | Result |
|---|---|---|
| `information_schema.tables` row exists | 1 | 1 ✅ |
| `information_schema.columns` count | 15 | 15 ✅ |
| `pg_indexes` count | 4 (PK + UNIQUE + 2 secondary) | 4 ✅ |
| FK to `public.tasks(id)` ON DELETE CASCADE | yes | ✅ (constraint `task_reminder_deliveries_task_id_fkey`) |
| UNIQUE `(tenant_id, task_id, due_occurrence_iso)` | yes | ✅ (constraint `…_tenant_id_task_id_due_occurrence_i_key`) |
| `tasks` count unchanged | 98 | 98 ✅ |
| `reminders` count unchanged | 1 | 1 ✅ |
| `reminders` max(created_at) unchanged | 2026-04-13 20:17:13Z | 2026-04-13 20:17:13.620582+00 ✅ |
| `outbound_delivery_ledger_claude_mcp` count | 0 | 0 ✅ (still untouched) |

## Constraints (enforced)

- `task_reminder_deliveries_pkey` — PRIMARY KEY (id)
- `task_reminder_deliveries_task_id_fkey` — FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
- `task_reminder_deliveries_tenant_id_task_id_due_occurrence_i_key` — UNIQUE (tenant_id, task_id, due_occurrence_iso)

## Indexes

- `task_reminder_deliveries_pkey` — UNIQUE BTREE (id)
- `task_reminder_deliveries_status_idx` — BTREE (tenant_id, delivery_status, last_attempt_at)
- `task_reminder_deliveries_task_idx` — BTREE (task_id)
- `task_reminder_deliveries_tenant_id_task_id_due_occurrence_i_key` — UNIQUE BTREE (tenant_id, task_id, due_occurrence_iso)

## UNIQUE proof (live SQL)

```sql
INSERT … ('eee0e2e0-…0001', 'aaaaaaaa-…0001', '2026-04-27T07:00:00Z', …)
ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO NOTHING;
-- → 1 row inserted

INSERT …  -- exact same key
ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO NOTHING;
-- → 0 rows inserted; total still 1
```

Result: ✅ duplicate insert blocked.

## Schema delta (whole DB)

| Table | Δ | Notes |
|---|---|---|
| `public.task_reminder_deliveries` | **+1 (new)** | additive |
| `public.tasks` | 0 | byte-identical |
| `public.reminders` | 0 | byte-identical |
| `public.outbound_delivery_ledger_claude_mcp` | 0 | byte-identical |
| All other tables | 0 | byte-identical |

**Schema mutation count: +1 table, +2 secondary indexes (the PK + UNIQUE
indexes are auto-created with the constraints).**
