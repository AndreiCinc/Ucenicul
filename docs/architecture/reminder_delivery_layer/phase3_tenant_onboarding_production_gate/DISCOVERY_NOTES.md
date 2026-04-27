# Phase 3 · Discovery Notes

## A1 — Tenant metadata source

- `WF-MO-01.MO_Load_Channel_Delivery_Context` reads `delivery_target`
  from `public.tenants.metadata->>'telegram_chat_id'` (single SELECT).
- `WF-RD-01.RD_Load_Candidates` joins `public.tenants` and reads the
  same `metadata->>'telegram_chat_id'` field.
- **The two workflows share one source of truth**: a tenant gets
  reminder delivery iff `tenants.metadata.telegram_chat_id` is non-empty.
- Real production data: 0 tenants currently carry `telegram_chat_id`
  (verified via SQL: `SELECT count(*) FROM tenants WHERE metadata ? 'telegram_chat_id' = 0`).
- Sandbox/e2e tenants: 3 e2e lanes, all NULL (Phase 2 sandbox value
  was set on tenant B for the probe and removed at restore).
- Inbound onboarding signal: Telegram chat trigger nodes in the
  upstream chain receive `chat.id` on every message. That `chat.id` is
  the same identifier the bot uses to send back. Onboarding policy
  could leverage this (operator-approved capture flow).

## A2 — Telegram credential

- Single Telegram credential in n8n: id `Z0ovMbkHwXEC8ZtF`,
  name `"Telegram account"`, bot `Ucenicul_bot` (numeric id `8631804832`).
- Used by `WF-MO-01.MO_Send_Channel_PLACEHOLDER` in production.
- Used (temporarily) by `WF-RD-01.RD_Live_Send_PLACEHOLDER` during the
  Phase 2 probe; reverted to NoOp at restore (no credential attached
  in the current workflow).
- **No separate sandbox bot exists today**. Phase 2 used the
  production bot to deliver to the operator's own DM; this is safe
  because the `chat_id` itself was the isolating factor.

## A3 — Scheduler activation

- `WF-RD-01.active=false` since import (Phase 1).
- `availableInMCP=true` so operator can fire manual probes via MCP
  without ever flipping `active`.
- The schedule trigger (`n8n-nodes-base.scheduleTrigger`) is configured
  for every-5-minutes, but does not fire while `active=false`.
- Activation is a single n8n REST call (`POST /workflows/{id}/activate`).
- Deactivation: `POST /workflows/{id}/deactivate`.
- The V2-028 local CLI exposes `activate` / `deactivate` /
  `reactivate` commands — same operations.

## A4 — Backlog policy state

- `RD_Classify_And_Build` already classifies `is_backlog=true` when
  `NOW() - due_at > INTERVAL '24 hours'` and routes to
  `skipped_backlog` unless `metadata.reminder_delivery.force_send=true`.
- The Phase 2 probe's fixture had `force_send=true` to bypass any
  clock drift; that worked.
- For real production: at least 24 backlog candidates exist on
  tenant default today (legacy `tasks` rows from earlier missions). On
  first activation they would all be classified `skipped_backlog`
  (because no `force_send`), which is the safe default — operator can
  decide if any of those merit a force-send.

## A5 — Candidate / concurrency state

- `RD_Set_Mode` defaults `candidate_limit=50` per tick.
- `RD_Load_Candidates` query has `LIMIT $1::int`.
- n8n single instance + `executionOrder: 'v1'` ⇒ deterministic per
  execution; no inherent overlap protection across ticks. That's fine
  while `active=false`. For production, configure n8n to skip
  overlapping executions OR keep candidate_limit small enough that one
  tick completes before the next.

## A6 — Observability state

- Today: `task_reminder_deliveries` is the canonical audit table.
  `delivery_status` field carries terminal states (`sent`, `failed`,
  `skipped_*`, `dry_run`).
- No alerting wired today.
- For production: derive alerts from rows added per-tick window with
  `delivery_status IN ('failed','failed_terminal')`.

## False-sent risk

- Current `RD_Live_Mark_Sent.queryReplacement` hardcodes
  `delivery_status='sent'` in the UPDATE params. The provider_message_ref
  is read from `$json.message_id` or `$json.result.message_id`, defaulting
  to `null`.
- If the live branch is reached while the placeholder is still NoOp
  (which is the current state), `$json` at Mark_Sent is the upstream
  passthrough, with no `message_id`. The current code still sets
  `delivery_status='sent'`, `provider_message_ref=NULL`. **That is the
  false-sent risk.**
- Phase 3 must close this risk before any pilot.

## SQL preflight (read-only)

```
public.reminders count           = 1
public.reminders max(created_at) = 2026-04-13 20:17:13.620582+00
outbound_delivery_ledger count   = 0
task_reminder_deliveries total   = 26
task_reminder_deliveries sent    = 1 (Phase 2 probe audit row)
tenant B telegram_chat_id        = NULL
tenants_with_chat_id (any)       = 0
```
