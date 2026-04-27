# Phase 1 · Live Sandbox Probe

## Status

**NOT EXECUTED** — verdict downgraded to
`REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE`.

## Reason

No sandbox `tenants.metadata.telegram_chat_id` was authorised by the
operator for this run, and the mission rules explicitly forbid
seeding a fake target:

> 4. seed-uiești fake Telegram target — **interzis**.
> 8. Delivery target policy … Dacă nu există sandbox target …
>    rulează doar dry-run și missing-target tests; verdictul poate fi
>    `READY_EXCEPT_LIVE_SANDBOX_PROBE`.

The `RD_Live_Send_PLACEHOLDER` node is `n8n-nodes-base.noOp` (no
Telegram credentials attached), so a controlled live send was
structurally impossible even if the operator had approved one.

## Phase 2 prerequisite for the controlled probe

To unblock the controlled probe in a follow-up mission:

1. Operator authorises a sandbox Telegram chat id (an isolated chat
   the operator owns; ideally a dedicated test bot in a private
   group).
2. Set the chat id on a single non-production e2e tenant
   (recommend tenant B since it has 0 candidates today, so no
   collateral fan-out):
   ```sql
   UPDATE public.tenants
      SET metadata = metadata || jsonb_build_object('telegram_chat_id','<sandbox-chat-id>')
    WHERE id='eee0e2e0-0000-0000-0000-00000000000b'::uuid;
   ```
3. Insert ONE fixture task in tenant B with `due_at=NOW()` and
   `metadata.metadata.origin='reminder_intent'`.
4. Replace `RD_Live_Send_PLACEHOLDER` (NoOp) with
   `n8n-nodes-base.telegram` (with the sandbox bot credentials).
5. Manually fire WF-RD-01 with `mode='live'` + `live_allowed=true`.
6. Verify exactly 1 row in `public.task_reminder_deliveries` with
   `delivery_status='sent'`, `provider_message_ref` populated.
7. Verify the sandbox chat received exactly 1 message.
8. Revert: UPDATE tenants metadata to remove the chat id; DELETE
   the fixture task; replace the Telegram node back with NoOp.

## Why Phase 1 v1 stops short of this probe

A live external send — even controlled — depends on:

- a sandbox bot token (credential),
- an isolated chat id,
- explicit operator scheduling around when the probe fires (so an
  errant retry doesn't blast the sandbox at 3 AM),
- review of the Romanian reminder text by a human (Phase 1 v1 ships
  a templated string; localisation and tone need product review).

Phase 1 v1 stops at "scheduler-and-ledger ready, dry-run proven"
because each of those four prerequisites is a separate operator
decision. Phase 2 picks up at the controlled probe.
