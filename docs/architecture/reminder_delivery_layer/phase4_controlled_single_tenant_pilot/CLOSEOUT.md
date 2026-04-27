# Phase 4 · Closeout

Mission: `REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT`.
Date: 2026-04-27.

## Verdict

**`REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT_GREEN = TRUE`**

The Reminder Delivery Layer is **proven end-to-end with the schedule
trigger active** for a single controlled tenant. One Telegram message
delivered (provider_message_ref `548`). Replay produced 0 duplicates.
Variant A restore completed cleanly. All canonical invariants
preserved.

## Headline numbers

| Bucket | Value |
|---|---|
| Pilot tenant | `eee0e2e0-0000-0000-0000-00000000000b` (tenant B) |
| Sandbox chat id | `5101664726` (operator's DM) |
| Pilot fixture task id | `d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde` (soft-cancelled post-restore) |
| Telegram messages sent | 1 |
| provider_message_ref | `548` |
| Ledger rows in pilot window | 1 (`298dfe75-…`, status=`sent`) |
| Duplicate sends on replay | 0 |
| Cross-tenant rows in pilot window | 0 |
| False-sent rows | 0 |
| `public.reminders` byte-identical | YES |
| `public.outbound_delivery_ledger_claude_mcp` byte-identical | YES |
| Workflow patches | 1 entry envelope + 1 mid-fix + 1 restore |
| Restore status | Variant A complete (deactivate + replace + remove chat_id + soft-cancel fixture) |
| Path 5 | 0 |
| Other workflows mutated | 0 |
| Memory V2 reopen | NO |
| Pilot active window | ~14m 14s (cap: 30m) |
| Activation timestamp | 2026-04-27 13:36:58Z |
| Deactivation timestamp | 2026-04-27 13:51:12Z |

## Workflow versionId lineage (this mission)

```
PRE     5bd37075-c99d-4790-a2a6-0625d656aacb   (Phase 3 baseline; NoOp + false-sent guard)
PATCH   24b6cbce-63cc-4624-91d0-0471bbe1be1a   (Telegram attached + RD_Set_Mode → live + cap=10)
MID-FIX 60aaef06-88b9-4b2e-a49b-cde8d69b19f6   (RD_Live_Build_Body v1.0 → v1.1 mid-window safety)
RESTORE ff38f3d3-67a5-46d7-b5cf-7dd4b6ec0706   (NoOp restored; content byte-identical to PRE)
```

## Acceptance check (per mission brief)

- [x] Pilot activated controlled (single tenant, single chat, 14m 14s active).
- [x] ≥ 1 successful Telegram send to `5101664726`.
- [x] 0 wrong-chat sends.
- [x] 0 cross-tenant rows.
- [x] 0 duplicates.
- [x] 0 false-sent.
- [x] `public.reminders` unchanged.
- [x] `outbound_delivery_ledger_claude_mcp` unchanged.
- [x] WF-RD-01 deactivated post-window.
- [x] NoOp restored.
- [x] Tenant B chat id removed.
- [x] All 13 mission-local docs written.

## Files this mission produced

Mission-local under
`docs/architecture/reminder_delivery_layer/phase4_controlled_single_tenant_pilot/`:

- `MISSION_BRIEF.md`
- `READ_STATUS.md`
- `PILOT_INPUTS.md`
- `PREFLIGHT_AUDIT.md`
- `BACKLOG_BOOTSTRAP_LOG.md`
- `WORKFLOW_PATCH_LOG.md`
- `ACTIVATION_LOG.md`
- `FIRST_TICK_RESULTS.md`
- `OBSERVATION_WINDOW_RESULTS.md`
- `SQL_INVARIANTS.md`
- `ROLLBACK_AND_RESTORE.md`
- `P0_STOP_CONDITIONS.md`
- `CLOSEOUT.md` (this file)
- `artifacts/WF-RD-01_phase4_pre.json`
- `artifacts/WF-RD-01_phase4_mid_buggy.json`
- `artifacts/WF-RD-01_phase4_post.json`
- `artifacts/WF-RD-01_phase4_post_v2.json`

Plus reconciliation + memory baseline updates.

## Deferred follow-up (NEW)

`RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP` — `RD_Live_Build_Body`
in the canonical baseline workflow JSON still carries the v1.0 jsCode
that breaks when `$json` is overwritten by an upstream Postgres node's
RETURNING. The Phase 4 mid-fix proved v1.1 (`$('RD_Classify_And_Build').item.json`)
works end-to-end. Rolling v1.1 into the baseline avoids the safe-failure
on the first tick of any future Phase 4-style activation. Single-node
patch via V2-028; 0 node/connection delta; workflow stays inactive
during the patch.

## Next recommended frontier

Two parallel options for the operator:

1. **`REMINDER_DELIVERY_LAYER_PHASE4_5_BASELINE_HARDENING`** —
   close `RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP` (and
   optionally roll the Phase 4 `RD_Set_Mode` override into a more
   explicit production default, e.g. mode=`live` only when an env-flag
   is set). Tiny doc-only-then-patch micro-mission. Recommended before
   Phase 5.
2. **`REMINDER_DELIVERY_LAYER_PHASE5_MULTI_TENANT_PILOT`** — extend
   to multiple tenants once the baseline is hardened. Requires
   onboarding flow (Flow A in `TENANT_ONBOARDING_POLICY.md`) and
   multi-tenant alert wiring (`OBSERVABILITY_AND_ALERTING_POLICY.md`).
