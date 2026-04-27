# Phase 2 Authorised · Closeout

Mission: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_AUTHORISED`.
Date: 2026-04-27 (autonomous run).

## Verdict

**`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN = TRUE`**

The Reminder Delivery Layer is **proven end-to-end live** against an
operator-authorised sandbox chat. One Telegram message delivered, one
ledger row marked `sent` with `provider_message_ref` populated, zero
duplicate sends on replay, all upstream workflows byte-identical, and
the workflow restored to its Phase 1 baseline shape (NoOp, active=false).

## Headline numbers

| Bucket | Value |
|---|---|
| Telegram messages sent during this mission | **1** |
| Telegram messages to non-sandbox chats | 0 |
| Telegram message_id (provider ref) | **546** |
| Sandbox chat id used | `5101664726` (operator's DM) |
| Tenant used | tenant B (`eee0e2e0-…000b`) |
| Fixture task_id | `9d39ae1a-9354-42ca-ba78-66bc6d2a6b78` |
| Ledger rows produced (Phase 2) | 1 (`3503894c-…`, `delivery_status=sent`) |
| Replay duplicate sends | 0 |
| Replay new ledger rows | 0 |
| Workflow patches applied | 1 mutation envelope (Telegram + RD_Set_Mode override + Live_Build_Body fix + Live_Mark_Sent fix) → restored to byte-identical pre-state |
| Path 5 invocations | 0 |
| Unauthorised MCP writes | 0 |
| Memory V2 reopen | NO |

## Workflow versionId lineage

```
PRE        894ad514-7ce7-4b35-90d4-6c5190f01408   (Phase 1 baseline; NoOp)
PATCH      4687b3fb-46fa-4349-9596-3257f03d5136   (Telegram node attached)
…          (intermediate fix versionIds during bug iteration)
RESTORE    e8215217-80d0-4388-a276-07f437601a84   (NoOp restored; content byte-identical to PRE)
```

`active=false` and `availableInMCP=true` preserved throughout.

## Acceptance check (per mission brief)

- [x] WF-RD-01 patched temporarily.
- [x] `RD_Live_Send_PLACEHOLDER` replaced with `n8n-nodes-base.telegram`.
- [x] Sandbox chat id `5101664726` used.
- [x] Single fixture task in tenant B.
- [x] Manual fire with `mode='live'`, `live_allowed=true`, `candidate_limit=1`.
- [x] Exactly one Telegram send (verified).
- [x] Exactly one ledger row `sent` (verified).
- [x] `provider_message_ref='546'`.
- [x] Replay produces 0 new rows + 0 duplicate sends (verified).
- [x] NoOp restored.
- [x] WF-RD-01 stayed `active=false`.

## Files written this mission

Mission-local under `docs/architecture/reminder_delivery_layer/phase2_live_sandbox_probe_authorised/`:

- `MISSION_BRIEF.md`
- `READ_STATUS.md`
- `SANDBOX_TARGET_CONFIRMATION.md`
- `TELEGRAM_CREDENTIALS_AUDIT.md`
- `WORKFLOW_PATCH_LOG.md`
- `FIXTURE_LOG.md`
- `LIVE_PROBE_RESULTS.md`
- `REPLAY_PROBE_RESULTS.md`
- `SQL_INVARIANTS.md`
- `ROLLBACK_AND_RESTORE.md`
- `REGRESSION_RESULTS.md`
- `P0_STOP_CONDITIONS.md`
- `CLOSEOUT.md` (this file)
- `artifacts/WF-RD-01_phase2_authorised_pre.json`
- `artifacts/WF-RD-01_phase2_authorised_post.json`
- `artifacts/WF-RD-01_phase2_authorised_post_restore.json`

Plus a compact addendum to `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`
documenting the `_LIVE_SANDBOX_PROBE_GREEN` outcome.

## Cosmetic deferred follow-up

`RD_Aggregate_Result` counts `sent`/`failed` by reading
`r.live_send_status === 'sent'` but the live branch's
`RD_Live_Build_Body` v1.1 still sets `live_send_status='placeholder_no_send'`.
The Telegram send and ledger update are correct (proven by SQL); only
the result-envelope counter is inaccurate. Tracked as
`RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP` (cosmetic; canonical
truth is the ledger).

## Next recommended frontier

`REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE`:

1. Define the production tenant onboarding flow for
   `tenants.metadata.telegram_chat_id` (where does it come from for
   real users; opt-in policy; per-thread alternative).
2. Decide the activation policy for WF-RD-01 (the schedule trigger):
   - Cadence (60 s? 5 min?).
   - Concurrency cap.
   - First-tick backlog throttle (skip > 24h once on first run).
   - Alerting on consecutive failures.
3. Replace `RD_Live_Send_PLACEHOLDER` with the Telegram node
   permanently OR keep it reversible per a runbook.
4. Apply the cosmetic `RD_Aggregate_Result` fix.
5. Decide whether to migrate to a unified outbound ledger (would
   require relaxing `outbound_delivery_ledger_claude_mcp.execution_context_id`
   NOT NULL — separate decision).
6. Consider adding `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP`
   into the same Phase 3 patch.
