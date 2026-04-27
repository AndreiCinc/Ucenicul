# Phase 4 · P0 Stop Conditions

| # | Condition | Triggered? | Notes |
|---|---|---|---|
| 1 | Any message sent to a chat id other than `5101664726` | **NO** | only one Telegram message went out, to `5101664726` |
| 2 | Any ledger row for a non-pilot tenant in pilot window | **NO** | `created_at >= 13:36:58Z` returned exactly one row, tenant B |
| 3 | Duplicate row for same `(tenant_id, task_id, due_occurrence_iso)` | **NO** | UNIQUE held; tick 3 produced 0 rows |
| 4 | `delivery_status='sent'` with `provider_message_ref IS NULL` | **NO** | false-sent count = 0 |
| 5 | `public.reminders` mutation | **NO** | byte-identical |
| 6 | `outbound_delivery_ledger_claude_mcp` mutation | **NO** | count=0 unchanged |
| 7 | More than 10 candidates per tick | **NO** | candidate_limit=10 enforced; max observed = 1 candidate per tick |
| 8 | Scheduler active beyond 30 min without decision | **NO** | active for ~14m 14s; deactivate at 13:51:12Z |
| 9 | Any non-WF-RD workflow mutated | **NO** | TR/EC/OR/PL/DI/ME/RA/SU/RC/MO byte-identical pre/post |
| 10 | Path 5 needed | **NO** | all operations through V2-028 local CLI |
| 11 | Telegram credential ambiguous | **NO** | single canonical credential `Z0ovMbkHwXEC8ZtF` used |
| 12 | Wrong backlog sent live | **NO** | tenant B had 0 backlog candidates at activation |
| 13 | NoOp restore failed | **NO** | post-restore type confirmed `n8n-nodes-base.noOp` |
| 14 | `active=false` could not be restored | **NO** | post-restore active=false confirmed |

## On the first-tick safe-failure (TR exec 10806)

This was an **in-chain runtime error** in `RD_Live_Build_Body`, not a
P0. n8n stopped the chain BEFORE the Telegram node executed:

- 0 Telegram API calls.
- 0 false-sent rows.
- The fixture's ledger row stayed `delivery_status='pending'` — an
  operator-visible signal classified as P3 in
  `OBSERVABILITY_AND_ALERTING_POLICY.md` (stuck-pending watchdog).

The mid-window safety patch (re-applying the Phase 2 `RD_Live_Build_Body`
fix) restored end-to-end behaviour for the very next tick. The
deferred follow-up `RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP`
captures this for a clean Phase 4.5 / Phase 5 patch.

## Conclusion

**0 of 14 P0 conditions triggered.** Pilot GREEN.
