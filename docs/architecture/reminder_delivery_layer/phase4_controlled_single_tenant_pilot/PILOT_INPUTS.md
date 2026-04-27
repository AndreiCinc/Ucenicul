# Phase 4 · Pilot Inputs

Operator-supplied for this run:

```
PILOT_TENANT_ID                = eee0e2e0-0000-0000-0000-00000000000b
PILOT_TELEGRAM_CHAT_ID         = 5101664726
PILOT_BOOTSTRAP_BACKLOG        = true
PILOT_CANDIDATE_LIMIT_PER_TICK = 10
PILOT_ACTIVATION_WINDOW_MINUTES= 30
PILOT_RESTORE_VARIANT          = A   (deactivate + restore NoOp + remove chat_id)
```

## Pilot tenant

`tenant_id = eee0e2e0-0000-0000-0000-00000000000b` (e2e tenant B). Pre-mission
state: 0 candidates, 0 chat_id. Same tenant used for the Phase 2
sandbox probe.

## Pilot chat id

`5101664726` — operator's private DM (`type: private`, owner identity
matches operator). Same chat id used for the Phase 2 sandbox probe.
Sending here cannot reach any third party.

## Pilot fixture

A single fixture task was inserted for this pilot (tenant B had 0
existing due candidates):

| Field | Value |
|---|---|
| id | `d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde` |
| tenant_id | `eee0e2e0-0000-0000-0000-00000000000b` |
| title | `rd-phase4: controlled pilot reminder` |
| due_at | `2026-04-27 13:38:13.242577+00` |
| status (initially) | `open` |
| source | `rd-phase4-controlled-pilot` |
| metadata.metadata.origin | `reminder_intent` |
| metadata.reminder_delivery.phase | `phase4_controlled_pilot` |
| metadata.reminder_delivery.force_send | `true` |

Soft-cancelled at the end of the pilot (status=`cancelled`,
completed_at=`2026-04-27 13:51:15.442103+00`).

## Pilot Telegram credential

`Z0ovMbkHwXEC8ZtF` ("Telegram account", bot `Ucenicul_bot`) —
single canonical Telegram credential in n8n (also used by
WF-MO-01.MO_Send_Channel_PLACEHOLDER). Phase 3 policy authorised this
exact credential for Phase 4. After restore the credential is
detached from WF-RD-01 (placeholder back to NoOp, no `credentials`
field).

## Backlog bootstrap

Tenant B had 0 tasks past 24h due → 0 rows added by the bootstrap
INSERT. The idempotent statement was run; result was a no-op for
this tenant.
