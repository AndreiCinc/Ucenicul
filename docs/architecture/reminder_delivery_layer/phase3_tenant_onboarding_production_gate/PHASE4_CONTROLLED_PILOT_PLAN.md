# Phase 4 · Controlled Single-Tenant Pilot · Plan

Mission name when authorised: `REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT`.

## Pre-conditions (must all hold before Phase 4 starts)

1. `REMINDER_DELIVERY_LAYER_PHASE3_PRODUCTION_GATE_READY = TRUE`
   (verdict from this mission).
2. Operator-authorised pilot tenant id supplied in Phase 4 prompt.
3. Operator-authorised `telegram_chat_id` for the pilot tenant.
4. Sandbox-or-production decision recorded explicitly (the operator's
   own DM is the safest first pilot; a "real" tenant chat is Phase 4 v2).
5. Activation window: operator is online and able to deactivate within
   30 seconds.

## Phase 4 mission inputs (operator-supplied)

| Input | Example | Required? |
|---|---|---|
| `PILOT_TENANT_ID` | `eee0e2e0-…000b` | yes |
| `PILOT_TELEGRAM_CHAT_ID` | `5101664726` | yes |
| `PILOT_BOOTSTRAP_BACKLOG` | `true` (recommended) | yes |
| `PILOT_CANDIDATE_LIMIT_PER_TICK` | `10` (default) | yes |
| `PILOT_ACTIVATION_WINDOW_MINUTES` | `30` | yes |
| `PILOT_FIXTURE_TASKS_TO_SEED` | `0` (use existing tasks) or N | optional |

## Workflow patch (Phase 4 entry)

Single-node patch via V2-028:

| Node | Change |
|---|---|
| `RD_Live_Send_PLACEHOLDER` | type: `n8n-nodes-base.noOp` → `n8n-nodes-base.telegram` (typeVersion 1.2). parameters: `{ operation: 'sendMessage', chatId: '={{ $json.live_payload.chat_id }}', text: '={{ $json.live_payload.text }}' }`. credentials: `{ telegramApi: { id: 'Z0ovMbkHwXEC8ZtF', name: 'Telegram account' } }`. |

`RD_Live_Mark_Sent.queryReplacement` already has the false-sent guard
(this mission). No further mutation required there.

`RD_Aggregate_Result` already has the v1.1 counts (closed in
`aggregate_counts_fix/`).

## Pilot setup steps

1. Snapshot pre-patch (`artifacts/WF-RD-01_phase4_pre.json`).
2. Patch `RD_Live_Send_PLACEHOLDER` → Telegram node.
3. Verify post-patch (`mcp__n8n__verify_workflow`):
   - active=false (still!)
   - 11 / 14
   - `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.telegram'`
4. Set chat_id on pilot tenant:
   ```sql
   UPDATE public.tenants SET metadata = COALESCE(metadata,'{}'::jsonb)
                              || jsonb_build_object('telegram_chat_id', '<PILOT_TELEGRAM_CHAT_ID>')
    WHERE id = '<PILOT_TENANT_ID>'::uuid;
   ```
5. (Optional but recommended) Bootstrap backlog skip rows (see
   `BACKLOG_AND_CANDIDATE_LIMIT_POLICY.md`).
6. Run dry-run probe via MCP:
   ```json
   { "mode": "dry_run_audit", "candidate_limit": 10 }
   ```
   Expected: per_outcome lists only pilot tenant, no `live` outcomes.
7. **Activate** WF-RD-01:
   ```bash
   node n8n-patch.mjs activate nc7rTC3hjO9QqbXs
   ```
8. Wait ≤ 5 minutes for the first scheduled tick. Inspect:
   - `task_reminder_deliveries` rows added in the last 5 min.
   - Telegram chat received the expected reminder text.
   - `provider_message_ref` populated.
   - 0 `failed` rows.

## Pilot success / failure criteria

| Criterion | Success | Failure (deactivate immediately) |
|---|---|---|
| Telegram delivery | ≥ 1 `sent` row in pilot tenant | any `false-sent` (`sent` with NULL `provider_message_ref`) |
| Cross-tenant | 0 ledger rows in non-pilot tenants in pilot window | any non-pilot ledger row |
| `public.reminders` | byte-identical pre/post | any change |
| `public.outbound_delivery_ledger_claude_mcp` | byte-identical | any change |
| Failed sends | 0 unrecoverable failures | repeated `failed` for the same task w/o operator action |
| Wrong-chat send | 0 | any |

## Pilot duration

Recommended: **24 hours** of active scheduling, then operator
inspection and decision (continue / deactivate / extend).

## Rollback / restore (always available)

```bash
# Stop scheduling
node n8n-patch.mjs deactivate nc7rTC3hjO9QqbXs

# Revert Telegram → NoOp
node n8n-patch.mjs replace nc7rTC3hjO9QqbXs artifacts/WF-RD-01_phase4_pre.json

# Remove chat id
psql -c "UPDATE public.tenants SET metadata = metadata - 'telegram_chat_id' WHERE id = '<PILOT_TENANT_ID>'::uuid;"
```

## After Phase 4 v1

If Phase 4 closes green:

- `REMINDER_DELIVERY_LAYER_PHASE4_PILOT_GREEN = TRUE`.
- Decide on Phase 5 (multi-tenant rollout) parameters.
- Address any deferred follow-ups:
  - per-task `opt_in/opt_out` flag.
  - alert wiring (Phase 5).
  - timezone localisation for the reminder text (currently UTC).
  - recurring reminders (separate ADR).

## Out of scope for Phase 4 v1

- Recurring reminders.
- Snooze.
- Whatsapp.
- Multi-tenant fan-out.
- Per-thread chat ids.
