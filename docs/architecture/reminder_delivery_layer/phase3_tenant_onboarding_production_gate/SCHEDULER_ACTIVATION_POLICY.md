# Phase 3 · Scheduler Activation Policy

## Default state

`WF-RD-01.active=false`. The schedule trigger does not fire. The
workflow can be manually executed via MCP for dry-run probes
(`availableInMCP=true`), but no scheduled tick happens.

## When activation is permitted

Activation is **permitted only inside an explicit Phase 4 controlled
pilot mission**, gated on:

1. Telegram node attached in `RD_Live_Send_PLACEHOLDER` (Phase 4 entry
   patch).
2. Exactly one onboarded tenant with `telegram_chat_id` (operator-
   approved).
3. Backlog throttle policy in effect (see
   `BACKLOG_AND_CANDIDATE_LIMIT_POLICY.md`).
4. Observability + alerting wired (see
   `OBSERVABILITY_AND_ALERTING_POLICY.md`).
5. Dry-run probe at the new state confirmed last 24h:
   - count of would-send candidates documented;
   - all classified `dry_run`/`skipped_*` not surprising;
   - no candidate from a non-pilot tenant.

## Who activates

Operator only. The activation command is a deliberate CLI invocation:

```bash
node n8n-patch.mjs activate nc7rTC3hjO9QqbXs
```

n8n records the activation in its own audit log. The CLI's
`.audit.jsonl` records the API call.

## Pre-activation checklist (Phase 4 will copy)

- [ ] Operator is in front of the n8n UI for the next 30 minutes (so
      they can deactivate immediately if anything misbehaves).
- [ ] Sandbox/pilot tenant has been confirmed (one tenant id).
- [ ] `tenants.metadata.telegram_chat_id` is set on **only** that
      tenant (verified via SQL count = 1).
- [ ] Telegram node is attached in WF-RD-01 with the correct
      credential id.
- [ ] WF-RD-01 dry-run via MCP returned the expected outcome
      summary.
- [ ] `public.reminders` count is 1, max(created_at) = 2026-04-13
      (sanity).
- [ ] `task_reminder_deliveries` rows look reasonable for the pilot
      tenant.
- [ ] Phase 4 closeout doc folder is open and ready to record.

## Cadence

- Schedule trigger configured for **every 5 minutes** (interval mode).
- For Phase 4 v1 the cadence is suitable; high-volume tenants would
  drop to every 1 minute later.
- The trigger fires only while `active=true`; deactivation halts ticks
  immediately (no in-flight tick is killed, but no new ones start).

## Concurrency

- Single n8n instance ⇒ schedule trigger fires sequentially per
  workflow instance.
- `executionOrder: 'v1'` (default) preserves item ordering inside one
  execution.
- For multi-instance n8n, `task_reminder_deliveries` UNIQUE constraint
  protects against double-send across nodes (UPSERT-DO-UPDATE plus
  `delivery_status` NOT IN exclusion). Out of scope for Phase 4 v1.

## How to deactivate (rapid bail-out)

```bash
node n8n-patch.mjs deactivate nc7rTC3hjO9QqbXs
```

Effect: the next scheduled tick will not fire. Currently-running tick
finishes its current item; subsequent items are not loaded (`active`
flag is checked at the trigger level).

## Confirming "no batch accidentally"

Before activation, the Phase 4 mission must run a dry-run probe and
confirm:

- `candidates_seen ≤ candidate_limit` (default 50; pilot will use ≤ 10).
- `per_outcome` lists only the pilot tenant's task ids.
- 0 historical backlog candidates would be sent (all should be
  `skipped_backlog`).

If those checks fail, Phase 4 STOPS without activation.

## Phase 3 invariant

Phase 3 leaves `active=false`. Verified post-mission.
