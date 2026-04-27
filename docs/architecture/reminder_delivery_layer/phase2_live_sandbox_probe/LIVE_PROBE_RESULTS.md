# Phase 2 · Live Probe Results

## Status

**Live probe NOT executed.** Mission halted at the sandbox-target gate.

## Reasons

1. No operator-authorised sandbox `telegram_chat_id` provided in this run.
2. Mission rules forbid seeding a fake target.
3. Mission rules forbid sending to a non-sandbox target.
4. The `RD_Live_Send_PLACEHOLDER` node remains `n8n-nodes-base.noOp`,
   so a Telegram API call is structurally impossible until the patch
   plan in `WORKFLOW_PATCH_PLAN.md` is applied.

## Telegram send result

**Not attempted.** 0 Telegram API calls were made. 0 messages were
sent to any chat.

## `provider_message_ref` populated?

**Not applicable.** No live send happened, so no Telegram message id
was returned.

## Ledger row before / after

| Bucket | Before | After | Δ |
|---|---|---|---|
| `public.task_reminder_deliveries` rows total | 24 | 24 | 0 |
| `…delivery_status='sent'` | 0 | 0 | 0 |
| `…delivery_status='failed'` | 0 | 0 | 0 |
| `…task_id IN (Phase 2 fixture)` | 0 | 0 | 0 (no fixture inserted) |

## Replay duplicate proof

**Not applicable.** Without a first send, there is no replay surface.
The Phase 1 dry-run probe already proved that the candidate query +
UNIQUE constraint enforce idempotency for the `skipped_missing_target`
path; the `sent` path has the same enforcement structurally (LEFT JOIN
on `task_reminder_deliveries` excludes rows whose `delivery_status='sent'`).

## Sandbox chat received text?

**Not applicable.** No sandbox chat was authorised; no chat received
anything.

## Next-run preconditions (for an authorised re-attempt)

1. Operator provides the sandbox `telegram_chat_id` in writing in the
   next mission's prompt.
2. Telegram bot credentials available in n8n (id + name; sandbox-only).
3. Operator agrees to the `WORKFLOW_PATCH_PLAN.md` patch shape.
4. Operator agrees to the fixture in `FIXTURE_PLAN.md`.
5. Operator agrees that WF-RD-01 stays `active=false` throughout.

When all five hold, run the next mission as
`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_AUTHORISED`.
