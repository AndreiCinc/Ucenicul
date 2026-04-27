# Phase 4 · Controlled Single-Tenant Pilot · Mission Brief

Mission: `REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT`.
Date: 2026-04-27 (autonomous run).
Predecessor: `REMINDER_DELIVERY_LAYER_PHASE3_PRODUCTION_GATE_READY = TRUE`.

## Operator inputs

```
PILOT_TENANT_ID                = eee0e2e0-0000-0000-0000-00000000000b   (tenant B)
PILOT_TELEGRAM_CHAT_ID         = 5101664726                              (operator's DM)
PILOT_BOOTSTRAP_BACKLOG        = true
PILOT_CANDIDATE_LIMIT_PER_TICK = 10
PILOT_ACTIVATION_WINDOW_MINUTES= 30
PILOT_RESTORE_VARIANT          = A (deactivate + restore NoOp + remove chat_id)
```

## Verdict

**`REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT_GREEN = TRUE`**

The Reminder Delivery Layer is **proven end-to-end with the schedule
trigger active**. One Telegram message delivered to the operator's DM
during the second scheduled tick (the first tick surfaced a known
v1.0 bug in `RD_Live_Build_Body` that had been reverted at Phase 2
restore — the chain stopped safely BEFORE Telegram, no false-sent;
the bug was patched in-place mid-window and the next tick succeeded).
Replay tick produced 0 duplicates. Variant A restore complete.

## Headline numbers

| Bucket | Value |
|---|---|
| Activation timestamp | 2026-04-27T13:36:58Z |
| Deactivation timestamp | 2026-04-27T13:51:12Z |
| Pilot active window | ~14m 15s (cap: 30m) |
| Telegram messages sent | **1** (provider_message_ref=`548`) |
| Telegram messages to non-sandbox chat | 0 |
| Ledger rows produced in pilot window | 1 (`298dfe75-…` for the fixture) |
| Replay duplicate sends | 0 |
| Replay new ledger rows | 0 |
| Cross-tenant rows in pilot window | 0 |
| False-sent rows | 0 |
| Workflow patches | 1 envelope (Telegram + RD_Set_Mode override) + 1 mid-window safety re-patch on RD_Live_Build_Body + 1 restore |
| Path 5 invocations | 0 |
| Memory V2 reopen | NO |
| Other workflows mutated | NONE |
| `public.reminders` byte-identical | YES |
| `public.outbound_delivery_ledger_claude_mcp` byte-identical | YES |

## Workflow versionId lineage

```
PRE     5bd37075-c99d-4790-a2a6-0625d656aacb   (Phase 3 baseline, NoOp + false-sent guard)
PATCH   24b6cbce-63cc-4624-91d0-0471bbe1be1a   (Telegram attached + RD_Set_Mode override mode=live)
MID-FIX 60aaef06-88b9-4b2e-a49b-cde8d69b19f6   (RD_Live_Build_Body v1.0 → v1.1 mid-window safety fix)
RESTORE ff38f3d3-67a5-46d7-b5cf-7dd4b6ec0706   (NoOp restored; content byte-identical to pre-state)
```

`active=false` preserved before/after; was `active=true` only during
the pilot window (13:36:58Z → 13:51:12Z).

## Out of scope (forbidden, not violated)

- ❌ Activating any other workflow.
- ❌ Multi-tenant rollout.
- ❌ Any chat id other than `5101664726`.
- ❌ Modifying `public.reminders` or `outbound_delivery_ledger_claude_mcp`.
- ❌ Modifying TR/EC/OR/PL/DI/ME/RA/SU/RC/MO.
- ❌ Memory V2 reopen.
- ❌ Path 5.
