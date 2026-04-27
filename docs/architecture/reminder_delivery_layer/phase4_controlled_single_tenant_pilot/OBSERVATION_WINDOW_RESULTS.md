# Phase 4 · Observation Window Results

## Tick 2 @ 13:45:23Z — successful live send

After the mid-window safety patch on `RD_Live_Build_Body`, the next
scheduled tick fired and completed end-to-end:

- `RD_Set_Mode` → mode=`live`, live_allowed=true, candidate_limit=10.
- `RD_Load_Candidates` → 1 candidate (the pilot fixture, still `due_at <= NOW()`).
- `RD_Classify_And_Build` → `outcome='live'`.
- `RD_Upsert_Delivery_Row` → ON CONFLICT DO UPDATE on the existing
  `298dfe75-…` row: `delivery_status='pending'` re-set, `attempts=2`,
  `last_attempt_at=2026-04-27T13:45:23Z`.
- `RD_Route_Outcome` → live branch.
- `RD_Live_Build_Body` (v1.1) → success. Built `live_payload`:
  ```json
  { "chat_id": "5101664726",
    "text": "Reminder: rd-phase4: controlled pilot reminder — scadent: 2026-04-27 13:38 UTC." }
  ```
- `RD_Live_Send_PLACEHOLDER` (Telegram, typeVersion 1.2) → success:
  ```json
  { "ok": true,
    "result": {
      "message_id": 548,
      "from": { "id": 8631804832, "is_bot": true, "first_name": "Ucenicul AI", "username": "Ucenicul_bot" },
      "chat": { "id": 5101664726, "first_name": "Andrei", "last_name": "Cinc", "type": "private" },
      "date": <epoch>,
      "text": "Reminder: rd-phase4: controlled pilot reminder — scadent: 2026-04-27 13:38 UTC.\n\nThis message was sent automatically with n8n"
    } }
  ```
- `RD_Live_Mark_Sent` (Phase 3 false-sent guard IIFE) → success:
  guard saw `tg.result.message_id=548`, set `delivery_status='sent'`,
  `sent_at=2026-04-27T13:45:23.751+00`, `provider_message_ref='548'`,
  `last_error=null`.
- `RD_Aggregate_Result` (v1.1 counts fix) → result envelope:
  ```json
  { "candidates_seen": 1, "sent": 1, "failed": 0, ... }
  ```

## Tick 3 @ 13:50:23Z — replay produced 0 duplicates

- `RD_Set_Mode` → mode=`live`.
- `RD_Load_Candidates` → **0 candidates** (the candidate query's
  `NOT IN ('sent','failed_terminal','skipped_missing_target','skipped_backlog')`
  excluded the now-`sent` fixture row).
- Chain stopped after the candidate query.
- **0 duplicate Telegram sends, 0 new ledger rows.**

## Cross-tenant + invariant evidence (post tick 3)

```sql
SELECT id, task_id, delivery_status, delivery_target, attempts, sent_at, provider_message_ref
FROM public.task_reminder_deliveries
WHERE task_id='d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde'::uuid;
-- → id=298dfe75-…, delivery_status='sent', delivery_target='5101664726',
--    attempts=2, sent_at=2026-04-27 13:45:23.751+00, provider_message_ref='548'

SELECT count(*)::int, count(DISTINCT (tenant_id, task_id, due_occurrence_iso))::int,
       count(*) FILTER (WHERE delivery_status='sent') AS sent_total
FROM public.task_reminder_deliveries;
-- → 27, 27, 2

SELECT tenant_id::text, count(*) FROM public.task_reminder_deliveries
 WHERE created_at >= '2026-04-27T13:36:58Z'::timestamptz
 GROUP BY tenant_id;
-- → only eee0e2e0-…000b (count=1)

SELECT count(*)::int FROM public.task_reminder_deliveries
 WHERE delivery_status='sent' AND provider_message_ref IS NULL;
-- → 0
```

## Operator visual verification

Operator reported the Telegram bot delivered exactly one message to
their DM (chat 5101664726) with the expected text. No spurious
messages received during the pilot window.

## Side-effect tally during the pilot window

| Bucket | Δ |
|---|---|
| `public.task_reminder_deliveries` rows | +1 (only `298dfe75-…`) |
| `public.task_reminder_deliveries` `sent` rows | +1 (the same row) |
| `public.tasks` rows mutated | +1 (the pilot fixture, soft-cancelled at restore) |
| `public.reminders` count / max(created_at) | 0 / unchanged |
| `public.outbound_delivery_ledger_claude_mcp` rows | 0 |
| Telegram messages sent | 1 (to chat 5101664726) |
| Telegram messages to non-sandbox chat | 0 |
| Cross-tenant ledger rows | 0 |
| False-sent rows | 0 |
| Workflow versionId moves | 4 (PRE → PATCH → MID-FIX → RESTORE) |
| Other workflows mutated | 0 |
