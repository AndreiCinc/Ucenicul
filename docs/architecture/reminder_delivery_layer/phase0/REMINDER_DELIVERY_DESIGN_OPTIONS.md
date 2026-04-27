# REMINDER_DELIVERY_LAYER · Phase 0 · Design Options

## Option A — metadata-only delivery state on `tasks.metadata`

Use existing `tasks.metadata` jsonb column to store delivery state:

```jsonc
{
  "metadata": { "origin": "reminder_intent" },     // already set by PL
  "reminder_delivery": {
    "status": "pending|sent|failed|skipped_missing_target",
    "last_attempt_at": "2026-04-27T08:30:00Z",
    "sent_at": "2026-04-27T08:30:01Z",
    "delivery_attempts": 1,
    "last_error": null,
    "delivery_key": "rd:<tenant_id>:<task_id>:<due_occurrence_iso>",
    "channel": "telegram",
    "target_status": "present|missing"
  }
}
```

### Pros

- **No schema migration** — works immediately against the existing
  `tasks.metadata` column.
- Simple to inspect via `tasks.metadata->'reminder_delivery'`.
- Idempotency key can be derived deterministically from
  `(tenant_id, task_id, due_at-ISO truncated to minute)` — stable
  across retries.

### Cons

- jsonb update concurrency is heavier (no row-level lock per delivery
  attempt without `SELECT … FOR UPDATE`).
- Audit reporting needs `WHERE metadata ? 'reminder_delivery'` scans;
  no clean index without an expression index.
- Conflates reminder-delivery state with general task metadata.
- Cannot model per-occurrence delivery for recurring reminders (out of
  scope today, but a future hard wall).
- No FK to other delivery audits (each task is the only audit row).

### Suitability

- **Phase 0 dry-run: PERFECT.** No mutation, no migration, easy to
  generate intended payload from existing rows.
- **Phase 1 live: ACCEPTABLE for a single-shot delivery model**
  (one reminder per task). Recurring reminders out of scope.

## Option B — dedicated `public.task_reminder_deliveries` ledger

```sql
CREATE TABLE public.task_reminder_deliveries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL,
  task_id              uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  due_occurrence_iso   text NOT NULL,         -- canonical due moment (truncated to minute) for idempotency
  delivery_key         text NOT NULL,         -- '${tenant_id}:${task_id}:${due_occurrence_iso}' or sha
  delivery_status      text NOT NULL,         -- 'pending|sent|failed|skipped_missing_target'
  channel              text,                  -- 'telegram|whatsapp|none'
  delivery_target      text,                  -- chat id or null
  attempts             int  NOT NULL DEFAULT 0,
  last_attempt_at      timestamptz,
  sent_at              timestamptz,
  last_error           text,
  provider_message_ref text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, task_id, due_occurrence_iso)
);

CREATE INDEX task_reminder_deliveries_due_idx
  ON public.task_reminder_deliveries (tenant_id, delivery_status, last_attempt_at);
```

### Pros

- **Strong audit and idempotency** via UNIQUE constraint on
  `(tenant_id, task_id, due_occurrence_iso)`.
- Clean retry / failure / snooze model on per-occurrence rows.
- Plays well with future recurring reminders (one row per occurrence).
- Reportable; doesn't conflate task state with delivery state.
- FK to `tasks` ensures cleanup on task deletion.

### Cons

- **Requires schema migration** — needs operator/repo migration policy
  authorization (out of Phase 0 scope per pack).
- Slightly heavier write path.
- Needs migration rollback plan.

### Suitability

- **Phase 0: NOT NOW.** Migration is gated.
- **Phase 1 live: RECOMMENDED.** Cleanest long-term shape.

## Option C — reuse `public.outbound_delivery_ledger_claude_mcp`

### Pros

- Reuses the existing canonical outbound audit table.

### Cons

- Required columns `execution_context_id NOT NULL`, `thread_id NOT NULL`
  — a scheduler-driven reminder fire has no natural EC. Synthesising
  one (insert a fake `execution_contexts` row from the scheduler)
  pollutes the EC table with rows that don't represent chain
  triggers. Loosening the FK / NOT NULL is itself a schema migration.
- The ledger is conceptually MO outbound responses — not scheduled
  reminder fires. Mixing semantics blocks future analytics.
- Replay-guard probe already keyed on `(tenant_id, idempotency_key)`
  — could collide with chain-driven response audit if reminder keys
  share the namespace.

### Suitability

- **Phase 0: NO.** Same migration-needed constraint as Option B,
  plus a semantic-mixing risk.
- **Phase 1: NO**, for the same reasons. Unless the project later
  decides to merge outbound semantics under one ledger (a much bigger
  decision than this mission).

## Selected option for Phase 0

**Option A — metadata-only delivery state, dry-run only.** Reasons:

1. No schema migration required.
2. No workflow mutation required.
3. The dry-run can produce the intended MO payload + intended
   metadata patch without writing anything.
4. Operator can review the dry-run output before authorizing Phase 1.

## Phase 1 recommendation

**Option B** — schema migration adding `public.task_reminder_deliveries`
+ a dedicated `WF-RD-01_Reminder_Delivery_Scheduler` workflow with a
schedule trigger. Mission name:
`REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION`.

Pre-requisites for Phase 1 (must be authorized before execution):

- Schema migration policy clearance for adding the new table.
- Tenant onboarding / `delivery_target` policy (where does
  `telegram_chat_id` come from for real tenants? what's the missing-
  target fallback?).
- Production rollout plan: scheduler interval (e.g. every 60s),
  per-tick concurrency caps, error budgets.
- Recurring-reminder decision (yes/no for v1).

If those pre-requisites are not yet decided, queue a smaller
`REMINDER_DELIVERY_LAYER_SCHEMA_ONLY` micro-mission first to land the
table + indexes, then a separate scheduler-build mission.
