# REMINDER_DELIVERY_LAYER · Phase 0 · Design Freeze

## Selected option for Phase 0

**Option A — metadata-only delivery state on `tasks.metadata`** (dry-run only).

## Frozen contract

### Deliverability rule

A `public.tasks` row is a delivery candidate iff:

```
status = 'open'
AND due_at IS NOT NULL
AND due_at <= NOW()
AND COALESCE(metadata->'reminder_delivery'->>'status', 'pending') <> 'sent'
```

Exclusions implied by the rule:

- `status='done'` → excluded (`completed_at` set or not, doesn't matter — the
  status is the gate).
- `status='cancelled'` → excluded.
- `due_at IS NULL` (with `due_type='flexible'` or `'date'`-only) → excluded
  from the immediate-delivery scheduler. (A future date-only scheduler
  would need a separate `due_date` lane.)
- `metadata.reminder_delivery.status='sent'` → excluded (already
  delivered).
- Any tenant other than the requested one → excluded by `tenant_id =
  $1::uuid`.

The rule **does not require** the reminder-intent origin marker —
**any open task with a temporal due is deliverable** in the current
scheduler. This is an explicit design decision (see "Design decision:
deliver any open task with `due_at`" below).

### Delivery candidate ordering

`ORDER BY due_at ASC` — earliest-due first, paged by `LIMIT $2`.

### Idempotency key

```
delivery_key = `rd:${tenant_id}:${task_id}:${due_occurrence_iso_minute}`
idempotency_key = `rd:` + sha256(delivery_key)[0:24]
```

`due_occurrence_iso_minute` is the canonical due moment truncated to
the minute (`YYYY-MM-DDTHH:MM:00Z`). For non-recurring reminders this
gives one stable key per delivery; for recurring (future) reminders it
gives one key per occurrence.

### Reminder text format (Romanian, no raw JSON)

```
Reminder: <task.title> — scadent: <due_at YYYY-MM-DD HH:MM> UTC.
```

Phase 1 must localise the timestamp using `tenants.timezone` (default
`Europe/Bucharest`). Phase 0 emits UTC.

### Delivery target policy

`delivery_target` resolved from
`tenants.metadata.telegram_chat_id` (matches the existing
`WF-MO-01.MO_Load_Channel_Delivery_Context` contract). If null:

- Outcome classified as `MISSING_DELIVERY_TARGET` (mirrors
  `e2e_oracle.mjs` convention).
- `_intended_metadata_patch.reminder_delivery.status =
  'skipped_missing_target'` — recorded so Phase 1 doesn't re-attempt
  on every tick.
- **No fake target seeded.** No external send.

### Channels supported (Phase 0)

`telegram` only (matches the only channel today wired in `WF-MO-01`).
`whatsapp` reserved per WF-MO-01 input contract; no Phase 0 implementation.

### Phase 0 mutation policy

- **No mutation of `tasks`.** Even the metadata patch is "intended-only"
  and not applied.
- **No write to `public.reminders`.**
- **No insert into `public.outbound_delivery_ledger_claude_mcp`.**
- **No call to `WF-MO-01`.**
- **No external API call.**

### Workflow envelope for Phase 0

- 0 workflow mutations.
- 0 schema mutations.
- 0 new workflows created.
- 0 duplicate workflows.

The dry-run runs locally as a node script (`artifacts/dry_run.mjs`)
and via SELECT-only SQL through the `postgres` MCP.

## Design decision: deliver any open task with `due_at`

### Decision

The Phase 0 candidate query selects **any open task with `due_at <= NOW()`**,
not just tasks marked with the `reminder_intent` origin. Rationale:

1. ADR-REMINDER-AS-TASK-LAYER says reminder-like requests are
   represented as tasks with due fields. Conversely, any task with a
   due field is a candidate for time-based delivery — that's the
   ADR's central premise.
2. The reminder-intent origin marker is informational (set by PL when
   the user said "remind me / amintește-mi / nu mă lăsa să uit"). The
   user's expectation that they'll be reminded should not depend on
   PL's classifier — if they typed "task: send the report tomorrow at
   10", they still want to be told at 10.
3. Phase 1 may add a per-task opt-in flag (e.g.
   `metadata.reminder_delivery.opt_in=false`) for tasks the user
   explicitly doesn't want pinged on, but that's **opt-out**, not
   opt-in.

### Tradeoff

22 candidate rows surfaced for tenant default in the dry-run — many
were created weeks ago by prior missions and would all be "delivered"
by a Phase 1 scheduler on first tick. **Phase 1 must include a
backlog-throttle** (e.g. don't deliver tasks more than N hours past
due, and bulk-mark old backlog as `skipped_backlog` once on first
run). Documented as a Phase 1 prerequisite.

## Phase 1 contract sketch (recommendation)

- Schema: add `public.task_reminder_deliveries` (Option B).
- Workflow: new `WF-RD-01_Reminder_Delivery_Scheduler` with
  `n8n-nodes-base.scheduleTrigger` (every 60 s).
- Per tick: load candidate set per tenant (paged), upsert
  `task_reminder_deliveries` row with `delivery_status='pending'` and
  the deterministic `(tenant_id, task_id, due_occurrence_iso)`
  unique key, then for each candidate either call MO via a slim
  `MO_Scheduler_Adapter` (or directly a `Telegram` node guarded by
  delivery_target policy) and update the row to `'sent'/'failed'`.
- Backlog throttle: skip tasks more than 24h past due unless
  `metadata.reminder_delivery.force_send=true`.

Mission name: `REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION`.
