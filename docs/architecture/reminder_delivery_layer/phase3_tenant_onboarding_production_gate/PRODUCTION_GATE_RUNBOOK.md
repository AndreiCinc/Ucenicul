# Phase 3 · Production Gate Runbook

This runbook is the **operator checklist** for moving from Phase 3
(production gate) to Phase 4 (controlled single-tenant pilot). It
does NOT activate anything by itself — every step is operator-driven.

## Pre-flight (do all of these before opening Phase 4)

1. **Confirm current truth**:
   ```bash
   node n8n-patch.mjs verify nc7rTC3hjO9QqbXs   # (use `get` if `verify` not exposed)
   ```
   Expected:
   - `active=false`
   - 11 nodes / 14 connections
   - versionId latest is `5bd37075-c99d-4790-a2a6-0625d656aacb` (or successor)
   - `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`
2. **Confirm DB invariants**:
   ```sql
   SELECT count(*) FROM reminders;                                   -- expect 1
   SELECT max(created_at) FROM reminders;                            -- expect 2026-04-13 20:17:13.620582+00
   SELECT count(*) FROM outbound_delivery_ledger_claude_mcp;         -- expect 0
   SELECT count(*) FROM tenants WHERE metadata ? 'telegram_chat_id'; -- expect 0
   ```
3. **Decide the pilot tenant**:
   - Pick exactly one tenant.
   - Confirm its current `due_at` workload by hand (count how many
     past-due, how many within 24h).
   - Decide whether to bootstrap historical backlog as
     `skipped_backlog` (recommended).
4. **Decide the chat_id**:
   - Operator's own DM is acceptable for the very first pilot.
   - Long-term: tenant onboarding via Flow A in
     `TENANT_ONBOARDING_POLICY.md`.

## Bootstrap (idempotent)

```sql
-- Mark all > 24h past-due open tasks for the pilot tenant as 'skipped_backlog'
INSERT INTO public.task_reminder_deliveries
  (tenant_id, task_id, due_occurrence_iso, delivery_key, delivery_status, channel, attempts)
SELECT t.tenant_id, t.id,
       to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:00"Z"'),
       'rd:' || t.tenant_id || ':' || t.id || ':' ||
         to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:00"Z"'),
       'skipped_backlog'::text, 'telegram'::text, 0
FROM public.tasks t
WHERE t.tenant_id = '<PILOT_TENANT_ID>'::uuid
  AND t.status = 'open'
  AND t.due_at IS NOT NULL
  AND t.due_at <= NOW() - INTERVAL '24 hours'
ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO NOTHING;
```

## Phase 4 entry patch (operator runs as part of Phase 4)

1. Snapshot WF-RD-01 pre-patch (`artifacts/WF-RD-01_phase4_pre.json`).
2. Patch `RD_Live_Send_PLACEHOLDER`: NoOp → `n8n-nodes-base.telegram`,
   credentials = `{ telegramApi: { id: 'Z0ovMbkHwXEC8ZtF', name: 'Telegram account' } }`.
3. Verify `active=false` after patch.
4. Set `tenants.metadata.telegram_chat_id` on the pilot tenant only.
5. Run a **dry-run probe** (`mode='dry_run_audit'`) via MCP. Confirm
   the result envelope shows expected outcomes for the pilot tenant
   only.
6. Activate the workflow:
   ```bash
   node n8n-patch.mjs activate nc7rTC3hjO9QqbXs
   ```
7. Watch the first scheduled tick (every 5 minutes). Confirm:
   - `delivery_status='sent'` rows match the pilot tenant only;
   - `provider_message_ref` populated;
   - 0 cross-tenant rows;
   - `public.reminders` byte-identical;
   - Telegram chat received the expected text (operator visual check).
8. If anything misbehaves: `node n8n-patch.mjs deactivate nc7rTC3hjO9QqbXs`.

## Rapid bail-out

```bash
# Stop new ticks
node n8n-patch.mjs deactivate nc7rTC3hjO9QqbXs

# Optional: revert to NoOp
node n8n-patch.mjs replace nc7rTC3hjO9QqbXs <pre-patch snapshot>

# Optional: remove pilot chat_id
psql -c "UPDATE public.tenants SET metadata = metadata - 'telegram_chat_id' WHERE id = '<PILOT_TENANT_ID>'::uuid;"
```

## Success criteria for Phase 4 v1 pilot

- ≥ 1 successful Telegram send in the pilot.
- 0 `delivery_status='failed'` rows for the pilot tenant.
- 0 cross-tenant rows.
- 0 mutations to `public.reminders` or `outbound_delivery_ledger_claude_mcp`.
- Operator confirms the messages match expected reminders (no
  hallucinated content, no wrong scheduling).

## Failure criteria

- Any wrong-chat send.
- Any duplicate send for the same `(tenant_id, task_id, due_occurrence_iso)`.
- Any `false-sent` row (delivery_status='sent' with NULL provider_message_ref).
  → operator should immediately deactivate, capture the row id, and
  open a follow-up mission.
- Any `public.reminders` mutation.
