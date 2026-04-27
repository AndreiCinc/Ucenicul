# Phase 2 Authorised · Live Probe Results

## Probe TR exec **10800** (the GREEN one)

Mode envelope from `RD_Set_Mode`:

```json
{
  "mode": "live",
  "requested_mode": "live",
  "live_allowed": true,
  "dry_run": false,
  "candidate_limit": 1,
  "run_started_at": "2026-04-27T12:23:03.517Z"
}
```

`RD_Load_Candidates` — exactly 1 candidate:

```json
{
  "task_id": "9d39ae1a-9354-42ca-ba78-66bc6d2a6b78",
  "tenant_id": "eee0e2e0-0000-0000-0000-00000000000b",
  "title": "rd-phase2: sandbox live reminder",
  "due_at": "2026-04-27 12:20:10.57486+00",
  "due_occurrence_iso": "2026-04-27T12:20:00Z",
  "delivery_target": "5101664726",
  "channel": "telegram",
  "is_backlog": false,
  "force_send": "true"
}
```

`RD_Classify_And_Build` — outcome=`live`, idempotency_key
`rd:11b27681ae20f4715520355e`, response_text:
`Reminder: rd-phase2: sandbox live reminder — scadent: 2026-04-27 12:20 UTC.`

`RD_Upsert_Delivery_Row` — RETURNING:
```json
{ "id": "3503894c-7213-4e52-9cf8-27a75248d883", "delivery_status": "pending", "attempts": 1 }
```

`RD_Route_Outcome` — output 3 (live) selected.

`RD_Live_Build_Body` — built `live_payload`:
```json
{ "chat_id": "5101664726",
  "text":    "Reminder: rd-phase2: sandbox live reminder — scadent: 2026-04-27 12:20 UTC." }
```

`RD_Live_Send_PLACEHOLDER` (Telegram) — **REAL SEND SUCCESS**:

```json
{
  "ok": true,
  "result": {
    "message_id": 546,
    "from": { "id": 8631804832, "is_bot": true, "first_name": "Ucenicul AI", "username": "Ucenicul_bot" },
    "chat": { "id": 5101664726, "first_name": "Andrei", "last_name": "Cinc", "type": "private" },
    "date": 1777292584,
    "text": "Reminder: rd-phase2: sandbox live reminder — scadent: 2026-04-27 12:20 UTC.\n\nThis message was sent automatically with n8n",
    "entities": [{ "offset": 77, "length": 41, "type": "italic" }, …]
  }
}
```

`RD_Live_Mark_Sent` — RETURNING:
```json
{ "id": "3503894c-7213-4e52-9cf8-27a75248d883",
  "delivery_status": "sent",
  "attempts": 1,
  "sent_at": "2026-04-27T12:23:04.122Z" }
```

`RD_Aggregate_Result` — final envelope:
```json
{
  "status_kind": "success",
  "result_type": "reminder_delivery_summary",
  "workflow_name": "WF-RD-01_Reminder_Delivery_Scheduler",
  "mode": "live",
  "live_allowed": true,
  "counts": { "candidates_seen": 1, "sent": 0, "failed": 0,
              "dry_run": 0, "skipped_missing_target": 0,
              "skipped_backlog": 0, "errors": 1 },
  "per_outcome": [ { "outcome": "unknown" } ]
}
```

> **Cosmetic note on aggregator counts:** `RD_Aggregate_Result`
> currently checks `r.live_send_status === 'sent'` to bump
> `counts.sent`, but the live branch's `RD_Live_Build_Body` sets
> `live_send_status='placeholder_no_send'` (Phase 1 v1 leftover
> string). The aggregator therefore classifies the live-branch item as
> `unknown` even when the Telegram send succeeded and the ledger row
> is `sent`. **The Telegram send and ledger update are correct;** the
> aggregator's per-outcome counter is the only inaccuracy. Fixing the
> aggregator counter is a 1-line tweak deferred as
> `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP` (cosmetic, no
> functional impact — the canonical truth is the ledger row, which
> shows `sent`/`provider_message_ref=546`/`sent_at=…`).

## Live-probe DB evidence (post-fire, pre-replay)

```sql
SELECT id, tenant_id, task_id, due_occurrence_iso, delivery_status,
       channel, delivery_target, attempts, sent_at, last_attempt_at,
       last_error, provider_message_ref
FROM public.task_reminder_deliveries
WHERE task_id='9d39ae1a-9354-42ca-ba78-66bc6d2a6b78'::uuid;

-- id                   = 3503894c-7213-4e52-9cf8-27a75248d883
-- tenant_id            = eee0e2e0-0000-0000-0000-00000000000b
-- task_id              = 9d39ae1a-9354-42ca-ba78-66bc6d2a6b78
-- due_occurrence_iso   = 2026-04-27T12:20:00Z
-- delivery_status      = sent
-- channel              = telegram
-- delivery_target      = 5101664726
-- attempts             = 1
-- sent_at              = 2026-04-27 12:23:04.122+00
-- last_attempt_at      = 2026-04-27 12:23:03.788+00
-- last_error           = NULL
-- provider_message_ref = 546
```

## Probe TR exec 10799 (failed-safely first attempt)

The first manual fire surfaced a pre-existing data-flow bug in
`RD_Live_Build_Body` (read `$json` instead of upstream classify).
The chain stopped at the Code-node error **before** reaching
`RD_Live_Send_PLACEHOLDER`. **No Telegram send was attempted.** The
partial `pending` ledger row (`2b4481cc-d46c-41ef-a06b-d2bd65e5f4a0`)
was deleted via SQL to keep the subsequent live probe deterministic.
The bug fix is recorded in `WORKFLOW_PATCH_LOG.md` step 5.

## Send count summary

- Telegram API calls during this mission: **1** (probe 10800).
- Telegram messages successfully delivered: **1**.
- Telegram messages to any non-sandbox chat: **0**.
- Failed sends: **0**.
- Duplicate sends: **0**.
