# Phase 2 · Live Sandbox Probe · Mission Brief

Mission: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`.
Date: 2026-04-27 (autonomous run).
Pre-state: `REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE` +
`REMINDER_DELIVERY_PHASE1_DOC_NORMALIZATION_READY_FOR_PHASE2 = TRUE`.

## Gate condition (mandatory)

> **Ai nevoie de un sandbox Telegram chat id autorizat explicit de
> operator. Dacă NU există sandbox target autorizat, STOP după
> Mission 1 și creează doar un plan Phase 2, fără patch și fără send.**

This run does NOT have an operator-authorised sandbox `telegram_chat_id`.
**Therefore Mission 2 stops at the gate.** No workflow patch. No send.
No fake target. No DB mutation. Phase 2 remains a plan only.

Verdict (per mission brief §2 fallback):
**`REMINDER_DELIVERY_LAYER_PHASE2_BLOCKED_BY_MISSING_SANDBOX_TELEGRAM_TARGET`**

## Scope (when unblocked in a future run)

1. Snapshot `WF-RD-01_Reminder_Delivery_Scheduler` pre-patch.
2. Replace `RD_Live_Send_PLACEHOLDER` (NoOp) with
   `n8n-nodes-base.telegram` configured against the sandbox bot.
3. Set `tenants.metadata.telegram_chat_id` to the operator's sandbox
   chat id on a single non-production tenant (recommend tenant B —
   has 0 candidates today, no collateral fan-out).
4. Insert one fixture task in that tenant with `due_at=NOW() - 1
   minute`, `status='open'`,
   `metadata.reminder_delivery.phase='phase2_sandbox_probe'`,
   `metadata.reminder_delivery.force_send=true`.
5. Manually fire WF-RD-01 with input
   `{ "mode":"live", "live_allowed":true, "candidate_limit":1 }`.
6. Verify exactly one row in `public.task_reminder_deliveries` with
   `delivery_status='sent'`, `sent_at IS NOT NULL`, `attempts >= 1`,
   `provider_message_ref` populated when Telegram returns one.
7. Verify the sandbox chat received the reminder text:
   `Reminder: rd-phase2: sandbox live reminder — scadent: ... UTC.`
8. Re-fire identically and verify NO duplicate send + NO new ledger row.
9. Restore safe state (NoOp restored OR active=false confirmed,
   sandbox `telegram_chat_id` removed, fixture deleted/cancelled).

## Out of scope (forbidden — even when unblocked)

- Fake or non-sandbox `telegram_chat_id`.
- More than one fixture task per probe run.
- `candidate_limit > 1`.
- `mode='live'` without `live_allowed=true`.
- Activating WF-RD-01's schedule trigger globally (workflow stays
  `active=false` for Phase 2).
- Touching `public.reminders`.
- Touching `outbound_delivery_ledger_claude_mcp`.
- Modifying any non-WF-RD-01 workflow.
- Path 5.
- MCP workflow write (use V2-028 local CLI for any patch).
- Memory V2 reopen.

## Pre-state confirmed (preflight 2026-04-27)

| Bucket | Value |
|---|---|
| WF-RD-01 versionId | `894ad514-7ce7-4b35-90d4-6c5190f01408` |
| WF-RD-01 active | **false** |
| WF-RD-01 nodes / connections | 11 / 14 |
| `RD_Live_Send_PLACEHOLDER` type | `n8n-nodes-base.noOp` (NoOp — verified) |
| `task_reminder_deliveries` rows | 24 (all `skipped_missing_target`) |
| `public.reminders` count | 1 |
| `public.reminders` max(created_at) | 2026-04-13 20:17:13.620582+00 |
| `outbound_delivery_ledger_claude_mcp` rows | 0 |
| All 3 e2e tenants `telegram_chat_id` | **NULL** (no fake target seeded) |

All baselines hold; the gate condition is the only thing missing.

## Why the gate is enforced strictly

- A real Telegram send is structurally allowed only via a real
  Telegram node + real chat_id. Phase 1 keeps the placeholder as
  `n8n-nodes-base.noOp` precisely so that no accidental send is
  possible until the operator explicitly opens the gate.
- A "fake" chat id (e.g. a placeholder string) would either fail at
  the Telegram API (controlled error, but still an external API
  call to the real Telegram service from a non-isolated bot) or
  worse, deliver to whoever owns that chat id today.
- Per ADR-REMINDER-AS-TASK-LAYER and the mission brief: no fake
  target, no batch live send, no production rollout in Phase 2.
