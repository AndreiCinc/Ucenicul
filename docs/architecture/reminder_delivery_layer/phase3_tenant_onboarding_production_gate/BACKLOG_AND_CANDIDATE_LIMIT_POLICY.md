# Phase 3 · Backlog and Candidate Limit Policy

## Backlog throttle (already in WF-RD-01)

Defined and live since Phase 1 v1:

- `RD_Load_Candidates` exposes the column `is_backlog = (NOW() - due_at > INTERVAL '24 hours')`.
- `RD_Classify_And_Build` reads `is_backlog` and `metadata.reminder_delivery.force_send`.
- Outcome priority: `missing_target` > `skipped_backlog` > mode-based.
- `skipped_backlog` is terminal (the candidate query's `NOT IN (...)`
  excludes it from later ticks).

### Production interpretation

- A task with `due_at > 24h ago` does NOT get a real reminder unless
  `metadata.reminder_delivery.force_send = true` is explicitly set on
  that task.
- This is **opt-out** semantics for backlog: Phase 4 pilot will catch
  any tenant whose due dates routinely lag > 24h.
- Operator can override per-task by setting `force_send=true` (e.g.
  for a critical reminder that was missed during downtime).

## First-tick policy (Phase 4 entry)

To prevent a "batch on first activation":

1. Run a **dry-run probe via MCP** before activation. Expected output:
   `per_outcome` lists only `skipped_missing_target` /
   `skipped_backlog` items for the pilot tenant.
2. **Pre-mark all backlog as `skipped_backlog` once**, using a SQL
   bootstrap, so the first scheduled tick has 0 backlog candidates:
   ```sql
   INSERT INTO public.task_reminder_deliveries
     (tenant_id, task_id, due_occurrence_iso, delivery_key, delivery_status, channel, attempts, last_attempt_at)
   SELECT
     t.tenant_id, t.id,
     to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:00"Z"'),
     'rd:' || t.tenant_id || ':' || t.id || ':' || to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:00"Z"'),
     'skipped_backlog'::text, 'telegram'::text, 0, NULL
   FROM public.tasks t
   WHERE t.tenant_id = '<PILOT_TENANT_ID>'::uuid
     AND t.status = 'open'
     AND t.due_at IS NOT NULL
     AND t.due_at <= NOW() - INTERVAL '24 hours'
     AND COALESCE(t.metadata->'reminder_delivery'->>'force_send','false') <> 'true'
   ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO NOTHING;
   ```
   This bootstrap is **idempotent** and guarantees the pilot tenant
   starts with 0 ready candidates older than 24h.
3. Verify post-bootstrap: `SELECT count(*) FROM tasks WHERE tenant_id=...
   AND ... AND id NOT IN (...) ` should match the operator's expectation
   for "tasks within the last 24h that should get a reminder".

## Candidate limit / per-tick caps (Phase 4 entry)

| Setting | Phase 4 v1 value | Notes |
|---|---|---|
| `candidate_limit` (input override) | **10** | pilot cap; default in `RD_Set_Mode` is 50 but Phase 4 mission will override to 10 for safety |
| Cadence | every 5 minutes | matches the schedule trigger |
| Per-tenant max | 10 (== candidate_limit) | for the pilot, only one tenant has a chat_id, so the global cap is effectively the per-tenant cap |
| Concurrent ticks | 1 (single n8n instance) | `executionOrder: 'v1'` preserves order |

## When to raise the cap

Raise `candidate_limit` from 10 → 50 → 100 only after:

- 7 days of clean Phase 4 pilot data (`failed_terminal=0`).
- No false-positive `skipped_missing_target` for the pilot tenant.
- No operator-reported missed reminders.

Each raise is a separate operator-approved CLI patch on
`RD_Set_Mode` (or via per-tick input on a manual probe). Schedule
trigger payload defaults can be set later.

## Concurrency safety vs. multi-instance

Phase 4 assumes single n8n instance. If the operator scales to multi-
instance:

- `task_reminder_deliveries` UNIQUE on
  `(tenant_id, task_id, due_occurrence_iso)` plus
  `RD_Load_Candidates` `NOT IN (...)` clause provide the
  cross-instance dedupe.
- Race window: two instances could both load the same candidate, both
  upsert (one creates, the other DO UPDATEs), both attempt Telegram.
  The first send succeeds; the second finds the row already
  `delivery_status='sent'` (after the first instance's Mark_Sent) but
  also tries to send. **This is a real risk** and would cause
  duplicate sends in a multi-instance setup. Mitigation requires a
  per-tick advisory lock (`pg_try_advisory_lock`) or a SELECT FOR
  UPDATE pattern. Out of scope for Phase 3.

## Phase 3 invariant

Phase 3 does NOT bootstrap any tenant. The current state stays —
all 26 ledger rows preserved unchanged.
