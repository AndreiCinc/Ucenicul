# Phase 2 Authorised · Live Sandbox Probe · Mission Brief

Mission: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_AUTHORISED`.
Date: 2026-04-27 (autonomous run).
Predecessor verdicts:

- `REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE`
- `REMINDER_DELIVERY_PHASE1_DOC_NORMALIZATION_READY_FOR_PHASE2 = TRUE`
- (prior gate-blocked) `REMINDER_DELIVERY_LAYER_PHASE2_BLOCKED_BY_MISSING_SANDBOX_TELEGRAM_TARGET`

## Authorisation provided this run

`SANDBOX_TELEGRAM_CHAT_ID = 5101664726` (operator's personal Telegram DM
per the chat payload `{ id: 5101664726, first_name: "Andrei",
last_name: "Cinc", type: "private" }`). Operator selected this chat as
the sandbox target.

## Scope (executed)

1. ✅ Snapshot `WF-RD-01_Reminder_Delivery_Scheduler` pre-patch.
2. ✅ Replace `RD_Live_Send_PLACEHOLDER` (NoOp) with
   `n8n-nodes-base.telegram` using existing credential
   `Z0ovMbkHwXEC8ZtF` ("Telegram account").
3. ✅ Set `tenants.metadata.telegram_chat_id = '5101664726'` on tenant B
   only (`eee0e2e0-0000-0000-0000-00000000000b`).
4. ✅ Insert exactly one fixture task in tenant B
   (`fixture_task_id = 9d39ae1a-9354-42ca-ba78-66bc6d2a6b78`).
5. ✅ Manual fire WF-RD-01 with `mode='live'`, `live_allowed=true`,
   `candidate_limit=1` (TR exec **10800**) — Telegram message_id 546
   delivered to chat 5101664726.
6. ✅ Replay (TR exec **10801**) — 0 candidates, 0 new ledger rows,
   0 duplicate sends.
7. ✅ Restore: tenant B chat_id removed, fixture soft-cancelled, NoOp
   restored, RD_Set_Mode default-mode restored.
8. ✅ WF-RD-01 stays `active=false` throughout.

## Verdict

**`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN = TRUE`**

(Note: a small bug surfaced safely on the first attempt — the
`RD_Live_Build_Body` and `RD_Live_Mark_Sent` nodes were referencing
`$json` after `RD_Upsert_Delivery_Row` overwrote it. Fixed in-place by
sourcing from `$('RD_Classify_And_Build').item.json`. Chain stopped
cleanly before any Telegram call on the failed first attempt; the
resulting partial `pending` ledger row was deleted before the live
fire to keep the test deterministic. Total: 1 successful Telegram
send, 0 failed external sends, 0 ledger duplicates.)

## Out of scope (forbidden, not violated)

- ❌ Activating the schedule trigger (workflow `active=false` throughout).
- ❌ Batch send (`candidate_limit=1`; 1 candidate seen, 1 sent).
- ❌ Tenant default (only tenant B touched).
- ❌ Other chat ids (only `5101664726` ever used).
- ❌ Fake target (operator-authorised chat only).
- ❌ `public.reminders` mutation (count=1, max=2026-04-13 byte-identical).
- ❌ `public.outbound_delivery_ledger_claude_mcp` mutation (count=0
  byte-identical — Phase 1 v1 audits via `task_reminder_deliveries`).
- ❌ Mutation of TR/EC/OR/PL/DI/ME/RA/SU/RC/MO (all 10 byte-identical).
- ❌ Memory V2 reopen.
- ❌ Path 5.
