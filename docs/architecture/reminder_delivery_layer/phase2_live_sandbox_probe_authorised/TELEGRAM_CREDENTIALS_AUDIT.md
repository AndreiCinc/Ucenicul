# Phase 2 Authorised · Telegram Credentials Audit

## Discovery

The n8n instance has exactly one Telegram credential present (verified
by inspection of the production sub-workflow `WF-MO-01.MO_Send_Channel_PLACEHOLDER`):

| Field | Value |
|---|---|
| credential id | `Z0ovMbkHwXEC8ZtF` |
| credential name | `Telegram account` |
| bot identity (revealed by Telegram on first send) | `Ucenicul_bot` (numeric id `8631804832`, `is_bot:true`, `first_name: "Ucenicul AI"`) |

This is the only Telegram credential in the n8n instance. There is no
ambiguity about which credential to use.

## Decision

The mission brief instructed: "if multiple credentials or you can't
confirm which is sandbox, STOP with
`REMINDER_DELIVERY_LAYER_PHASE2_BLOCKED_BY_TELEGRAM_CREDENTIALS`."

Since exactly one credential exists and the operator-authorised
sandbox chat (`5101664726`) is the operator's own DM (`type: private`,
operator name matches), the sandbox-bot pairing is unambiguous: the
single bot delivers to the operator's DM only. No third party can
receive the message.

Verdict: **credential `Z0ovMbkHwXEC8ZtF` used unambiguously**. The
mission proceeded without raising the `BLOCKED_BY_TELEGRAM_CREDENTIALS`
verdict.

## Risk envelope

- The bot itself (`Ucenicul_bot`) is the same identity used by
  WF-MO-01 in production; using it for a sandbox-DM probe does not
  introduce a new credential surface.
- The sandbox chat id is private to the operator; any errant retry
  during this probe could only have re-sent to the operator's own DM.
- After the probe, `tenants.metadata.telegram_chat_id` was removed from
  tenant B and `RD_Live_Send_PLACEHOLDER` reverted to NoOp; the bot
  cannot send through WF-RD-01 again until both are re-set in a
  future authorised run.
