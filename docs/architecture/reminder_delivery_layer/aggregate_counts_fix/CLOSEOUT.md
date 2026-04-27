# RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP · Closeout

Date: 2026-04-27 (autonomous run, post Phase 2 GREEN).

## Verdict

**`RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_READY = TRUE`**

Cosmetic fix only. WF-RD-01 stays `active=false`. No DB writes other
than one verify-only fixture (soft-cancelled post-test). No external
sends. No upstream-workflow mutations.

## Root cause

`RD_Aggregate_Result` v1.0 iterated over its direct upstream items —
which are the RETURNING rows from `RD_Upsert_Delivery_Row` (or
`RD_Live_Mark_Sent` on the live branch). Those rows carry only
`{id, delivery_status, attempts, ...}` — no `classified_outcome`. So
every item resolved to `outcome='unknown'` and bumped `counts.errors`.

For the live path it also checked `r.live_send_status === 'sent'`, but
`RD_Live_Build_Body` v1.1 still set `live_send_status='placeholder_no_send'`
(Phase 1 v1 leftover string), so live sends were never counted.

## Fix

Rewrote `RD_Aggregate_Result.parameters.jsCode` to v1.1:

- Iterates over `$('RD_Classify_And_Build').all()` so each item carries
  `classified_outcome`.
- Tallies dry_run / dry_run_no_write / skipped_missing_target /
  skipped_backlog directly from `classified_outcome`.
- Reconciles live items against `$('RD_Live_Mark_Sent').all().length`:
  `sent = min(liveSeen, liveMarkRows)`, `failed = liveSeen - sent`.
- `errors` only increments on truly unknown outcomes (defensive).

## Patch lineage

| Step | versionId |
|---|---|
| Pre  | `e8215217-80d0-4388-a276-07f437601a84` (Phase 2 restore baseline) |
| Post | **`9744e3a6-6824-42fd-867c-91622b4722b4`** |

Apply channel: V2-028 canonical local CLI (`replace`). 0 node delta.
0 connection delta. Workflow `active=false` preserved.

## Live verification

Inserted one verify-fixture in tenant default (no `telegram_chat_id`,
no fake target seeded) and ran the workflow in default mode
(`dry_run_audit`). TR exec **10804** result envelope:

```json
{
  "candidates_seen": 1,
  "sent": 0,
  "failed": 0,
  "dry_run": 0,
  "dry_run_no_write": 0,
  "skipped_missing_target": 1,    // ← was "errors": 1 before the fix
  "skipped_backlog": 0,
  "errors": 0
}
```

`per_outcome[0]={task_id: c9a66b1a-…, outcome: 'missing_target'}`.
The aggregator counter now matches the ledger row's `delivery_status`.

## Invariants (post-fix)

| Invariant | Result |
|---|---|
| `public.reminders` count / max(created_at) | 1 / 2026-04-13 20:17:13.620582+00 — unchanged ✅ |
| `public.outbound_delivery_ledger_claude_mcp` rows | 0 — unchanged ✅ |
| WF-RD-01 active | false ✅ |
| WF-RD-01 nodes / connections | 11 / 14 ✅ |
| `RD_Live_Send_PLACEHOLDER.type` | `n8n-nodes-base.noOp` ✅ |
| Other 10 canonical workflows | byte-identical ✅ |
| Path 5 invocations | 0 ✅ |
| Memory V2 reopen | NO ✅ |

## Side-effect tally

- 1 task row inserted (`c9a66b1a-c4de-45d0-acb4-3b9522e8c616`) for
  the live verify; soft-cancelled post-test.
- 1 ledger row inserted (`7a392d01-…`, `delivery_status='skipped_missing_target'`)
  — kept as audit.
- 0 Telegram sends (placeholder is NoOp; tenant default has no chat_id).
- 0 mutations to `public.reminders`, `public.outbound_delivery_ledger_claude_mcp`,
  or any non-WF-RD-01 workflow.

## Files

- `artifacts/WF-RD-01_pre.json` — pre-fix snapshot.
- `artifacts/WF-RD-01_post.json` — patched workflow JSON.
- `CLOSEOUT.md` — this file.

## Status of Reminder Delivery Layer

`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN = TRUE` is
preserved. The cosmetic deferred follow-up is now CLOSED. WF-RD-01
final versionId: `9744e3a6-6824-42fd-867c-91622b4722b4`.
