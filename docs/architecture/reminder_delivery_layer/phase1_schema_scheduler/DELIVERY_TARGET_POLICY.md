# Phase 1 · Delivery Target Policy

## Source of truth

`tenants.metadata.telegram_chat_id` (text). Resolved via the
candidate query's JOIN to `public.tenants`.

This matches the existing `WF-MO-01.MO_Load_Channel_Delivery_Context`
contract, so the same policy governs both chain-driven (MO) and
scheduler-driven (WF-RD-01) sends.

## Behaviour

| `tenants.metadata.telegram_chat_id` | Outcome | Ledger row written? | Send attempted? |
|---|---|---|---|
| NULL or empty string | `skipped_missing_target` | yes (`delivery_status='skipped_missing_target'`, `last_error='MISSING_DELIVERY_TARGET'`) | **NO** |
| Non-empty + mode=`dry_run_*` | `dry_run` (or `dry_run_no_write`) | yes | **NO** (placeholder NoOp; see WORKFLOW_DESIGN.md) |
| Non-empty + mode=`live` + `live_allowed=true` + within 24 h of due_at | `live` | yes (initially `pending`, then `sent` via RD_Live_Mark_Sent) | **YES**, but Phase 1 v1's `RD_Live_Send_PLACEHOLDER` is a NoOp ⇒ no real Telegram API call. To enable real sending, replace the NoOp with `n8n-nodes-base.telegram` AND onboard a real chat_id. |

## Phase 1 v1 status of e2e tenants

All 3 e2e tenants (`eee0e2e0-…0001`, `…000a`, `…000b`) have
`metadata.telegram_chat_id = NULL`. Live testing of the dry-run probe
classifies all 24 candidate rows as `skipped_missing_target`,
producing zero external calls.

## Policy decisions for Phase 2

- **Where does `telegram_chat_id` come from for real tenants?**
  - Option a: tenant onboarding flow stores the chat id when the user
    DMs the bot (recommended; mirrors how Telegram chat ids are
    obtained in production today).
  - Option b: per-thread chat id from `messages.metadata` (allows
    multi-channel tenants).
  - Both options are out of scope for Phase 1 v1.
- **Fallback when target missing**: Phase 1 v1 marks the row
  `skipped_missing_target` once (the `NOT IN` clause in the candidate
  query then excludes it from later ticks until operator clears the
  ledger row OR sets the chat id). This is **skip-once**, not
  skip-every-tick — explicit in the design.
- **Sandbox target authorisation**: NOT GRANTED in this run. No
  controlled live probe was attempted. Verdict:
  `READY_EXCEPT_LIVE_SANDBOX_PROBE`.

## "No fake target" guarantee

- Tenant metadata was NOT modified during this mission. Verified pre
  and post: `(metadata->>'telegram_chat_id')` is NULL on all 3 e2e
  tenants.
- The placeholder `RD_Live_Send_PLACEHOLDER` is `n8n-nodes-base.noOp`
  — no Telegram credentials attached, no API call is structurally
  possible.
