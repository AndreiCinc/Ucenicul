# Phase 1 · Workflow Design

Workflow: `WF-RD-01_Reminder_Delivery_Scheduler`
n8n id: `nc7rTC3hjO9QqbXs`
Active: **false** (imported INACTIVE)
`availableInMCP`: true (operator-driven dry-run probes only)

## Node inventory (11 nodes)

| Node | Type | Role |
|---|---|---|
| RD_Manual_Trigger | `n8n-nodes-base.manualTrigger` | Operator-driven dry-run firing (MCP / UI). |
| RD_Schedule_Trigger | `n8n-nodes-base.scheduleTrigger` (every 5 min) | Production cadence. Inactive workflow ⇒ does not fire today. |
| RD_Set_Mode | Code | Resolves `mode ∈ {dry_run_no_write, dry_run_audit, live}`, `live_allowed`, `candidate_limit`. Default mode: `dry_run_audit`; default `live_allowed=false`. |
| RD_Load_Candidates | Postgres v2.4 | Tenant-joined SELECT against `public.tasks` LEFT JOIN `public.task_reminder_deliveries`; excludes already-sent / already-skipped / failed_terminal. Parameter: candidate_limit. |
| RD_Classify_And_Build | Code (runOnceForEachItem) | Per-row classification → `outcome ∈ {missing_target, skipped_backlog, dry_run, dry_run_no_write, live}`. Builds `__db` payload + Romanian reminder text + idempotency_key. |
| RD_Upsert_Delivery_Row | Postgres v2.4 | INSERT … ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO UPDATE. Sets final `delivery_status` (or `'pending'` for live path). Increments `attempts` on conflict. |
| RD_Route_Outcome | switch v3 | Branches: missing_target / skipped_backlog / dry_run / live / fallback. |
| RD_Live_Build_Body | Code (runOnceForEachItem) | Phase 1 v1 placeholder; builds `live_payload = { chat_id, text }` but does NOT send. |
| RD_Live_Send_PLACEHOLDER | `n8n-nodes-base.noOp` | **Phase 1 v1: NoOp.** A future phase replaces this with `n8n-nodes-base.telegram` ONLY when a sandbox/onboarded chat_id is authorised. |
| RD_Live_Mark_Sent | Postgres v2.4 | UPDATE delivery_status='sent', sent_at=now(), provider_message_ref=…. |
| RD_Aggregate_Result | Code | Aggregates per-outcome counts into a single result envelope. |

## Connections (14 edges)

```
RD_Manual_Trigger      → RD_Set_Mode
RD_Schedule_Trigger    → RD_Set_Mode
RD_Set_Mode            → RD_Load_Candidates
RD_Load_Candidates     → RD_Classify_And_Build
RD_Classify_And_Build  → RD_Upsert_Delivery_Row
RD_Upsert_Delivery_Row → RD_Route_Outcome
RD_Route_Outcome[missing_target]   → RD_Aggregate_Result
RD_Route_Outcome[skipped_backlog]  → RD_Aggregate_Result
RD_Route_Outcome[dry_run]          → RD_Aggregate_Result
RD_Route_Outcome[live]             → RD_Live_Build_Body
RD_Route_Outcome[extra/fallback]   → RD_Aggregate_Result
RD_Live_Build_Body     → RD_Live_Send_PLACEHOLDER
RD_Live_Send_PLACEHOLDER → RD_Live_Mark_Sent
RD_Live_Mark_Sent      → RD_Aggregate_Result
```

## Candidate query

Cross-tenant scope (the SQL filters by per-row `tenant_id` from
`public.tenants`; isolation enforced by the JOIN, not by the caller):

```sql
SELECT
  t.id           AS task_id,
  t.tenant_id    AS tenant_id,
  t.title        AS title,
  t.description  AS description,
  t.due_at::text AS due_at,
  to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'),
          'YYYY-MM-DD"T"HH24:MI:00"Z"') AS due_occurrence_iso,
  (te.metadata->>'telegram_chat_id') AS delivery_target,
  'telegram'::text AS channel,
  te.timezone   AS tenant_timezone,
  (NOW() - t.due_at > INTERVAL '24 hours') AS is_backlog,
  COALESCE(t.metadata->'reminder_delivery'->>'force_send', 'false') AS force_send
FROM public.tasks t
JOIN public.tenants te ON te.id = t.tenant_id AND te.is_active = true
LEFT JOIN public.task_reminder_deliveries d
  ON d.tenant_id = t.tenant_id
 AND d.task_id   = t.id
 AND d.due_occurrence_iso = to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'),
                                    'YYYY-MM-DD"T"HH24:MI:00"Z"')
WHERE t.status   = 'open'
  AND t.due_at IS NOT NULL
  AND t.due_at <= NOW()
  AND COALESCE(t.metadata->'reminder_delivery'->>'status', 'pending') <> 'sent'
  AND COALESCE(d.delivery_status, 'pending') NOT IN ('sent','failed_terminal','skipped_missing_target','skipped_backlog')
ORDER BY t.due_at ASC
LIMIT $1::int;
```

The `NOT IN (...)` clause provides the "self-throttling" property
exploited by the idempotency proof: once a candidate is classified
into a terminal status, it never re-appears in subsequent ticks.

## Upsert SQL

```sql
INSERT INTO public.task_reminder_deliveries
  (tenant_id, task_id, due_occurrence_iso, delivery_key, delivery_status,
   channel, delivery_target, attempts, last_attempt_at)
VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text,
        $6::text, $7::text, $8::int, $9::timestamptz)
ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO UPDATE
   SET delivery_status  = EXCLUDED.delivery_status,
       delivery_target  = EXCLUDED.delivery_target,
       attempts         = public.task_reminder_deliveries.attempts + 1,
       last_attempt_at  = EXCLUDED.last_attempt_at,
       updated_at       = now()
RETURNING id, delivery_status, attempts;
```

## Live mark SQL

```sql
UPDATE public.task_reminder_deliveries
   SET delivery_status     = $1::text,
       sent_at             = $2::timestamptz,
       provider_message_ref= $3::text,
       last_error          = $4::text,
       updated_at          = now()
 WHERE tenant_id = $5::uuid
   AND task_id   = $6::uuid
   AND due_occurrence_iso = $7::text
RETURNING id, delivery_status, attempts, sent_at;
```

## Why direct send rather than calling MO

Per Phase 0 design freeze and Phase 1 plan: MO requires
`execution_context_id NOT NULL`. Synthesising an EC for a
scheduler-driven fire is contract drift. Phase 1 v1 keeps MO
byte-identical and audits via the new `task_reminder_deliveries`
ledger. (The placeholder NoOp also makes accidental sends impossible.)

## Why active=false on import

n8n schedule triggers begin firing at the configured cadence the
moment the workflow is activated. Phase 1 v1 is **opt-in** — the
operator must explicitly activate the workflow after onboarding a
real `tenants.metadata.telegram_chat_id` AND replacing the NoOp
placeholder with a real Telegram node. Until then, only manual MCP-
driven probes execute the chain.

## Default safety

| Hazard | Mitigation |
|---|---|
| Real Telegram send to unknown user | `RD_Live_Send_PLACEHOLDER` is a NoOp (no Telegram node installed). |
| Big backlog blast on first activation | `is_backlog` field + `force_send=false` ⇒ all > 24 h past-due tasks are classified `skipped_backlog`. Only force_send=true overrides. |
| Cross-tenant leak | Candidate query joins `tenants` + groups by per-row `tenant_id`; UNIQUE constraint on `(tenant_id, task_id, due_occurrence_iso)` blocks any cross-tenant collision in the ledger. |
| Duplicate delivery | UNIQUE constraint + ON CONFLICT DO UPDATE; multiple ticks update the existing row, never insert new. |
| Schedule trigger firing on import | active=false until operator activates. |
