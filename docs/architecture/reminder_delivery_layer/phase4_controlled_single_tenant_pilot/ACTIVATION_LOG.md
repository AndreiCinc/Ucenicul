# Phase 4 · Activation Log

## Window

| Event | Timestamp (UTC) |
|---|---|
| Workflow patched (Telegram + RD_Set_Mode override) | 2026-04-27 13:36:33Z |
| Tenant B `telegram_chat_id` set to `5101664726` | 2026-04-27 13:36:35Z |
| Pre-activation candidate query: 0 rows | 2026-04-27 13:36:35Z |
| **`activate` issued** | **2026-04-27 13:36:58Z** |
| Schedule trigger first scheduled tick | 13:40:29Z |
| Mid-window safety patch on `RD_Live_Build_Body` | 13:43:14Z |
| Schedule trigger second scheduled tick (Telegram send GREEN) | 13:45:23Z |
| Schedule trigger third scheduled tick (replay GREEN, 0 dupes) | 13:50:23Z |
| **`deactivate` issued** | **2026-04-27 13:51:12Z** |
| Restore (replace) issued | 2026-04-27 13:51:13Z |
| End-state verified | 2026-04-27 13:51:14Z |

## Active window length

`13:51:12Z − 13:36:58Z = 14 minutes 14 seconds`

Cap was 30 minutes per `PILOT_ACTIVATION_WINDOW_MINUTES`. **Used:
~14m 14s — well within cap.**

## Schedule trigger ticks observed

| # | Tick time | TR exec | Outcome |
|---|---|---|---|
| 1 | 13:40:29Z | n8n exec **10806** | **error** at `RD_Live_Build_Body` (v1.0 bug). Chain stopped before Telegram. Ledger row `298dfe75-…` left in `delivery_status='pending'`. **No Telegram send. No false-sent.** Safe-failure. |
| 2 | 13:45:23Z | (next scheduled exec, fired post-mid-fix) | **success.** Telegram returned `ok:true, result.message_id=548`. Ledger row updated to `delivery_status='sent'`, `provider_message_ref='548'`, `attempts=2`, `sent_at=2026-04-27 13:45:23.751+00`, `last_error=null`. |
| 3 | 13:50:23Z | (next scheduled exec) | **success — 0 candidates.** Candidate query's NOT-IN clause excluded the now-`sent` row. Chain stopped after `RD_Load_Candidates`. **0 duplicate sends, 0 new ledger rows.** |

## Operator-visible Telegram receipt

The operator's DM (chat 5101664726) received exactly one message
during the pilot window, with the canonical reminder body:

```
Reminder: rd-phase4: controlled pilot reminder — scadent: 2026-04-27 13:38 UTC.

This message was sent automatically with n8n
```

(The "This message was sent automatically with n8n" footer is appended
by the `n8n-nodes-base.telegram` node default behaviour.)

## Activation safety

- `active=true` only between 13:36:58Z and 13:51:12Z.
- Outside this window the workflow was `active=false` → schedule
  trigger does not fire.
- Restore step set `active=false` and replaced the workflow JSON to
  the byte-identical pre-pilot state.
